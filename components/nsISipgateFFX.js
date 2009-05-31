Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://sipgateffx/xmlrpc.js");

function SipgateFFX() {
	this.wrappedJSObject = this;
	this.samuraiAuth = {
		"hostname": "chrome://sipgateffx",
		"formSubmitURL": null,
		"httprealm": 'sipgate Account Login',
		"username": null,
		"password": null
	};
	this.samuraiServer = "https://samurai.sipgate.net/RPC2";
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
	  }
	  
};
var components = [SipgateFFX];

function NSGetModule(compMgr, fileSpec) {
	return XPCOMUtils.generateModule(components);
}

