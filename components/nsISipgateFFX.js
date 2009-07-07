/*****************************************************************************

    sipgate FFX - Firefox Extension for Mozilla Firefox Webbrowser
    Copyright (C) 2009 sipgate GmbH, Germany

    The original code is hosted at 
    http://www.github.com/sipgate/sipgateffx

    sipgateFFX is free software; you can redistribute it and/or modify
    it under the terms of version 2 of the GNU General Public License
    as published by the Free Software Foundation.

    sipgateFFX is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
    02110-1301, USA

*****************************************************************************/

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var xulObjReference = new Array();
var _sgffx;

function SipgateFFX() {
    this.wrappedJSObject = this;
    _sgffx = this;
    this._strings = null;
	
	this.addOnVersion = null;
	 
    this.samuraiAuth = {
        "hostname": "chrome://sipgateffx",
        "formSubmitURL": null,
        "httprealm": 'sipgate Account Login',
        "username": null,
        "password": null
    };
	
    this.sipgateCredentials = {
        "SipRegistrar": "sipgate.de",
        "NtpServer": "ntp.sipgate.net",
        "HttpServer": "www.live.sipgate.de",
        "SipOutboundProxy": "proxy.dev.sipgate.de",
        "XmppServer": "",
        "StunServer": "stun.sipgate.net",
        "SamuraiServer": "api.sipgate.net",
        "SimpleServer": ""
    };
	
    this.recommendedIntervals = {
        "samurai.BalanceGet": 60,
        "samurai.RecommendedIntervalGet": 60,
        "samurai.EventSummaryGet": 60
    };
	
    this.samuraiServer = {'team': "https://api.sipgate.net/RPC2", 'classic': "https://samurai.sipgate.net/RPC2"};
	this.systemArea = (this.getPref("extensions.sipgateffx.systemTeam", "bool") ? 'team' : 'classic');
    
    this.defaultExtension = {
        "voice": null,
        "text": null,
        "fax": null
    };
    this.ownUriList = {
        "voice": [],
        "text": [],
        "fax": []
    };
	
    this.tosList = [
        "voice",
        "text",
        "fax",
    ];
    
    this.unreadEvents = {
        "voice": {
            'count': null,
            'time': null
        },
        "text": {
            'count': null,
            'time': null
        },
        "fax": {
            'count': null,
            'time': null
        }
    };
    
    this.currentSessionID = null; // session for click2dial (must be NULL if there is no active session)
    this.currentSessionTime = null;
    this.currentSessionData = {
        'to': '',
        'from': ''
    };
	this.clientLang = 'en';
	this.mLogBuffer = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
	this.mLogBufferMaxSize = 1000;
	this.getBalanceTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.getRecommendedIntervalsTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.getEventSummaryTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.c2dTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.curBalance = null;
	this.isLoggedIn = false;
	
	this.windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	
	// must loaded here
	Components.utils.import("resource://sipgateffx/xmlrpc.js");
}

