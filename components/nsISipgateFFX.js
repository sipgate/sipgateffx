Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://sipgateffx/xmlrpc.js");

var xulObjReference = new Array();
var _sgffx;

function SipgateFFX() {
	this.wrappedJSObject = this;
	_sgffx = this;
	this.samuraiAuth = {
		"hostname": "chrome://sipgateffx",
		"formSubmitURL": null,
		"httprealm": 'sipgate Account Login',
		"username": null,
		"password": null
	};
	this.recommendedIntervals = {"samurai.BalanceGet": 60, "samurai.RecommendedIntervalGet": 60 };
	this.samuraiServer = "https://samurai.sipgate.net/RPC2";
	this.clientLang = 'en';
	this.getBalanceTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.getRecommendedIntervalsTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.isLoggedIn = false;
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
		if(lang == "de") {
			return this.clientLang = "de";
		} else {
			return this.clientLang = "en";
		}
	},

	oPrefService: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	
	setPref: function(aName, aValue, aType) {
		dump(aName);
		try {
			if (aType == "bool") {
				this.oPrefService.setBoolPref(aName, aValue);
			} else if (aType == "int") {
				this.oPrefService.setIntPref(aName, aValue);
			} else if (aType == "char") {
				this.oPrefService.setCharPref(aName, aValue);
			}
			this.log("preference '" + aName + "' (" + aType + ") set to '" + aValue + "'");
		} catch (e) {
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
		} catch (e) {
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
		dump("Found passwords count: " + logins.length + "\n");
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
			
			dump("Found passwords count: " + logins.length + "\n");
			for (var i = 0; i < logins.length; i++) {
				passwordManager.removeLogin(logins[i]);
			}
			
			var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
			
			var loginInfo = new nsLoginInfo(this.samuraiAuth.hostname, this.samuraiAuth.formSubmitURL, this.samuraiAuth.httprealm, username, password, "", "");
			passwordManager.addLogin(loginInfo);
			
		} catch (ex) {
			// This will only happen if there is no nsILoginManager component class
			dump(ex);
		}
	},

	login: function() {
		dump("*** sipgateffx: login *** BEGIN ***\n");	

		if(this.isLoggedIn) {
			dump("*** sipgateffx: login *** ALREADY LOGGED IN ***\n");	
			return;
		}

		var result = function(ourParsedResponse, aXML) {
			if(ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
			
				_sgffx.setXulObjectVisibility('showcreditmenuitem', 1);
				_sgffx.setXulObjectVisibility('pollbalance', 1);
				_sgffx.setXulObjectVisibility('showvoicemailmenuitem', 1);
				_sgffx.setXulObjectVisibility('showphonebookmenuitem', 1);
				_sgffx.setXulObjectVisibility('showsmsformmenuitem', 1);
				_sgffx.setXulObjectVisibility('showhistorymenuitem', 1);
				_sgffx.setXulObjectVisibility('showfaxmenuitem', 1);
				_sgffx.setXulObjectVisibility('showshopmenuitem', 1);
				_sgffx.setXulObjectVisibility('showitemizedmenuitem', 1);
				_sgffx.setXulObjectVisibility('dialactivate', 1);
				_sgffx.setXulObjectVisibility('item_logoff', 1);
				_sgffx.setXulObjectVisibility('separator1', 1);
				_sgffx.setXulObjectVisibility('separator2', 1);
				_sgffx.setXulObjectVisibility('dialdeactivate', 1);
		
				_sgffx.setXulObjectVisibility('item_logon', 0);

				_sgffx.setXulObjectVisibility('sipgateffx_loggedout', 0);
				_sgffx.setXulObjectVisibility('sipgateffx_loggedin', 1);
				
				_sgffx.isLoggedIn = true;
				
				dump("*** NOW logged in ***\n");
				_sgffx.getRecommendedIntervals();
				_sgffx.getBalance();
			}
		};
		
		var request = bfXMLRPC.makeXML("system.serverInfo", [this.samuraiServer]);
		dump(request);
		
		this._rpcCall(request, result);
		dump("*** sipgateffx: login *** END ***\n");	
	},
  
	getRecommendedIntervals: function () {
		dump("*** sipgateffx: getRecommendedIntervals *** BEGIN ***\n");	
		if(!this.isLoggedIn) {
			dump("*** sipgateffx: getRecommendedIntervals *** USER NOT LOGGED IN ***\n");	
			return;
		}

		var result = function(ourParsedResponse, aXML) {
			if(ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				if(ourParsedResponse.IntervalList.length > 0) {
					for (var i = 0; i < ourParsedResponse.IntervalList.length; i++) {
						_sgffx.recommendedIntervals[ourParsedResponse.IntervalList[i].MethodName] = ourParsedResponse.IntervalList[i].RecommendedInterval;
						dump(ourParsedResponse.IntervalList[i].MethodName + " = ");
						dump(ourParsedResponse.IntervalList[i].RecommendedInterval + "\n");
					}
					if (_sgffx.getPref("extensions.sipgateffx.polling", "bool")) {
						// set update timer
						var delay = _sgffx.recommendedIntervals["samurai.RecommendedIntervalGet"];
					 
						_sgffx.getRecommendedIntervalsTimer.initWithCallback(
							{ notify: function(timer) { _sgffx.getRecommendedIntervals(); } },
							delay * 1000,
							Components.interfaces.nsITimer.TYPE_ONE_SHOT);
					
						dump("getRecommendedIntervals: polling enabled. set to " + delay + " seconds\n");
					}
				}
			}
		};

		var params = {'MethodList': ["samurai.RecommendedIntervalGet", "samurai.BalanceGet", "samurai.UmSummaryGet"]};

		var request = bfXMLRPC.makeXML("samurai.RecommendedIntervalGet", [this.samuraiServer, params]);
		dump(request + "\n");
		
		this._rpcCall(request, result);		
		dump("*** sipgateffx: ngetRecommendedIntervals *** END ***\n");	
	},

	getBalance: function() {
		dump("\n*** sipgateffx: getBalance *** BEGIN ***\n");	

		var result = function(ourParsedResponse, aXML) {
			if(ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {

				var balance = ourParsedResponse.CurrentBalance;
				var currency = balance.Currency;
				var balanceValueDouble = balance.TotalIncludingVat;
				
				var balanceValueString = balanceValueDouble;
				
				// dirty hack to localize floats:
				if (_sgffx.clientLang == "de") {
					// german floats use "," as delimiter for mantissa:
					balanceValueString = balanceValueDouble.toFixed(2).toString();
					balanceValueString = balanceValueString.replace(/\./,",");
				} else {
					balanceValueString = balanceValueDouble.toFixed(2).toString();
				}

				_sgffx.setXulObjectAttribute('BalanceText', "value", balanceValueString + " " + currency); 

				// display the balance value:
				if (balanceValueDouble < 5.0) { 
					_sgffx.setXulObjectAttribute('BalanceText', "style", "cursor: pointer; color: red;");
				} else {
					_sgffx.setXulObjectAttribute('BalanceText', "style", "cursor: pointer;");
				}
				
				if (_sgffx.getPref("extensions.sipgateffx.polling", "bool")) {
					// set update timer
					var delay = _sgffx.recommendedIntervals["samurai.BalanceGet"];
				 
					_sgffx.getBalanceTimer.initWithCallback(
						{ notify: function(timer) { _sgffx.getBalance(); } },
						delay * 1000,
						Components.interfaces.nsITimer.TYPE_ONE_SHOT);
					
					dump("getBalance: polling enabled. set to " + delay + " seconds\n");
				}

			}
		};

		var request = bfXMLRPC.makeXML("samurai.BalanceGet", [this.samuraiServer]);
		dump(request + "\n");
		
		this._rpcCall(request, result);

		dump("\n*** sipgateffx: getBalance *** END ***\n");	
	

	},
		
	_rpcCall: function(request, callbackResult, callbackError) {
	  		var user = this.username;
			var pass = this.password;
			
			if(user == null || pass == null) {
				var retVal = this.getSamuraiAuth();
				if(retVal.username == null || retVal.password == null) {
					dump("could not be authorized\n");
					return;
				}
								
				user = retVal.username;
				pass = retVal.password;			
			}
		  
			//PffXmlHttpReq( aUrl, aType, aContent, aDoAuthBool, aUser, aPass) 
			var theCall = new PffXmlHttpReq(this.samuraiServer, "POST", request, true, user, pass);
	
			theCall.onResult = function (aText, aXML) { 
				var re = /(\<\?\xml[0-9A-Za-z\D]*\?\>)/;
				var newstr = aText.replace(re, "");
	
				try {
					var e4xXMLObject = new XML(newstr);
				} catch (e) {
					alert("malformedXML");
					return;
				}
				
				if (e4xXMLObject.name() != 'methodResponse' ||
					!(e4xXMLObject.params.param.value.length() == 1 ||
					e4xXMLObject.fault.value.struct.length() == 1)) {
					if (aText != '') {
						alert("\nXML Response:"+aText);
					}
				}
				
				if (e4xXMLObject.params.param.value.length() == 1) {
					ourParsedResponse = bfXMLRPC.XMLToObject(e4xXMLObject.params.param.value.children()[0]);
				}
				
				if(e4xXMLObject.fault.children().length() > 0 ) {
					ourParsedResponse = bfXMLRPC.XMLToObject( e4xXMLObject.fault.value.children()[0]);
				}
				
				if(typeof(callbackResult) == 'function') {
					callbackResult(ourParsedResponse, aXML);
				} else  {
					alert("Good Result:" + aText);
					alert("Good Result:" + aXML);
				}
			};
			
			var errString = this.strings;
			
			theCall.onError = function (aStatusMsg, Msg) {
				var errorMessage = '';
	
				if(typeof(callbackError) == 'function') {
					callbackError(aStatusMsg, Msg);
					return;
				}
	
				switch (theCall.request.status) {
					case 401:
						errorMessage = "status.401";
					break;
					case 403:
						errorMessage = "status.403";
					break;
					case 404:
						errorMessage = "status.404";
					break;
					default:
						errorMessage = Msg;
					break;
				}
	
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
				promptService.alert(window, errString.getString("helloMessageTitle"),
											errString.getString(errorMessage));  
												
			};
			
			theCall.prepCall(); //Set up The call (open connection, etc.)
			theCall.request.setRequestHeader("Content-Type", "text/xml");
			theCall.makeCall(); //Make the call
			theCall.request.overrideMimeType ('text/xml');  
	  },

	setXulObjectReference: function(id, obj) {
		if(typeof(xulObjReference[id]) != 'object') {
			dump("xulObjReference to "+id+" not defined as Array\n");
			xulObjReference[id] = new Array();
		}
		xulObjReference[id].push(obj);
	},

	setXulObjectVisibility: function(id, visible, forced) {
		if(visible == 1) {
			this.setXulObjectAttribute(id, "hidden", "false", forced);
		} else {
			this.setXulObjectAttribute(id, "hidden", "true", forced);
		}
	},

	setXulObjectAttribute: function(id, attrib_name, new_value, forced) {
		if(typeof(xulObjReference[id]) == 'object') {
			var xulObj = xulObjReference[id];
			for(var k = 0; k < xulObj.length; k++)
			{
				if(attrib_name == "src") {
					xulObj[k] = xulObj[k].QueryInterface(Components.interfaces.nsIDOMXULImageElement);
				} else {
					xulObj[k] = xulObj[k].QueryInterface(Components.interfaces.nsIDOMXULElement);
				}
				dump("set attribute '" +attrib_name+ "' of '" +id+ "' to '" +new_value+ "'\n");
				xulObj[k].setAttribute(attrib_name, new_value);
			}
		} else {
			dump("No reference to XUL-Objects of "+id+"!\n");
		}
	},


	  
};
var components = [SipgateFFX];

function NSGetModule(compMgr, fileSpec) {
	return XPCOMUtils.generateModule(components);
}

