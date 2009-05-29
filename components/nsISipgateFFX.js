Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function SipgateFFX() {
	this.wrappedJSObject = this;
	this.samuraiAuth = {"hostname" : "chrome://sipgateffx",
			"formSubmitURL" : null,
			"httprealm" : 'sipgate Account Login',
			"username" : '',
			"password" : ''
			};	
}

SipgateFFX.prototype = {
  classDescription: "sipgateFFX javascript XPCOM Component",
  classID:          Components.ID("{BCC44C3C-B5E8-4566-8556-0D9230C7B4F9}"),
  contractID:       "@api.sipgate.net/sipgateffx;1",
  QueryInterface: XPCOMUtils.generateQI(), //[Components.interfaces.nsISipgateFFX]),
  
	getSamuraiAuth: function() {
		// Login Manager exists so this is Firefox 3
		var passwordManager = Components.classes["@mozilla.org/login-manager;1"]
					.getService(Components.interfaces.nsILoginManager);
		
		// Find users for the given parameters
		var logins = passwordManager.findLogins({}, this.samuraiAuth.hostname, this.samuraiAuth.formSubmitURL, this.samuraiAuth.httprealm);
		
		var username = null;
		var password = null;
		
		// Find user from returned array of nsILoginInfo objects
		dump("Found passwords count: " + logins.length + "\n");
		for (var i = 0; i < logins.length; i++) {
			username = logins[i].username;
			password = logins[i].password;
			// dump(logins[i].username + "\n");
			// dump(logins[i].password + "\n");
			break;
		}
		
		this.samuraiAuth.username = username;
		this.samuraiAuth.password = password;
		return {'username': username, 'password': password};
	},
	
	setSamuraiAuth: function(username, password) {
		try {
		   // Get Login Manager 
		   var passwordManager = Components.classes["@mozilla.org/login-manager;1"]
								 .getService(Components.interfaces.nsILoginManager);
		 
		   // Find users for this extension 
		   var logins = passwordManager.findLogins({}, this.samuraiAuth.hostname, this.samuraiAuth.formSubmitURL, this.samuraiAuth.httprealm);
			  
		   dump("Found passwords count: " + logins.length + "\n");
		   for (var i = 0; i < logins.length; i++) {
			passwordManager.removeLogin(logins[i]);
		   }
		   
		   var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
							     Components.interfaces.nsILoginInfo,
							     "init");
	
		   var loginInfo = new nsLoginInfo(this.samuraiAuth.hostname, this.samuraiAuth.formSubmitURL, this.samuraiAuth.httprealm, username, password, "", "");
		   passwordManager.addLogin(loginInfo);	
		   
		}
		catch(ex) {
		   // This will only happen if there is no nsILoginManager component class
		   dump(ex);
		}		
	}
	
};
var components = [SipgateFFX];

function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule(components);
}

