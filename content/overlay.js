var debug = true;
var sgffx;

var url = {	"history" : "/user/calls.php",
			"credit" : "/user/kontoaufladen.php",
			"voicemail" : "/user/voicemail.php",
			"fax" : "/user/fax/index.php",
			"phonebook" : "/user/phonebook.php",
			"sms" : "/user/sms/index.php",
			"shop" : "/voipshop",
			"itemized" : "/user/konto_einzel.php?show=all&timeperiod=simple&timeperiod_simpletimeperiod=",
			"default" : "/user/index.php"
			};
var samuraiAuth = { 	"hostname" : "chrome://sipgateffx",
			"formSubmitURL" : null,
			"httprealm" : 'sipgate Account Login',
			"username" : '',
			"password" : ''
			};
var urlSessionLogin = "https://secure.sipgate.de/user/slogin.php"; // safe default
var urlSessionLogout = "https://secure.sipgate.de/user/slogout.php"; // safe default
var urlSessionCheck = "https://secure.sipgate.de/user/status.php"; // safe default
var samuraiServer = "https://samurai.sipgate.net/RPC2";
var isLoggedIn = false;
var recommendedIntervals = {"samurai.BalanceGet": 60
			};
var clientLang;
var sipgateffx_this;
			
var sipgateffx = {
	onLoad: function() {
		// initialization code
		this.initialized = true;
		this.strings = document.getElementById("sipgateffx-strings");
		sipgateffx_this = this;
		
		this.getBalanceTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);

		try {
			// this is needed to generally allow usage of components in javascript
			netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");

			sgffx = Components.classes['@api.sipgate.net/sipgateffx;1']
											.getService().wrappedJSObject;
			
		} catch (anError) {
			dump("ERROR: " + anError);
			return;
		}
		
		// set language:
		try { 
			if (navigator.language.match(/de/) == "de") {
				clientLang = "de";
			} else {
				clientLang = "en"; 
			}
		} catch (lang_ex) {
			dump("Error in detecting language! falling back to 'en' ...\n");
			clientLang = "en"; 
		}
		
		document.getElementById('showcreditmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showvoicemailmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showphonebookmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showsmsformmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showhistorymenuitem').setAttribute("hidden","true"); 
		document.getElementById('showfaxmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showshopmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showitemizedmenuitem').setAttribute("hidden","true"); 
		document.getElementById('dialactivate').setAttribute("hidden","true"); 
		document.getElementById('item_logoff').setAttribute("hidden","true"); 
		document.getElementById('separator1').setAttribute("hidden","true"); 
		document.getElementById('separator2').setAttribute("hidden","true"); 

		document.getElementById('dialdeactivate').setAttribute("hidden","true"); 
		
//		document.getElementById('item_logon').setAttribute("hidden","true"); 
		
		document.getElementById("contentAreaContextMenu")
			.addEventListener("popupshowing", function(e) { sipgateffx_this.showContextMenu(e); }, false);
		
		if(sgffx.getPref("extensions.sipgateffx.autologin","bool")) {
			this.login();
		}
	},

	onUnload: function() {
	},

	getBalance: function () {
		if(!this.isLoggedIn()) {
			return;
		}
		dump("\ngetBalance\n");	
		
		var request = bfXMLRPC.makeXML("samurai.BalanceGet", [samuraiServer]);
		dump(request + "\n");		
		
		var result = function(ourParsedResponse, aXML) {
			if(ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {

				var balance = ourParsedResponse.CurrentBalance;
				var currency = balance.Currency;
				var balanceValueDouble = balance.TotalIncludingVat;
				
				var balanceValueString = balanceValueDouble;
				
				// dirty hack to localize floats:
				if (clientLang == "de") {
					// german floats use "," as delimiter for mantissa:
					balanceValueString = balanceValueDouble.toFixed(2).toString();
					balanceValueString = balanceValueString.replace(/\./,",");
				} else {
					balanceValueString = balanceValueDouble.toFixed(2).toString();
				}

				document.getElementById('BalanceText').setAttribute("value", balanceValueString + " " + currency); 

				// display the balance value:
				if (balanceValueDouble < 5.0) { 
						document.getElementById('BalanceText').setAttribute("style", "cursor: pointer; color: red;");
				} else {
						document.getElementById('BalanceText').setAttribute("style", "cursor: pointer;");
				}
				
				if (sgffx.getPref("extensions.sipgateffx.polling", "bool")) {
						// set update timer
						var delay = recommendedIntervals["samurai.BalanceGet"];
					 
						sipgateffx_this.getBalanceTimer.initWithCallback(
							{ notify: function(timer) { sipgateffx_this.getBalance(); } },
							delay * 1000,
							Components.interfaces.nsITimer.TYPE_ONE_SHOT);
						
						dump("polling enabled. set to " + delay + " seconds\n");
				}

			}
		};
		
		this._rpcCall(request, result);			
	},
  
	getRecommendedIntervals: function () {
		if(!this.isLoggedIn()) {
			return;
		}
		dump("\ngetRecommendedIntervals\n");		
		var params = {'MethodList': ["samurai.RecommendedIntervalGet", "samurai.BalanceGet", "samurai.UmSummaryGet"]};

		var request = bfXMLRPC.makeXML("samurai.RecommendedIntervalGet", [samuraiServer, params]);
		dump(request + "\n");
		
		var result = function(ourParsedResponse, aXML) {
			if(ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				if(ourParsedResponse.IntervalList.length > 0) {
					for (var i = 0; i < ourParsedResponse.IntervalList.length; i++) {
						recommendedIntervals[ourParsedResponse.IntervalList[i].MethodName] = ourParsedResponse.IntervalList[i].RecommendedInterval;
						dump(ourParsedResponse.IntervalList[i].MethodName + " = ");
						dump(ourParsedResponse.IntervalList[i].RecommendedInterval + "\n");
					}
				}
			}
		};
		
		this._rpcCall(request, result);		
	},
  
	login: function() {
		if(this.isLoggedIn()) {
			return;
		}
		
		var request = bfXMLRPC.makeXML("system.serverInfo", [samuraiServer]); //, {'neu': 'irgendwas', 'alt': 'wasanderes'}]);
		dump(request);
		
		var result = function(ourParsedResponse, aXML) {
			if(ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
			
				document.getElementById('showcreditmenuitem').setAttribute("hidden","false"); 
				document.getElementById('showvoicemailmenuitem').setAttribute("hidden","false"); 
				document.getElementById('showphonebookmenuitem').setAttribute("hidden","false"); 
				document.getElementById('showsmsformmenuitem').setAttribute("hidden","false"); 
				document.getElementById('showhistorymenuitem').setAttribute("hidden","false"); 
				document.getElementById('showfaxmenuitem').setAttribute("hidden","false"); 
				document.getElementById('showshopmenuitem').setAttribute("hidden","false"); 
				document.getElementById('showitemizedmenuitem').setAttribute("hidden","false"); 
				document.getElementById('dialactivate').setAttribute("hidden","false"); 
				document.getElementById('item_logoff').setAttribute("hidden","false"); 
				document.getElementById('separator1').setAttribute("hidden","false"); 
				document.getElementById('separator2').setAttribute("hidden","false"); 
				
				document.getElementById('item_logon').setAttribute("hidden","true"); 			

				document.getElementById('sipgateffx_loggedout').setAttribute("hidden","true"); 			
				document.getElementById('sipgateffx_loggedin').setAttribute("hidden","false"); 			
				
				isLoggedIn = true;
				
				dump("\n*** NOW logged in ***\n");
				sipgateffx_this.getRecommendedIntervals();
				sipgateffx_this.getBalance();
			}
		};
		
		this._rpcCall(request, result);
	},

	logoff: function() {
		if(!this.isLoggedIn()) {
			return;
		}

		isLoggedIn = false;
		
		document.getElementById('showcreditmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showvoicemailmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showphonebookmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showsmsformmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showhistorymenuitem').setAttribute("hidden","true"); 
		document.getElementById('showfaxmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showshopmenuitem').setAttribute("hidden","true"); 
		document.getElementById('showitemizedmenuitem').setAttribute("hidden","true"); 
		document.getElementById('dialactivate').setAttribute("hidden","true"); 
		document.getElementById('dialdeactivate').setAttribute("hidden","true"); 
		document.getElementById('item_logoff').setAttribute("hidden","true"); 
		document.getElementById('separator1').setAttribute("hidden","true"); 
		document.getElementById('separator2').setAttribute("hidden","true"); 

		document.getElementById('sipgateffx_loggedout').setAttribute("hidden","false"); 
		document.getElementById('sipgateffx_loggedin').setAttribute("hidden","true"); 			
		
		document.getElementById('item_logon').setAttribute("hidden","false");
		dump("\n*** NOW logged off ***\n");		
	},
	
	isLoggedIn: function() {
		var val = isLoggedIn;
		dump("\n isLoggedIn: " + val + "\n");
		return val;
	},  
	
  _rpcCall: function(request, callbackResult, callbackError) {
  		var user = sgffx.username;
		var pass = sgffx.password;
		
		if(user == null || pass == null) {
			var retVal = sgffx.getSamuraiAuth();
			if(retVal.username == null || retVal.password == null) {
				dump("could not be authorized\n");
				return;
			}
			
			user = retVal.username;
			pass = retVal.password;			
		}
	  
		//PffXmlHttpReq( aUrl, aType, aContent, aDoAuthBool, aUser, aPass) 
		var theCall = new PffXmlHttpReq(samuraiServer, "POST", request, true, user, pass);

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
  
  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-sipgateffx").hidden = !gContextMenu.isTextSelected;
  },
  
  onMenuItemCommand: function(e) {
	// borrowed from http://mxr.mozilla.org/firefox/source/browser/base/content/browser.js#4683
	var focusedWindow = document.commandDispatcher.focusedWindow;
	var selection = focusedWindow.getSelection().toString();
	var charLen = 160;

	if (selection) {
		if (selection.length > charLen) {
			// only use the first charLen important chars. see bug 221361
			var pattern = new RegExp("^(?:\\s*.){0," + charLen + "}");
			pattern.test(selection);
			selection = RegExp.lastMatch;
		}

		selection = selection.replace(/^\s+/, "")
						  .replace(/\s+$/, "")
						  .replace(/\s+/g, " ");

		if (selection.length > charLen)
			selection = selection.substr(0, charLen);
	}
   
	window.openDialog('chrome://sipgateffx/content/sms.xul', 'sipgateSMS', 'chrome,centerscreen,resizable=yes,width=400,height=250,titlebar=yes,alwaysRaised=yes', selection);
	/*
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
	*/
  },
  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    sipgateffx.onMenuItemCommand(e);
  }, 
  
	websiteSessionValid: function() {
		var oHttpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
																 .getService(Components.interfaces.nsIJSXMLHttpRequest);
		oHttpRequest.open("GET",urlSessionCheck,false);
		oHttpRequest.send(null);
		dump(oHttpRequest.responseText);
		if (oHttpRequest.responseText.match(/^true$/)) {
			return true;
		} else {
			return false;
		}
	},	
	
	websiteSessionLogin: function() {
		var user = sgffx.getPref("extensions.sipgateffx.username", "char");
		dump(user);
		var pass = sgffx.getPref("extensions.sipgateffx.password", "char");
		dump(pass);

		var oHttpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
																 .getService(Components.interfaces.nsIJSXMLHttpRequest);
		oHttpRequest.open("POST",urlSessionLogin,false);
		oHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		oHttpRequest.send("username="+user+"&password="+pass);
		this.setAuthData(user, pass);
		var result = oHttpRequest.responseText.match(/\d\d\d/).toString();
		dump(result);
		
		return result;
		
	},
	
	setAuthData: function(user, pass) {
		var oldAuthData = this.getAuthData();
		if ("@mozilla.org/passwordmanager;1" in Components.classes) {
			// Password Manager exists so this is not Firefox 3 (could be Firefox 2, Netscape, SeaMonkey, etc).
			var oPwManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
			if (oldAuthData != null) {
				oPwManager.removeUser("sipgateFFX",oldAuthData.user);
			}
			if (user && pass && user != "") {
				oPwManager.addUser("sipgateFFX",user,pass);
			}
		}
		else if ("@mozilla.org/login-manager;1" in Components.classes) {
			var passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
								
			var hostname = 'http://www.sipgate.de';
			var formSubmitURL = 'https://secure.sipgate.de';
			var httprealm = null;

			if (oldAuthData != null) {
				try {
				   // Get Login Manager 
				   var passwordManager = Components.classes["@mozilla.org/login-manager;1"]
										 .getService(Components.interfaces.nsILoginManager);
				 
				   // Find users for this extension 
				   var logins = passwordManager.findLogins({}, hostname, formSubmitURL, httprealm);
					  
				   for (var i = 0; i < logins.length; i++) {
					  if (logins[i].username == oldAuthData.user) {
						 passwordManager.removeLogin(logins[i]);
						 break;
					  }
				   }
				}
				catch(ex) {
				   // This will only happen if there is no nsILoginManager component class
				   dump(ex);
				}
			}
			if (user && pass && user != "") {
				dump(user);
				dump(pass);
				try {
					var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
																 Components.interfaces.nsILoginInfo,
																 "init");
						  
					var loginInfo = new nsLoginInfo(hostname, formSubmitURL, httprealm, user, pass, 'uname', 'passw');
					passwordManager.addLogin(loginInfo);
				} catch(ex) {
				   // This will only happen if there is no nsILoginManager component class
				   dump(ex);
				}
			}			
		}

	},
	
	getAuthData: function() {
		if ("@mozilla.org/login-manager;1" in Components.classes) {
			var passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
  
			var hostname = 'http://www.sipgate.de';
			var formSubmitURL = 'https://secure.sipgate.de';
			var httprealm = null;
			
			var passwords = passwordManager.findLogins({}, hostname, formSubmitURL, httprealm);
			if (passwords.length > 0) {
			  for (var i = 0; i < passwords.length; i++) {
				user = passwords[i].username;
				password = passwords[i].password;

				// XXX: why not call the service here to get password?
				if (password === " ") {
				  // XXX: empty password is " " for now due to ff3 change
				  password = "";
				}

				return({'user': user, 'pass': password});
			  }
			} else {
				dump("getting userauth from nsILoginManager failed!");
				return null;			
			}
						
		} else {
			var oPwManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
				
			// ask the password manager for an enumerator:
			var e = oPwManager.enumerator;
			// step through each password in the password manager until we find the one we want:
			while (e.hasMoreElements()) {
				try {
				  // get an nsIPassword object out of the password manager.
					var pass = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
					if (pass.host == "sipgateFFX") {
						// found it!
						return(pass);
					}
				} catch (ex) {
				// do something if decrypting the password failed
					dump("getting userauth from passwordmanager failed! error:"+ex);
					return null;
				}
			}
			
		}
		// no aut-data found, so we switch to "not logged in state" to remain safe if needed:
		dump("no userauth for 'sipgateFFX' found in passwordmanager!");
		return null;
	},
	
  onStatusbarCommand: function(action, param) {
	switch(action) {
		case 'showSitePage':
				dump(param + "\n");
				
				if (!this.websiteSessionValid()) {
					this.websiteSessionLogin();
				}		
				
				var protocol = 'http://';
				var httpServer = 'www.sipgate.de';
				var siteURL = protocol + httpServer + url[param];
				
				if (param == "itemized") {
					var _date = new Date();
					var _year = _date.getYear() + 1900;
					var _month = _date.getMonth() + 1;
					if (_month < 10) {
						var _postfix = _year+"-0"+_month;
					} else {
						var _postfix = _year+"-"+_month;
					}
					siteURL = siteURL + _postfix;
				}
				
				// open new tab or use already opened (by extension) tab:
				if ((typeof(gBrowser.selectedTab.id) != "undefined") && (gBrowser.selectedTab.id == "TabBySipgateFirefoxExtensionStatusbarShortcut")) {
					gBrowser.loadURI(siteURL);	
				} else {
					var theTab = gBrowser.addTab(siteURL); 
					gBrowser.selectedTab = theTab;
					theTab.id = "TabBySipgateFirefoxExtensionStatusbarShortcut";
				}				
				break;
		
		case 'openPrefs':
				window.open('chrome://sipgateffx/content/options.xul', 'sipgatePrefs', 'chrome,centerscreen,resizable=no,titlebar=yes,dependent=no');
				break;
				
		case 'sendSMS':
				window.open('chrome://sipgateffx/content/sms.xul', 'sipgateSMS', 'chrome,centerscreen,resizable=yes,width=400,height=250,titlebar=yes,alwaysRaised=yes');
				break;
				
		case 'pollBalance':
				this.login();
				break;
								
		case 'logon':
				this.login();
				break;
												
		case 'logoff':
				this.logoff();
				break;
				
		default:
				var text = "action: " + action + "\nparams: " + param + "\n";
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
											  .getService(Components.interfaces.nsIPromptService);
				promptService.alert(window, this.strings.getString("helloMessageTitle"),
											text);  
				break;
	}
  },
  
  echo: function(txt) {
	  return txt;
  }
  
};
window.addEventListener("load", function(e) { sipgateffx.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx.onUnload(e); }, false); 