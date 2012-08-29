/*****************************************************************************

    sipgate FFX - Firefox Extension for Mozilla Firefox Webbrowser
    Copyright (C) 2011 sipgate GmbH, Germany

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
try{
	Components.utils.import("resource://gre/modules/AddonManager.jsm");
} catch(e) {}

var _sgffx;

function SipgateFFX() {
    this.wrappedJSObject = this;
    _sgffx = this;
    this._strings = null;
    
    this.xulObjReference = new Array();
    
    this.addOnInfo = null;
	this.addOnVersion = null;
	this.addOnTarget = null;
	 
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
        "samurai.EventSummaryGet": 60,
		"samurai.DoNotDisturbGet": 60
    };
	
    this.samuraiServer = {'team': "https://api.sipgate.net/RPC2", 'classic': "https://samurai.sipgate.net/RPC2"};
    this.systemAreaRegEx = new RegExp(/^.+@.+\.[a-z]{2,6}$/);

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
    
	this.DND = null;
	
	this.contacts = {};
	
    this.currentSessionID = null; // session for click2dial (must be NULL if there is no active session)
    this.currentSessionTime = null;
    this.currentSessionData = {
        'to': '',
        'from': ''
    };
	this.clientLang = 'en';
	this.userCountryPrefix = '49';
	this.internationalPrefixes = {
			"1": ["^011","^\\+"],
			"43": ["^00","^\\+"],
			"44": ["^00","^\\+"],
			"49": ["^00","^\\+"]
	};
	this.mLogBuffer = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
	this.mLogBufferMaxSize = 1000;
	this.getBalanceTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.getRecommendedIntervalsTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.getEventSummaryTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.getDoNotDisturbTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.c2dTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.curBalance = null;
	this.isLoggedIn = false;
	this.loggedOutByUser = false;
	
	this.windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
	
	// must be loaded here
	Components.utils.import("resource://sipgateffx/mimic.js");
}

SipgateFFX.prototype = {
	classDescription: "sipgateFFX javascript XPCOM Component",
	classID: Components.ID("{BCC44C3C-B5E8-4566-8556-0D9230C7B4F9}"),
	contractID: "@api.sipgate.net/sipgateffx;1",

	QueryInterface: XPCOMUtils.generateQI(),

	 get systemArea() {
		return this.systemAreaRegEx.test(this.username) ? 'team' : 'classic';
	},
	
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
		//_sgffx.dumpJson(strings);
		//this.log(strings.getString("helloMessageTitle"));
		if(this._strings == null) {
			this._strings = strings;
		}
	},
	
	get version() {
		if(this.addOnVersion == null || this.addOnVersion == "NOTYETKNOWN") {
			try {
				var item = {version: "NOTYETKNOWN"};
				var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"];
				if(extensionManager) {
					item = extensionManager.getService(Components.interfaces.nsIExtensionManager).getItemForID('sipgateffx@michael.rotmanov');
				} else if(this.addOnInfo !== null) {
					item = this.addOnInfo;
				}
				if(item) {
					this.addOnVersion = item.version;
				}
			} catch(except) {
				this.log("get version ERROR: " + except);
				this.addOnVersion = 'UNKNOWN';
			}
		} 
		return this.addOnVersion;
	},
	
	get application() {
		if(this.addOnTarget == null) {
			try {
				var info = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
				this.addOnTarget = info.name.toLowerCase();
				/*
				var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
				var item = extensionManager.getItemForID('sipgateffx@michael.rotmanov');
				if(item) {
					switch(item.targetAppID) {
						case '{3550f703-e582-4d05-9a08-453d09bdfdc6}':
							this.addOnTarget = 'thunderbird';
							break;
						default:
							this.addOnTarget = 'firefox';
							break;							
					}
				}
				*/
			} catch(except) {
				this.log("get application ERROR: " + except);
				this.addOnTarget = 'firefox';
			}
		} 
		return this.addOnTarget;
	},
	

	/**
	 * do some initialization work and after getting all infos start callback
	 */
	init: function(callback) {
		if(typeof AddonManager != 'undefined') {
			AddonManager.getAddonByID('sipgateffx@michael.rotmanov', function(addon) {
				_sgffx.addOnInfo = addon;
				_sgffx.addOnVersion = addon.version;
				callback();
			});
		} else {
			var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			timer.initWithCallback({notify: callback}, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		}
	},
		
	oPrefService: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	
	setPref: function(aName, aValue, aType) {
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
		
	click2dial: function(to, callbackOnSuccess) {
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
					
					if(typeof(callbackOnSuccess) == "function")
					{
						callbackOnSuccess();
					}
				}
				else {
					_sgffx.log('click2dial failed. Internal system error has occurred.');
					_sgffx.dumpJson(params);
					_sgffx.dumpJson(ourParsedResponse);
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
						
						if (state == 'CALL_1_FAILED') {
							var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
							promptService.alert(null, _sgffx.strings.getString("sipgateffxError.title"), _sgffx.strings.getString('click2dial.status.CALL_1_FAILED.detail'));
						}
						
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
					_sgffx.currentSessionID = null;
					_sgffx.currentSessionTime = null;
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
				_sgffx.setXulObjectVisibility('sipgateffxDND', 1);
			} else {
				_sgffx.setXulObjectVisibility('sipgateffxDND', 0);
			}
			
			_sgffx.setXulObjectVisibility('sipgateffx_showcreditmenuitem', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_showvoicemailmenuitem', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_showphonebookmenuitem', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_showhistorymenuitem', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_showitemizedmenuitem', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_pollbalance', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_item_logoff', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_separator1', 1);
			_sgffx.setXulObjectVisibility('sipgateffx_separator2', 1);
			
			if (!_sgffx.getPref("extensions.sipgateffx.parsenumbers", "bool")) {
				_sgffx.setXulObjectVisibility('sipgateffx_dialactivate', 1);
			}
			
			_sgffx.setXulObjectVisibility('sipgateffx_item_logon', 0);
			
			_sgffx.setXulObjectVisibility('sipgateffx_loggedout', 0);
			_sgffx.setXulObjectVisibility('sipgateffx_loggedin', 1);			
		}
		
		if (this.isLoggedIn) {
			this.log("*** sipgateffx: login *** ALREADY LOGGED IN ***");
			showActiveMenu();
			
			if(this.systemArea == 'team') {
				this.showEventSummary();
				this.showDoNotDisturb();
			}
			
			this.getBalance();
			return;
		}

		var result = function(ourParsedResponse, aXML) {
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
	
				showActiveMenu();
				
				_sgffx.isLoggedIn = true;
				
				_sgffx.log("*** NOW logged in ***");
				
				_sgffx.curBalance = null;
				_sgffx.getBalance();
				
				_sgffx.sipgateCredentials = ourParsedResponse;
				
				if(ourParsedResponse.HttpServer.match(/com$/)) {
					_sgffx.userCountryPrefix = '1';
				} else
				if(ourParsedResponse.HttpServer.match(/de$/)) {
					_sgffx.userCountryPrefix = '49';
				} else
				if(ourParsedResponse.HttpServer.match(/at$/)) {
					_sgffx.userCountryPrefix = '43';
				} else
				if(ourParsedResponse.HttpServer.match(/co\.uk$/)) {
					_sgffx.userCountryPrefix = '44';
				}				
				
				if (_sgffx.systemArea == 'team') {
					_sgffx.getEventSummary();
					_sgffx.getDoNotDisturb();				
				}
				
				_sgffx.getTosList();
				_sgffx.getRecommendedIntervals();
				_sgffx.getOwnUriList();
				try {
					_sgffx.clientIdentify();
				} catch(e) {
					_sgffx.log("*** clientIdentify FAILED");
				}
				_sgffx.getPhonebookList();
								
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
	
		try {
			this.websiteSessionLogout();
		} catch(e) {
			//
		}
		
		// set to initial values
		this.isLoggedIn = false;
		this.curBalance = null;
		this.contacts = {};
		
		// close notification bubbles
		this.runXulObjectCommand('sipgatenotificationPanel', 'hidePopup');
		
		// set balance to nothing
		this.setXulObjectAttribute('sipgateffx_BalanceText', "value", "");
		
		// hide notification icons
		this.setXulObjectVisibility('sipgateffxEventsCall', 0);
		this.setXulObjectVisibility('sipgateffxEventsSMS', 0);
		this.setXulObjectVisibility('sipgateffxEventsFax', 0);
		
		// hide context menu items
		this.setXulObjectVisibility('sipgateffx_showcreditmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_pollbalance', 0);
		this.setXulObjectVisibility('sipgateffx_showvoicemailmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_showphonebookmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_showsmsformmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_showphonenumberformmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_showhistorymenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_showfaxmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_showitemizedmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_sendfaxpdfmenuitem', 0);
		this.setXulObjectVisibility('sipgateffx_dialactivate', 0);
		this.setXulObjectVisibility('sipgateffx_dialdeactivate', 0);
		this.setXulObjectVisibility('sipgateffx_item_logoff', 0);
		this.setXulObjectVisibility('sipgateffx_separator1', 0);
		this.setXulObjectVisibility('sipgateffx_separator2', 0);
		
		this.setXulObjectVisibility('sipgateffx_item_logon', 1);

		// switch loggedin panel to logged off panel
		this.setXulObjectVisibility('sipgateffx_loggedout', 1);
		this.setXulObjectVisibility('sipgateffx_loggedin', 0);
		
		this.log("*** NOW logged off ***");

	},
	
	websiteSessionLogout: function() {
		var protocol = 'https://';
		var httpServer = this.sipgateCredentials.HttpServer.replace(/^www/, 'secure');				
		var urlSessionLogout = protocol + httpServer;
		if(this.systemArea == 'team') {
			urlSessionLogout += '/auth/logout/'; 
		} else {
			urlSessionLogout += '/user/slogout.php'; 
		}
		
		var oHttpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);																 
		oHttpRequest.open("GET", urlSessionLogout, true);
		oHttpRequest.send(null);
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
			'MethodList': ["samurai.RecommendedIntervalGet", "samurai.BalanceGet", "samurai.EventSummaryGet", "samurai.DoNotDisturbGet"]
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
		
		// return if user enabled "don't show balance" in preferences box
		if (this.getPref("extensions.sipgateffx.dontshowbalance", "bool")) {
			this.log("*** sipgateffx: sipgateffx *** show balance disabled -> END ***");
			return;
		}		
		
		var setBalance = function() {
			_sgffx.setXulObjectAttribute('sipgateffx_BalanceText', "value", _sgffx.curBalance[0]);
			if(_sgffx.application == 'firefox') {
				_sgffx.setXulObjectAttribute('sipgateffx-toolbar-button', "tooltiptext", _sgffx.curBalance[0]);
			}
	
			// display the balance value:
			if (_sgffx.curBalance[1] < 5.0) {
				_sgffx.setXulObjectAttribute('sipgateffx_BalanceText', "style", "color: red;");
			} else {
				_sgffx.setXulObjectAttribute('sipgateffx_BalanceText', "style", "color: inherit;");
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
				
				balanceValueString = (Math.floor(balanceValueDouble*100)/100).toFixed(2).toString();
				// balanceValueString = balanceValueDouble.toFixed(2).toString();
				
				// dirty hack to localize floats:
				if (_sgffx.clientLang == "de") {
					// german floats use "," as delimiter for mantissa:
					balanceValueString = balanceValueString.replace(/\./, ",");
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
							var tmp = bfXMLRPC.utf8decode(ourParsedResponse.OwnUriList[i].UriAlias);
                            var extensionInfo = {
                                'UriAlias': tmp,
                                'DefaultUri': ourParsedResponse.OwnUriList[i].DefaultUri,
                                'E164In': ourParsedResponse.OwnUriList[i].E164In,
                                'E164Out': ourParsedResponse.OwnUriList[i].E164Out,
                                'SipUri': ourParsedResponse.OwnUriList[i].SipUri
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
	
	showEventSummary: function() {
		if (!this.isLoggedIn) {
			this.log("*** showEventSummary *** USER NOT LOGGED IN ***");
			return;
		}
		
		for(var TOS in this.unreadEvents) {
			var TOSElement = '';
			switch(TOS) {
				case 'voice':
					TOSElement = 'sipgateffxEventsCall';
					break;
				case 'text':
					TOSElement = 'sipgateffxEventsSMS';
					break;
				case 'fax':
					TOSElement = 'sipgateffxEventsFax';
					break; 
			}
			
			var toolBarText = this.unreadEvents[TOS].count;
			var noEvents = '0';

			if (toolBarText == noEvents && TOSElement != '' && toolBarText != null) {
				_sgffx.setXulObjectVisibility(TOSElement, 0);
			}
			else if (toolBarText != noEvents && TOSElement != '' && toolBarText != null) {
				_sgffx.setXulObjectVisibility(TOSElement, 1);
				_sgffx.setXulObjectAttribute(TOSElement, 'value', toolBarText);
			}
									
		}
	
	},
	
	getEventSummary: function () {
		this.log("*** getEventSummary *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getEventSummary *** USER NOT LOGGED IN ***");
			return;
		}
		if(this.systemArea != 'team') {
			this.log("*** getEventSummary *** systemArea does not support event summary ***");
			return;
		}
		
		var params = {
			// 'LabelName': []
			// 'TOS': ["voice", "fax", "text"]
		};
		
        var result = function(ourParsedResponse, aXML){
			// _sgffx.dumpJson(ourParsedResponse);
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
	

						}
						// store new event count
						_sgffx.unreadEvents[ourParsedResponse.EventSummary[i].TOS]['count'] = ourParsedResponse.EventSummary[i].Unread;
						_sgffx.unreadEvents[ourParsedResponse.EventSummary[i].TOS]['time'] = timestamp;
						
						_sgffx.showEventSummary();
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
			_sgffx.dumpJson(ourParsedResponse);
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
			var neededContacts = [];
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				if (ourParsedResponse.PhonebookList && ourParsedResponse.PhonebookList.length > 0) {
					for (var i = 0; i < ourParsedResponse.PhonebookList.length; i++) {
						
						var entryId = ourParsedResponse.PhonebookList[i].EntryID;
						var hash = ourParsedResponse.PhonebookList[i].EntryHash;
						
						if(!_sgffx.contacts[entryId] || _sgffx.contacts[entryId]['hash'] != hash) {
							neededContacts.push(entryId);
						}
					}
					
					if(neededContacts.length > 0) {
						_sgffx.getPhonebookEntries(neededContacts);
					}
				}
				
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

	getPhonebookEntries: function(entryList) {
		this.log("*** getPhonebookEntries *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getPhonebookEntries *** USER NOT LOGGED IN ***");
			return;
		}
		
		var vcardModule = {};

		Components.utils.import("resource://sipgateffx/vcard.js", vcardModule);
		
		var params = {
			'EntryIDList': []
		};
		
		if(typeof(entryList) != 'undefined') {
			params.EntryIDList = entryList;
		}
		
        var result = function(ourParsedResponse, aXML){
			
        	if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				
				if (ourParsedResponse.EntryList && ourParsedResponse.EntryList.length > 0) {
					
					for (var i = 0; i < ourParsedResponse.EntryList.length; i++) {
						
						// dump(ourParsedResponse.EntryList[i].Entry +"\n");
						
						var entryId = ourParsedResponse.EntryList[i].EntryID;
						var entryHash = ourParsedResponse.EntryList[i].EntryHash;
						
						var contact = vcardModule.vCard.initialize(ourParsedResponse.EntryList[i].Entry);

						_sgffx.contacts[entryId] = {
							'hash': entryHash,
							'name': contact['fn'],
							'tel' : contact['tel']
						}; 
					}
					
				}
				
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
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				if(ourParsedResponse.TosList) {
					_sgffx.tosList = ourParsedResponse.TosList; 
				}
				
				var featuresForLog = [];

				// check for voice capability
				var voiceAvailable = (_sgffx.tosList.indexOf('voice') !== -1 ? 1 : 0);
				_sgffx.setXulObjectVisibility('sipgateffx_showphonenumberformmenuitem', voiceAvailable);
				featuresForLog.push("VOICE ("+(voiceAvailable==1 ? "yes" : "no")+")");
				
				// check for fax capability
				var faxAvailable = (_sgffx.tosList.indexOf('fax') !== -1 ? 1 : 0);
				_sgffx.setXulObjectVisibility('sipgateffx_showfaxmenuitem', faxAvailable);
				_sgffx.setXulObjectVisibility('sipgateffx_sendfaxpdfmenuitem', faxAvailable);
				featuresForLog.push("FAX ("+(faxAvailable==1 ? "yes" : "no")+")");
				
				// check for text (sms) capability
				var smsAvailable = (_sgffx.tosList.indexOf('text') !== -1 ? 1 : 0);
				_sgffx.setXulObjectVisibility('sipgateffx_showsmsformmenuitem', smsAvailable);
				featuresForLog.push("SMS ("+(smsAvailable==1 ? "yes" : "no")+")");
				
				_sgffx.log("Result of TOS: " + featuresForLog.join(" / "));

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

	clientIdentify: function() {
		this.log("*** clientIdentify *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** clientIdentify *** USER NOT LOGGED IN ***");
			return;
		}
		
		var params = {
			'ClientName': 'sipgateFFX',
			'ClientVersion': this.version,
			'ClientVendor': 'sipgate (michael.rotmanov)'
		};
		
		_sgffx.dumpJson(params);
		
        var result = function(ourParsedResponse, aXML){
		};

		try {
			this._rpcCall("samurai.ClientIdentify", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** clientIdentify *** END ***");		
		
	},	
	
	showDoNotDisturb: function() {
		if (!this.isLoggedIn) {
			this.log("*** showDoNotDisturb *** USER NOT LOGGED IN ***");
			return;
		}
		
		if(this.DND == null) {
			return;
		}

		if(this.DND) {
			this.setXulObjectVisibility('sipgateffxDNDon', 1);
			this.setXulObjectVisibility('sipgateffxDNDoff', 0);
		} else {
			this.setXulObjectVisibility('sipgateffxDNDon', 0);
			this.setXulObjectVisibility('sipgateffxDNDoff', 1);
		}
				
	},
	
	getDoNotDisturb: function() {
		this.log("*** getDoNotDisturb *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** getDoNotDisturb *** USER NOT LOGGED IN ***");
			return;
		}
		if(this.systemArea != 'team') {
			this.log("*** getDoNotDisturb *** systemArea does not support DND ***");
			return;
		}
		
        var result = function(ourParsedResponse, aXML){
			_sgffx.dumpJson(ourParsedResponse);
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				_sgffx.DND = ourParsedResponse.DND;
				_sgffx.showDoNotDisturb();
            } else {
				_sgffx.log("getDoNotDisturb failed toSTRING: "+ aXML.toString());
			}
		
			var delay = _sgffx.recommendedIntervals["samurai.DoNotDisturbGet"];
		
			_sgffx.getDoNotDisturbTimer.initWithCallback({
				notify: function(timer) {
					_sgffx.getDoNotDisturb();
				}
			}, delay * 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
			
			_sgffx.log("getDoNotDisturb: polling enabled. set to " + delay + " seconds");
			
		};

		try {
			this._rpcCall("samurai.DoNotDisturbGet", {}, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** getDoNotDisturb *** END ***");		
		
	},	

	setDoNotDisturb: function(dndEnabled) {
		this.log("*** setDoNotDisturb *** BEGIN ***");
		if (!this.isLoggedIn) {
			this.log("*** setDoNotDisturb *** USER NOT LOGGED IN ***");
			return;
		}
		
		var params = {
			DND: (dndEnabled==true ? 1 : 0)
		};
		
        var result = function(ourParsedResponse, aXML){
			_sgffx.dumpJson(ourParsedResponse);
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				if(dndEnabled) {
					_sgffx.setXulObjectVisibility('sipgateffxDNDon', 1);
					_sgffx.setXulObjectVisibility('sipgateffxDNDoff', 0);
				} else {
					_sgffx.setXulObjectVisibility('sipgateffxDNDon', 0);
					_sgffx.setXulObjectVisibility('sipgateffxDNDoff', 1);
				}
            } else {
				_sgffx.log("setDoNotDisturb failed toSTRING: "+ aXML.toString());
			}
		};

		try {
			this._rpcCall("samurai.DoNotDisturbSet", params, result);
		} catch(e) {
			this.log('Exception in xmlrpc-request: ' + e);
			this.log('Request sent: ' + request);
		}
		
		this.log("*** setDoNotDisturb *** END ***");		
		
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
		
		if (user == null || pass == null || user == '' || pass == '') {
			this.log("Auth: Failed. Username or password is/are empty.");
			return;
		}
		
		var _tmpSrv = this.getPref("extensions.sipgateffx.server","char");
		if(_tmpSrv != null && typeof(_tmpSrv) == 'string' && _tmpSrv.match(/^https?(.*)\.sipgate\.net/)) {
			samuraiServer = _tmpSrv;
		}		
		
		var msg = new XmlRpcRequest(samuraiServer, method);
		if(typeof params != 'undefined' && params != null)
		{
			msg.addParam(params);
		}

		var request = msg.parseXML();

		var req = new Request();
		req.setHeader('User-Agent', 'sipgateFFX ' + this.version + '/' + this.windowMediator.getMostRecentWindow('').navigator.userAgent);
		req.setHeader('Connection', 'close');
		req.setHeader('Content-Type', 'text/xml');
		req.setHeader('Authorization', 'Basic ' + btoa(user + ':' + pass));
		req.url = samuraiServer;
		req.data = request;
		
		req.onSuccess = function(aText, aXML) {
			_sgffx.log('onSuccess for method: '+ method);
			
			var ourParsedResponse = new XmlRpcResponse(aXML).parseXML();
			
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
			
			if(["samurai.ServerdataGet"].indexOf(method) == -1 ) {
				if (typeof(callbackResult) == 'function') {
					callbackResult({}, new XML());
				}
				return;
			}
			
			switch (aStatusMsg) {
				case 401:
					errorMessage = "status.401";
					if(user.search(/\d{7,}/) == 0) {
						errorMessage = "status.401.sipIdEntered";
						break;
					}
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

		this.log('_rpcCall: sending ' + method);
		req.send();
		
	},
	
	niceNumber: function (_number) {
		try {
			var natprefix = this.userCountryPrefix;
			
			this.log("_niceNumber(): number before: "+_number);
			
			/*
			// checking for E.123 number (USA)
			// will match for (XXX) YYY ZZZZ
			var usNumberRegEx = new RegExp([
				'^(1[\\s\\.\\-\\/])?',			// prefixed 1 with some trailing chars 
				'(',						// start search here
				'\\(?[2-9]\\d{2}\\)?',			// area code matching for optional brackets 
				'[\\s\\.\\-\\/]',				// trailing char
				'\\d{3}',					// 3-digit number block
				'[\\s\\.\\-\\/]',				// trailing char
				'\\d{4}',					// 4-digit number block
				')'							// end search here
			].join(''));
			
			if(usNumberRegEx.test(_number.toString())) {
				// this.log("_niceNumber(): USA number found");
				var numberParts = usNumberRegEx.exec(_number.toString());
				_number = "1" + numberParts[2].replace(/\D/g,'');
			}
			*/

			// -----------------------------------------------------
			
			var removeCandidates = [
				"\\s",						// whitespaces
				"-",						// dashes
				"\\[0\\]",					// smth like 49 [0] 211 to 49 211
				"\\(0\\)",					// smth like 49 (0) 211 to 49 211
				"\\.",						// all points
				"\\/",						// all points
				"\\[",						// bracket [
				"\\]",						// bracket ]
				"\\(",						// bracket (
				"\\)",						// bracket )
				String.fromCharCode(0xa0)	// &nbsp;
			];
			var removeRegEx = new RegExp(removeCandidates.join('|'), 'g');
			
			_number = _number.toString().replace(removeRegEx, "");
			
			// this.log("_niceNumber(): After removing characters: " + _number);
			
			if(!_number.match(/^0|^\+/)) {
				_number = natprefix + _number;
			} else {
				_number = _number.toString().replace(new RegExp(this.internationalPrefixes[natprefix].join('|')), "");
//				_number = _number.toString().replace(/^00|^011|\+/, "");
			}

			// -----------------------------------------------------			

			var nationalPrefixCandidates = [
				'^0([1-9]\\d+)'				// prefix like "0211 ..."
			];

			var nationalPrefixRegEx = new RegExp(nationalPrefixCandidates.join('|'));

			_number = _number.toString().replace(nationalPrefixRegEx, natprefix + "$1");

			// this.log("_niceNumber(): After nationalPrefixRegEx: " + _number);

			// -----------------------------------------------------	

			_number = _number.toString().replace(/[^\d]/g, "");
			this.log("_niceNumber(): number after: "+_number);
		} catch (ex) {
			this.log("Error in _niceNumber(): "+ex);
		}
		return _number;
	},

	logBufferDump: function () {
		return this.mLogBuffer;
	},

	_getTime: function() {
		var t = new Date();
		return '['+	[
		 t.getUTCFullYear(),
		 t.getUTCMonth(),
		 t.getUTCDate(),
		 t.getUTCHours(),
		 t.getUTCMinutes(),
		 t.getUTCSeconds()].join('-')
		 + ']';
	},
	
	log: function (logMessage) {
		try {
			var message = this._getTime() + " " + logMessage;
			var _CStringLogMessage = Components.classes["@mozilla.org/supports-cstring;1"].createInstance(Components.interfaces.nsISupportsCString);
			_CStringLogMessage.data = message;
			this.mLogBuffer.AppendElement(_CStringLogMessage);
			if(this.getPref("extensions.sipgateffx.debug","bool")) {
					// create instance of console-service for logging to JS-console:
					var _consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
					if(this.getPref("extensions.sipgateffx.debug2terminal","bool")) {
							dump(message + "\n");
					} else {
							_consoleService.logStringMessage(message + "\n");
					}
			}
			while (this.mLogBuffer.Count() > this.mLogBufferMaxSize) {
				this.mLogBuffer.DeleteElementAt(0);
			}
		} catch (ex) {
			dump("Error in _log(): "+ex+"\n");
		}
	},
	
	dumpJson: function (obj) {
		var text = "";
		if(JSON && JSON.stringify)
		{
			text = JSON.stringify(obj);
		} else {
			var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
			                 .createInstance(Components.interfaces.nsIJSON);
			text = nativeJSON.encode(obj);
		}
		_sgffx.log(text);
	},
	
	setXulObjectReference: function(id, obj) {
		if (typeof(this.xulObjReference[id]) != 'object') {
			// this.log("xulObjReference to " + id + " not defined as Array");
			this.xulObjReference[id] = new Array();
		}
		this.xulObjReference[id].push(obj);
	},
	
	setXulObjectVisibility: function(id, visible, forced) {
		if (visible == 1) {
			this.setXulObjectAttribute(id, "hidden", "false", forced);
		} else {
			this.setXulObjectAttribute(id, "hidden", "true", forced);
		}
	},
	
	setXulObjectAttribute: function(id, attrib_name, new_value, forced) {
		if (typeof(this.xulObjReference[id]) == 'object') {
			var xulObj = this.xulObjReference[id];
			try {
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
			} catch(e) {
				this.log('setXulObjectAttribute: Error occurred. ('+id+'/'+attrib_name+'/'+new_value+') with '+ e);
			}
		} else {
			this.log("No reference to XUL-Objects of " + id + "!");
		}
	},
	
	runXulObjectCommand: function(id, command, params) {
		try {
			if (typeof(this.xulObjReference[id]) == 'object') {
				var xulObj = this.xulObjReference[id];
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
			if (typeof(this.xulObjReference[id]) == "object") {
				for (var i = 0; i < this.xulObjReference[id].length; i++) {
					var tmpElementStorage = this.xulObjReference[id].pop();
					if (tmpElementStorage != aXulObjRef) {
						this.xulObjReference[id].unshift(tmpElementStorage);
//					} else {
//						this.log("removed a reference to element with id '" + id + "'");
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

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule(components);