SipgateFFX.prototype = {
	classDescription: "sipgateFFX javascript XPCOM Component",
	classID: Components.ID("{BCC44C3C-B5E8-4566-8556-0D9230C7B4F9}"),
	contractID: "@api.sipgate.net/sipgateffx;1",
	QueryInterface: XPCOMUtils.generateQI(),
	
	 get password() {
		if (this.samuraiAuth.password) {
			return this.samuraiAuth.password;
		} else {
			return null;
		}
	},
	
	 get username() {
		if (this.samuraiAuth.username) {
			return this.samuraiAuth.username;
		} else {
			return null;
		}
	},
	
	 get language() {
		return this.clientLang;
	},
	
	
	 set language(lang) {
		if (lang == "de") {
			return this.clientLang = "de";
		} else {
			return this.clientLang = "en";
		}
	},
	
	get strings() {
		return this._strings;
	},
	
	set strings(strings) {
		//dumpJson(strings);
		//this.log(strings.getString("helloMessageTitle"));
		if(this._strings == null) {
			this._strings = strings;
		}
	},
	
	get version() {
		if(this.addOnVersion == null) {
			try {
				var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
				var item = extensionManager.getItemForID('sipgateffx@michael.rotmanov');
				if(item) {
					this.addOnVersion = item.version;
				}
			} catch(except) {
				this.addOnVersion = 'UNKNOWN';
			}
		} 
		return this.addOnVersion;
	},
	
	oPrefService: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	
	setPref: function(aName, aValue, aType) {
		this.log(aName);
		try {
			if (aType == "bool") {
				this.oPrefService.setBoolPref(aName, aValue);
			} else if (aType == "int") {
				this.oPrefService.setIntPref(aName, aValue);
			} else if (aType == "char") {
				this.oPrefService.setCharPref(aName, aValue);
			}
			this.log("preference '" + aName + "' (" + aType + ") set to '" + aValue + "'");
		} 
		catch (e) {
			dump(e);
		}
	},
	
	getPref: function(aName, aType) {
		try {
			var result;
			if (aType == "int") {
				result = this.oPrefService.getIntPref(aName);
			} else if (aType == "char") {
				result = this.oPrefService.getCharPref(aName);
			} else if (aType == "bool") {
				result = this.oPrefService.getBoolPref(aName);
			}
			return result;
		} 
		catch (e) {
			if (aType == "int") {
				return 0;
			} else if (aType == "char") {
				return null;
			}
		}
		return null;
	},
	
	getSamuraiAuth: function() {
		// Login Manager exists so this is Firefox 3
		var passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
		
		// Find users for the given parameters
		var logins = passwordManager.findLogins({}, this.samuraiAuth.hostname, this.samuraiAuth.formSubmitURL, this.samuraiAuth.httprealm);
		
		var username = null;
		var password = null;
		
		// Find user from returned array of nsILoginInfo objects
		this.log("Found passwords count: " + logins.length + "");
		for (var i = 0; i < logins.length; i++) {
			username = logins[i].username;
			password = logins[i].password;
			break;
		}
		
		this.samuraiAuth.username = username;
		this.samuraiAuth.password = password;
		return {
			'username': username,
			'password': password
		};
	},
	
	setSamuraiAuth: function(username, password) {
		try {
			// Get Login Manager 
			var passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
			
			// Find users for this extension 
			var logins = passwordManager.findLogins({}, this.samuraiAuth.hostname, this.samuraiAuth.formSubmitURL, this.samuraiAuth.httprealm);
			
			this.log("Found passwords count: " + logins.length + "");
			for (var i = 0; i < logins.length; i++) {
				passwordManager.removeLogin(logins[i]);
			}
			
			var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
			
			var loginInfo = new nsLoginInfo(this.samuraiAuth.hostname, this.samuraiAuth.formSubmitURL, this.samuraiAuth.httprealm, username, password, "", "");
			passwordManager.addLogin(loginInfo);
			
			this.samuraiAuth.username = username;
			this.samuraiAuth.password = password;			
		} 
		catch (ex) {
			// This will only happen if there is no nsILoginManager component class
			this.log('setSamuraiAuth: ' + ex);
		}
	},
		
	click2dial: function(to) {
		var _TOS = 'voice'; 
		
		if(this.tosList.indexOf(_TOS) == -1) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			promptService.alert(null, 'sipgateFFX', this.strings.getString('click2dial.unavailableTos'));
			return;
		}
				
		if(this.defaultExtension[_TOS] == null) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			promptService.alert(null, 'sipgateFFX', this.strings.getString('click2dial.noDefaultExtension'));
			return;
		}
		
		if(this.currentSessionID != null) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			promptService.alert(null, 'sipgateFFX', this.strings.getString('click2dial.running'));
			return;
		}

		var from = this.defaultExtension[_TOS];
		
		// check for custom defaultExtension
        var voiceList = this.ownUriList[_TOS];
		var uriList = [];
		var defaultExtensionPref = this.getPref("extensions.sipgateffx.defaultExtension", "char");
		
		// make a list of all available voice uris
        for (var i = 0; i < voiceList.length; i++) {
			uriList.push(voiceList[i].SipUri);
		}
		
		// check if option's defaultExtension is in the list of available extensions
		if(uriList.indexOf(defaultExtensionPref) == -1) {
			this.setPref("extensions.sipgateffx.defaultExtension", from.extensionSipUri, "char");
		} else {
			from = {
				'alias': defaultExtensionPref,
				'extensionSipUri': defaultExtensionPref
			};
		}
				
		this.log('### sipgateffx (click2dial): Starting from '+ from['alias'] +' ('+ from['extensionSipUri'] +') -> ' + to);
		
		this.currentSessionData = {'to': to, 'from': from['alias']};
		
		var params = { 
			'LocalUri': from['extensionSipUri'],
			'RemoteUri': "sip:"+ to +"\@sipgate.net",
			'TOS': "voice",
			'Content': ''		
		};
		
		var result = function(ourParsedResponse, aXML) {
			try {
				if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
					_sgffx.currentSessionID = ourParsedResponse.SessionID;
					_sgffx.setXulObjectAttribute('sipgatecmd_c2dCancellCall', "disabled", null);
					
					_sgffx.log('sipgateffx (click2dial): Initiating... (SessionID: ' + _sgffx.currentSessionID + ')');
					
					_sgffx.setXulObjectVisibility('sipgateffx_c2dStatus', 1);
					_sgffx.setXulObjectAttribute('sipgateffx_c2dStatusText', "value", _sgffx.strings.getString('click2dial.status.NOT_YET_AVAILABLE'));
					
					_sgffx.c2dTimer.initWithCallback({
						notify: function(timer){
							_sgffx.getClick2dialStatus();
						}
					}, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
					
				}
				else {
					alert('click2dial failed. Internal system error has occurred.');
					_sgffx.currentSessionID = null;
				}
			} catch(ex) {
				_sgffx.log('!$§§%$@@@ Exception: ' + ex);
			}
		};
		
		try {
			this._rpcCall("samurai.SessionInitiate", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
	},
	
	getClick2dialStatus: function() {
		if(this.currentSessionID == null) {
			this.log('click2dial is not initiated.');
			return;
		}
		
		var endStati = ['FAILED', 'HUNGUP', 'CALL_1_BUSY', 'CALL_1_FAILED', "CALL_2_BUSY", 'CALL_2_FAILED'];
		
		var params = {'SessionID': this.currentSessionID};		

		var result = function(ourParsedResponse, aXML) {
			try	{
				if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
					
					var state = ourParsedResponse.SessionStatus.toUpperCase().replace(/ /g,"_");
					_sgffx.log('sipgateffx (click2dial): Status: ' + state);
					
					// click2dial.status.
					var key = "click2dial.status." + state;
					
					var text = '';
					
					if (state == 'ESTABLISHED') {
						if (_sgffx.currentSessionTime == null) {
							_sgffx.currentSessionTime = new Date().getTime();
						}
						text = _sgffx.strings.getFormattedString(key, [parseInt((new Date().getTime() - _sgffx.currentSessionTime) / 1000)]);
					} else {
						text = _sgffx.strings.getString(key);
					}
					_sgffx.setXulObjectAttribute('sipgateffx_c2dStatusText', "value", text);
					
					if (endStati.indexOf(state) == -1) {
						_sgffx.c2dTimer.initWithCallback({
							notify: function(timer){
								_sgffx.getClick2dialStatus();
							}
						}, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
					} else {
						_sgffx.setXulObjectAttribute('sipgatecmd_c2dCancellCall', "disabled", "true");
						_sgffx.currentSessionID = null;
						_sgffx.currentSessionTime = null;
						
						_sgffx.c2dTimer.initWithCallback({
							notify: function(timer){
								_sgffx.setXulObjectVisibility('sipgateffx_c2dStatus', 0);
							}
						}, 5000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
					}
		
				} else {
					var msg = '### sipgateffx (click2dial): FAILED';
					if(ourParsedResponse.faultCode && ourParsedResponse.faultString) {
						msg = msg + ' (faultCode: '+ourParsedResponse.faultCode+' / faultString: '+ourParsedResponse.faultString+')';
						_sgffx.setXulObjectAttribute('sipgateffx_c2dStatusText', "value", ourParsedResponse.faultString);
					}
					_sgffx.log(msg);
					_sgffx.c2dTimer.initWithCallback({
						notify: function(timer){
							_sgffx.setXulObjectVisibility('sipgateffx_c2dStatus', 0);
						}
					}, 5000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
				}
			} catch(ex) {
				_sgffx.log('!$§§%$@@@ Exception: ' + ex);
			}
		};

		try {
			this._rpcCall("samurai.SessionStatusGet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}

	},
	
	cancelClick2Dial: function() {
		if(this.currentSessionID == null) {
			this.log('click2dial is not initiated.');
			return;
		}

		var params = {'SessionID': this.currentSessionID};		

		var result = function(ourParsedResponse, aXML){
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				//
			}
		};
		
		try {
			this._rpcCall("samurai.SessionClose", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}

	},
	
	login: function() {
		this.log("*** sipgateffx: login *** BEGIN ***");
		
		var showActiveMenu = function() {
			if (_sgffx.systemArea == 'team') {
				_sgffx.setXulObjectVisibility('showcreditmenuitem', 1);
				_sgffx.setXulObjectVisibility('showvoicemailmenuitem', 1);
				_sgffx.setXulObjectVisibility('showphonebookmenuitem', 1);
				_sgffx.setXulObjectVisibility('showhistorymenuitem', 1);
				_sgffx.setXulObjectVisibility('showfaxmenuitem', 1);
				_sgffx.setXulObjectVisibility('showshopmenuitem', 1);
				_sgffx.setXulObjectVisibility('showitemizedmenuitem', 1);
			}

			_sgffx.setXulObjectVisibility('pollbalance', 1);
			_sgffx.setXulObjectVisibility('showsmsformmenuitem', 1);
			_sgffx.setXulObjectVisibility('item_logoff', 1);
			_sgffx.setXulObjectVisibility('separator1', 1);
			_sgffx.setXulObjectVisibility('separator2', 1);
			
			if (!_sgffx.getPref("extensions.sipgateffx.parsenumbers", "bool")) {
				_sgffx.setXulObjectVisibility('dialactivate', 1);
			}
			
			
			_sgffx.setXulObjectVisibility('item_logon', 0);
			
			_sgffx.setXulObjectVisibility('sipgateffx_loggedout', 0);
			_sgffx.setXulObjectVisibility('sipgateffx_loggedin', 1);			
		}
		
		if (this.isLoggedIn) {
			this.log("*** sipgateffx: login *** ALREADY LOGGED IN ***");
			showActiveMenu();
			this.getBalance();
			return;
		}

		var result = function(ourParsedResponse, aXML) {
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
	
				showActiveMenu();
				
				_sgffx.isLoggedIn = true;
				
				_sgffx.log("*** NOW logged in ***");
				_sgffx.getTosList();
				_sgffx.getRecommendedIntervals();
				_sgffx.getOwnUriList();
				
				_sgffx.curBalance = null;
				_sgffx.getBalance();
				if (_sgffx.systemArea == 'team') {
					_sgffx.getEventSummary();
					_sgffx.sipgateCredentials = ourParsedResponse;				
				}
				
			} else {
				_sgffx.log("*** Login Failed with: "+ ourParsedResponse.StatusCode +" ***");
			}
		};
		
		try {
			// this._rpcCall("samurai.serverInfo", {}, result);
			this._rpcCall("samurai.ServerdataGet", {}, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}

		this.log("*** sipgateffx: login *** END ***");
	},
	
	logoff: function() {
		if (!this.isLoggedIn) {
			this.log("*** sipgateffx: logoff *** USER NOT LOGGED IN ***");
			return;
		}
		
		if (this.systemArea == 'team') {
			try {
				this.websiteSessionLogout();
			} catch(e) {
				//
			}
		}
		
		// set to initial values
		this.isLoggedIn = false;
		this.curBalance = null;
		
		// close notification bubbles
		this.runXulObjectCommand('sipgatenotificationPanel', 'hidePopup');
		
		// set balance to nothing
		this.setXulObjectAttribute('BalanceText', "value", "");
		
		// hide notification icons
		this.setXulObjectVisibility('sipgateffxEventsCall', 0);
		this.setXulObjectVisibility('sipgateffxEventsSMS', 0);
		this.setXulObjectVisibility('sipgateffxEventsFax', 0);
		
		// hide context menu items
		this.setXulObjectVisibility('showcreditmenuitem', 0);
		this.setXulObjectVisibility('pollbalance', 0);
		this.setXulObjectVisibility('showvoicemailmenuitem', 0);
		this.setXulObjectVisibility('showphonebookmenuitem', 0);
		this.setXulObjectVisibility('showsmsformmenuitem', 0);
		this.setXulObjectVisibility('showhistorymenuitem', 0);
		this.setXulObjectVisibility('showfaxmenuitem', 0);
		this.setXulObjectVisibility('showshopmenuitem', 0);
		this.setXulObjectVisibility('showitemizedmenuitem', 0);
		this.setXulObjectVisibility('dialactivate', 0);
		this.setXulObjectVisibility('dialdeactivate', 0);
		this.setXulObjectVisibility('item_logoff', 0);
		this.setXulObjectVisibility('separator1', 0);
		this.setXulObjectVisibility('separator2', 0);
		
		this.setXulObjectVisibility('item_logon', 1);

		// switch loggedin panel to logged off panel
		this.setXulObjectVisibility('sipgateffx_loggedout', 1);
		this.setXulObjectVisibility('sipgateffx_loggedin', 0);
		
		this.log("*** NOW logged off ***");

	},
	
	websiteSessionLogout: function() {
		var urlSessionCheck = 'https://secure.live.sipgate.de/auth/logout/';
		var oHttpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);																 
		oHttpRequest.open("GET", urlSessionCheck, true);
		oHttpRequest.send(null);
	},	
		
	websiteSessionValid: function() {
		var urlSessionCheck = 'https://secure.live.sipgate.de/ajax/keepalive/';
		var oHttpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);																 
		oHttpRequest.open("GET", urlSessionCheck,false);
		oHttpRequest.send(null);
		
		var result = !oHttpRequest.responseText.match(/notloggedin/);

		this.log('websiteSessionValid: ' + result);
	},	
	
	getRecommendedIntervals: function() {
		this.log("*** sipgateffx: getRecommendedIntervals *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** sipgateffx: getRecommendedIntervals *** USER NOT LOGGED IN ***");
			return;
		}
		
		var result = function(ourParsedResponse, aXML) {
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				if (ourParsedResponse.IntervalList.length > 0) {
					for (var i = 0; i < ourParsedResponse.IntervalList.length; i++) {
						_sgffx.recommendedIntervals[ourParsedResponse.IntervalList[i].MethodName] = ourParsedResponse.IntervalList[i].RecommendedInterval;
						_sgffx.log(ourParsedResponse.IntervalList[i].MethodName + " = " + ourParsedResponse.IntervalList[i].RecommendedInterval);
					}
				}
			} else {
				_sgffx.log("getRecommendedIntervals failed toSTRING: "+ aXML.toString());
			}
		
			if (_sgffx.getPref("extensions.sipgateffx.polling", "bool")) {
				// set update timer
				var delay = _sgffx.recommendedIntervals["samurai.RecommendedIntervalGet"];
				
				_sgffx.getRecommendedIntervalsTimer.initWithCallback({
					notify: function(timer) {
						_sgffx.getRecommendedIntervals();
					}
				}, delay * 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
				
				_sgffx.log("getRecommendedIntervals: polling enabled. set to " + delay + " seconds");
			}
			
		};
		
		var params = {
			'MethodList': ["samurai.RecommendedIntervalGet", "samurai.BalanceGet", "samurai.EventSummaryGet"]
		};
		
		try {
			this._rpcCall("samurai.RecommendedIntervalGet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		this.log("*** sipgateffx: getRecommendedIntervals *** END ***");
	},

	getBalance: function(force) {
		this.log("*** sipgateffx: getBalance *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** sipgateffx: sipgateffx *** USER NOT LOGGED IN ***");
			return;
		}
		
		var setBalance = function() {
			_sgffx.setXulObjectAttribute('BalanceText', "value", _sgffx.curBalance[0]);
			
			// display the balance value:
			if (_sgffx.curBalance[1] < 5.0) {
				_sgffx.setXulObjectAttribute('BalanceText', "style", "cursor: pointer; color: red;");
			} else {
				_sgffx.setXulObjectAttribute('BalanceText', "style", "cursor: pointer;");
			}
		};
		
		if(typeof force == 'undefined') {
			force = false;
		}
		
		if(this.curBalance != null && !force) {
			this.log("*** sipgateffx: getBalance: no need to do a request, we have a balance");
			setBalance();
			return;
		}
		
		var result = function(ourParsedResponse, aXML) {
			_sgffx.log('### getBalance. Result received.');
			
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
			
				var balance = ourParsedResponse.CurrentBalance;
				var currency = balance.Currency;
				var balanceValueDouble = balance.TotalIncludingVat;
				
				var balanceValueString = balanceValueDouble;
				
				// dirty hack to localize floats:
				if (_sgffx.clientLang == "de") {
					// german floats use "," as delimiter for mantissa:
					balanceValueString = balanceValueDouble.toFixed(2).toString();
					balanceValueString = balanceValueString.replace(/\./, ",");
				} else {
					balanceValueString = balanceValueDouble.toFixed(2).toString();
				}
				
				_sgffx.curBalance = [balanceValueString + " " + currency, balanceValueDouble];
				setBalance();
				
			}
			
			if (_sgffx.getPref("extensions.sipgateffx.polling", "bool")) {
				// set update timer
				var delay = _sgffx.recommendedIntervals["samurai.BalanceGet"];
				
				_sgffx.getBalanceTimer.initWithCallback({
					notify: function(timer) {
						_sgffx.curBalance = null;
						_sgffx.getBalance();
					}
				}, delay * 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
				
				_sgffx.log("getBalance: polling enabled. set to " + delay + " seconds");
			}
				
		};
	
		try {
			this._rpcCall("samurai.BalanceGet", {}, result);
			this.log('### getBalance. Request sent.');
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** sipgateffx: getBalance *** END ***");
		
		
	},
		
	getOwnUriList: function () {
		this.log("*** getOwnUriList *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getOwnUriList *** USER NOT LOGGED IN ***");
			return;
		}
		
        var result = function(ourParsedResponse, aXML){
            if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
                if (ourParsedResponse.OwnUriList.length > 0) {
					// clear old list
					var uriList = [];
					_sgffx.ownUriList = {"voice": [], "text": [], "fax": []};
					
                    for (var i = 0; i < ourParsedResponse.OwnUriList.length; i++) {
						uriList.push(ourParsedResponse.OwnUriList[i].SipUri);
                        for (var k = 0; k < ourParsedResponse.OwnUriList[i].TOS.length; k++) {
                            var extensionInfo = {
                                'UriAlias': ourParsedResponse.OwnUriList[i].UriAlias,
                                'DefaultUri': ourParsedResponse.OwnUriList[i].DefaultUri,
                                'E164In': ourParsedResponse.OwnUriList[i].E164In,
                                'E164Out': ourParsedResponse.OwnUriList[i].E164Out,
                                'SipUri': ourParsedResponse.OwnUriList[i].SipUri,
                            };
                            _sgffx.ownUriList[ourParsedResponse.OwnUriList[i].TOS[k]].push(extensionInfo);
                            if (ourParsedResponse.OwnUriList[i].DefaultUri === true) {
                                _sgffx.defaultExtension[ourParsedResponse.OwnUriList[i].TOS[k]] = {
                                    'alias': (ourParsedResponse.OwnUriList[i].UriAlias!='' ? ourParsedResponse.OwnUriList[i].UriAlias : ourParsedResponse.OwnUriList[i].SipUri),
                                    'extensionSipUri': ourParsedResponse.OwnUriList[i].SipUri
                                };
                            }
                        }
                    }
					
					var defaultExtensionPref = _sgffx.getPref("extensions.sipgateffx.defaultExtension", "char");
					if (uriList.indexOf(defaultExtensionPref) == -1) {
						_sgffx.setPref("extensions.sipgateffx.defaultExtension", _sgffx.defaultExtension.voice.extensionSipUri, "char");
					}					
                }
            }
        };
		
		try {
			this._rpcCall("samurai.OwnUriListGet", {}, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}

		this.log("*** getOwnUriList *** END ***");		
	},
	
	getEventSummary: function () {
		this.log("*** getEventSummary *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getEventSummary *** USER NOT LOGGED IN ***");
			return;
		}
		
		var params = {
			// 'LabelName': []
			// 'TOS': ["voice", "fax", "text"]
		};
		
        var result = function(ourParsedResponse, aXML){
			// dumpJson(ourParsedResponse);
            if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				try {
					var timestamp = parseInt(new Date().getTime() / 1000);
					_sgffx.log('getEventSummary: got ' + ourParsedResponse.EventSummary.length + ' EventSummaries');
					for (var i = 0; i < ourParsedResponse.EventSummary.length; i++) {
						// check for new events
						if(_sgffx.unreadEvents[ourParsedResponse.EventSummary[i].TOS]['count'] != null &&
							ourParsedResponse.EventSummary[i].Unread > _sgffx.unreadEvents[ourParsedResponse.EventSummary[i].TOS]['count']
						) 
						{
							var diff = ourParsedResponse.EventSummary[i].Unread - _sgffx.unreadEvents[ourParsedResponse.EventSummary[i].TOS]['count'];
							var msg = _sgffx.strings.getFormattedString('notification.' + ourParsedResponse.EventSummary[i].TOS, [diff]);
							_sgffx.log("getEventSummary: "+ msg);
							
							var	text = _sgffx.strings.getFormattedString('notification.prefix', [msg]);
							
							_sgffx.runXulObjectCommand('sipgatenotificationPanel', 'clearLines');
							_sgffx.runXulObjectCommand('sipgatenotificationPanel', 'addLine', [text]);
							_sgffx.runXulObjectCommand('sipgatenotificationPanel', 'open');
							
							/*
							var xulObj = xulObjReference['sipgatenotificationPanel'];
							for (var k = 0; k < xulObj.length; k++) {
									xulObj[k] = xulObj[k].QueryInterface(Components.interfaces.nsIDOMXULElement);
									xulObj[k].clearLines();
									xulObj[k].addLine('You have ' + msg);
									xulObj[k].open();
							}*/
						}
						// store new event count
						_sgffx.unreadEvents[ourParsedResponse.EventSummary[i].TOS]['count'] = ourParsedResponse.EventSummary[i].Unread;
						_sgffx.unreadEvents[ourParsedResponse.EventSummary[i].TOS]['time'] = timestamp;
						
						// update toolBar
						var toolBarText = ourParsedResponse.EventSummary[i].Unread + "/" + ourParsedResponse.EventSummary[i].Read;
						switch(ourParsedResponse.EventSummary[i].TOS) {
							case 'voice':
								if (toolBarText == '0/0') {
									_sgffx.setXulObjectVisibility('sipgateffxEventsCall', 0);
								}
								else {
									_sgffx.setXulObjectVisibility('sipgateffxEventsCall', 1);
									_sgffx.setXulObjectAttribute('sipgateffxEventsCall', 'value', toolBarText);
								}
								break;
							case 'text':
								if (toolBarText == '0/0') {
									_sgffx.setXulObjectVisibility('sipgateffxEventsSMS', 0);
								}
								else {
									_sgffx.setXulObjectVisibility('sipgateffxEventsSMS', 1);
									_sgffx.setXulObjectAttribute('sipgateffxEventsSMS', 'value', toolBarText);
								}
								break;
							case 'fax':
								if (toolBarText == '0/0') {
									_sgffx.setXulObjectVisibility('sipgateffxEventsFax', 0);
								}
								else {
									_sgffx.setXulObjectVisibility('sipgateffxEventsFax', 1);
									_sgffx.setXulObjectAttribute('sipgateffxEventsFax', 'value', toolBarText);
								}
								break; 
						}
					}
				} catch(e) {
					_sgffx.log("getEventSummary: Error occured during parsing ("+e+")");
				}
            } else {
				_sgffx.log("getEventSummary failed toSTRING: "+ aXML.toString());
			}
			
			if (_sgffx.getPref("extensions.sipgateffx.polling", "bool")) {
				// set update timer
				var delay = _sgffx.recommendedIntervals["samurai.EventSummaryGet"];
				
				_sgffx.getEventSummaryTimer.initWithCallback({
					notify: function(timer) {
						_sgffx.getEventSummary();
					}
				}, delay * 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
				
				_sgffx.log("getEventSummary: polling enabled. set to " + delay + " seconds");
			}
			
        };
		
		try {
			this._rpcCall("samurai.EventSummaryGet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** getEventSummary *** END ***");		
	},

	getEventList: function() {
		this.log("*** getEventList *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getEventList *** USER NOT LOGGED IN ***");
			return;
		}
		
		var params = {
			'Labels': ['inbox'],
			'TOS': ["voice"],
			'Limit': 0,
			'Offset': 0
		};
		
        var result = function(ourParsedResponse, aXML){
			dumpJson(ourParsedResponse);
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
            } else {
				_sgffx.log("getEventList failed toSTRING: "+ aXML.toString());
			}
		};

		try {
			this._rpcCall("samurai.EventListGet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}

		this.log("*** getEventList *** END ***");		
		
	},	

	getPhonebookList: function() {
		this.log("*** getPhonebookList *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getPhonebookList *** USER NOT LOGGED IN ***");
			return;
		}
		
		var params = {};
		
        var result = function(ourParsedResponse, aXML){
			dumpJson(ourParsedResponse);
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
            } else {
				_sgffx.log("getPhonebookList failed toSTRING: "+ aXML.toString());
			}
		};

		try {
			this._rpcCall("samurai.PhonebookListGet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** getPhonebookList *** END ***");		
		
	},	

	getPhonebookEntries: function() {
		this.log("*** getPhonebookEntries *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getPhonebookEntries *** USER NOT LOGGED IN ***");
			return;
		}
		
		var params = {
			'EntryIDList': []
		};
		
        var result = function(ourParsedResponse, aXML){
			dumpJson(ourParsedResponse);
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
            } else {
				_sgffx.log("getPhonebookEntries failed toSTRING: "+ aXML.toString());
			}
		};
			
		try {
			this._rpcCall("samurai.PhonebookEntryGet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** getPhonebookEntries *** END ***");		
		
	},

	getTosList: function() {
		this.log("*** getTosList *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getTosList *** USER NOT LOGGED IN ***");
			return;
		}
		
		var params = {
		};
		
        var result = function(ourParsedResponse, aXML){
			dumpJson(ourParsedResponse);
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				if(ourParsedResponse.TosList) {
					_sgffx.tosList = ourParsedResponse.TosList; 
				}
            } else {
				_sgffx.log("getTosList failed toSTRING: "+ aXML.toString());
			}
		};
			
		try {
			this._rpcCall("samurai.TosListGet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** getTosList *** END ***");		
		
	},
		
	_rpcCall: function(method, params, callbackResult, callbackError) {
		var errString = this.strings;
		var samuraiServer = this.samuraiServer[this.systemArea];
		var user = this.username;
		var pass = this.password;
		
		if (user == null || pass == null) {
			var retVal = this.getSamuraiAuth();
			if (retVal.username == null || retVal.password == null) {
				this.log("could not be authorized");
				return;
			}
			
			user = retVal.username;
			pass = retVal.password;
		}
		
		var _tmpSrv = this.getPref("extensions.sipgateffx.server","char");
		if(_tmpSrv != null && typeof(_tmpSrv) == 'string' && _tmpSrv.match(/^https?(.*)\.sipgate\.net/)) {
			samuraiServer = _tmpSrv;
		}		
		
		var request = bfXMLRPC.makeXML(method, [samuraiServer, params]);
		
		var req = new Request();
		req.url = samuraiServer;
		req.data = request;
		req.headers['User-Agent'] = 'sipgateFFX ' + this.version + '/' + this.windowMediator.getMostRecentWindow('').navigator.userAgent;
		req.headers['Connection'] = 'close';
		req.headers['Content-Type'] = 'text/xml';
		req.headers['Authorization'] = 'Basic ' + btoa(user + ':' + pass);

/*		req.doAuth = true;
		req.username = user;
		req.password = pass;*/
		
		req.onSuccess = function(aText, aXML) {
			var re = /(\<\?\xml[0-9A-Za-z\D]*\?\>)/;
			var newstr = aText.replace(re, "");
			
			try {
				var e4xXMLObject = new XML(newstr);
			} 
			catch (e) {
				dump("malformedXML");
				return;
			}

			if (e4xXMLObject.name() != 'methodResponse' ||
			!(e4xXMLObject.params.param.value.length() == 1 ||
			e4xXMLObject.fault.value.struct.length() == 1)) {
				if (aText != '') {
					dump("XML Response:" + aText);
				}
			}
			
			if (e4xXMLObject.params.param.value.length() == 1) {
				ourParsedResponse = bfXMLRPC.XMLToObject(e4xXMLObject.params.param.value.children()[0]);
			}
			
			if (e4xXMLObject.fault.children().length() > 0) {
				ourParsedResponse = bfXMLRPC.XMLToObject(e4xXMLObject.fault.value.children()[0]);
			}
			
			if (typeof(callbackResult) == 'function') {
				if(typeof(ourParsedResponse) == 'undefined') {
					ourParsedResponse = {};
				}
				callbackResult(ourParsedResponse, aXML);
			} else {
				dump("Good Result:" + aText);
				dump("Good Result:" + aXML);
			}
		}; 
		
		req.onFailure = function(aStatusMsg, Msg) {
			_sgffx.log('request failed for method: '+ method +' with: ' + aStatusMsg + ' - ' + Msg);
			var errorMessage = '';
			
			if (typeof(callbackError) == 'function') {
				callbackError(aStatusMsg, Msg);
				return;
			}
			
			switch (aStatusMsg) {
				case 401:
					errorMessage = "status.401";
					if(user.search(/[\w-]+@([\w-]+\.)+[\w-]+/) == -1 && _sgffx.systemArea == 'team') {
						errorMessage = "status.401.wrongSystem";
					}
					break;
				case 403:
					errorMessage = "status.403";
					break;
				case 404:
					errorMessage = "status.404";
					break;
				case 503:
					if (typeof(callbackResult) == 'function') {
						callbackResult({}, new XML());
						return;
					}
					break;
				default:
					errorMessage = Msg;
					break;
			}
			
			try {
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
				promptService.alert(null, _sgffx.strings.getString("sipgateffxError.title"), _sgffx.strings.getString(errorMessage));
			} catch (e) {
				//
			}
			
		};

		// req.onCancel = function() { dump("\n\nCANCELLED\n\n"); };
		// req.onRequest = function() {dump("\n\nREQUESTED\n\n");};

		// this.log('_rpcCall: sending ' + method);
		req.send();
		
	},
	
	niceNumber: function (_number, natprefix) {
		try {
			_number = _number.toString().replace(/\s+/g, "");
			_number = _number.toString().replace(/^\+/, "");
			_number = _number.toString().replace(/\./g, "");
			_number = _number.toString().replace(/-/g, "");
			_number = _number.toString().replace(/43\(0+\)/, "43");
			_number = _number.toString().replace(/43\[0+\]/, "43");
			_number = _number.toString().replace(/44\(0+\)/, "44");
			_number = _number.toString().replace(/44\[0+\]/, "44");
			_number = _number.toString().replace(/49\(0+\)/, "49");
			_number = _number.toString().replace(/49\[0+\]/, "49");
			
			this.log("_niceNumber(): number before: "+_number);
			if (_number.toString().match(/^\(\d\d\d\)/)) {
				// transform american prefixes with 3-digit prefix (eg. "(123) 456789") to international format:
				_number = _number.toString().replace(/\(/, "");
				_number = _number.toString().replace(/\)/, "");
				_number = _number.toString().replace(/^/, "1");
			} else if (_number.toString().match(/^\(0[^0]\d+\)/)) { 
				// prefix like "(0211) ...":
				_number = _number.toString().replace(/\(0/, natprefix);
				_number = _number.toString().replace(/\)/, "");
			} else if (_number.toString().match(/^0[^0]/)) { 
				// prefix like "0211 ...":
				_number = _number.toString().replace(/^0/, natprefix);
			}
			_number = _number.toString().replace(/[^\d]/g, "");
			_number = _number.toString().replace(/^00/, "");
			this.log("_niceNumber(): number after: "+_number);
		} catch (ex) {
			this.log("Error in _niceNumber(): "+ex);
		}
		return _number;
	},

	logBufferDump: function () {
		return this.mLogBuffer;
	},

	log: function (logMessage) {
		try {
			var jetzt = new Date();
			var timestampFloat = jetzt.getTime() / 1000;
			var _CStringLogMessage = Components.classes["@mozilla.org/supports-cstring;1"].createInstance(Components.interfaces.nsISupportsCString);
			_CStringLogMessage.data = "[" + timestampFloat.toFixed(3) + "] " + logMessage;
			this.mLogBuffer.AppendElement(_CStringLogMessage);
			if(this.getPref("extensions.sipgateffx.debug","bool")) {
					// create instance of console-service for logging to JS-console:
					var _consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
					if(this.getPref("extensions.sipgateffx.debug2terminal","bool")) {
							dump("[" + timestampFloat.toFixed(3) + "] " + logMessage + "\n");
					} else {
							_consoleService.logStringMessage("[" + timestampFloat.toFixed(3) + "] " + logMessage + "\n");
					}
			}
			while (this.mLogBuffer.Count() > this.mLogBufferMaxSize) {
				this.mLogBuffer.DeleteElementAt(0);
			}
		} catch (ex) {
			dump("Error in _log(): "+ex+"\n");
		}
	},
	
	setXulObjectReference: function(id, obj) {
		if (typeof(xulObjReference[id]) != 'object') {
			// this.log("xulObjReference to " + id + " not defined as Array");
			xulObjReference[id] = new Array();
		}
		xulObjReference[id].push(obj);
	},
	
	setXulObjectVisibility: function(id, visible, forced) {
		if (visible == 1) {
			this.setXulObjectAttribute(id, "hidden", "false", forced);
		} else {
			this.setXulObjectAttribute(id, "hidden", "true", forced);
		}
	},
	
	setXulObjectAttribute: function(id, attrib_name, new_value, forced) {
		if (typeof(xulObjReference[id]) == 'object') {
			var xulObj = xulObjReference[id];
			for (var k = 0; k < xulObj.length; k++) {
				if (attrib_name == "src") {
					xulObj[k] = xulObj[k].QueryInterface(Components.interfaces.nsIDOMXULImageElement);
				} else {
					xulObj[k] = xulObj[k].QueryInterface(Components.interfaces.nsIDOMXULElement);
				}
				// this.log("set attribute '" + attrib_name + "' of '" + id + "' to '" + new_value + "'");
				if (new_value == null) {
					xulObj[k].removeAttribute(attrib_name);
				} else {
					xulObj[k].setAttribute(attrib_name, new_value);
				}
			}
		} else {
			this.log("No reference to XUL-Objects of " + id + "!");
		}
	},
	
	runXulObjectCommand: function(id, command, params) {
		try {
			if (typeof(xulObjReference[id]) == 'object') {
				var xulObj = xulObjReference[id];
				for (var k = 0; k < xulObj.length; k++) {
					xulObj[k] = xulObj[k].QueryInterface(Components.interfaces.nsIDOMXULElement);
					xulObj[k][command].apply(xulObj[k], params);
				}
			}
			else {
				this.log("No reference to XUL-Objects of " + id + "!");
			}
		} catch(e) {
			this.log("sipgateFFX->runXulObjectCommand ERROR " + e);
		}
	},
	
	removeXulObjRef: function(id, aXulObjRef) {
		try {
			if (typeof(xulObjReference[id]) == "object") {
				for (var i = 0; i < xulObjReference[id].length; i++) {
					var tmpElementStorage = xulObjReference[id].pop();
					if (tmpElementStorage == aXulObjRef) {
						this.log("removed a reference to element with id '" + id + "'");
					}
					else {
						xulObjReference[id].unshift(tmpElementStorage);
					}
				}
			}
			else {
				this.log("xulObjReference to " + id + " not defined as Array");
			}
		} catch(e) {
			this.log("sipgateFFX->removeXulObjRef ERROR " + e);
		}
	}

};
var components = [SipgateFFX];

function NSGetModule(compMgr, fileSpec) {
	return XPCOMUtils.generateModule(components);
}

function dumpJson(obj) {
	var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
	                 .createInstance(Components.interfaces.nsIJSON);
	_sgffx.log(nativeJSON.encode(obj));
};
