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
				sgffx.language = "de";
			} else {
				sgffx.language = "en"; 
			}
		} catch (lang_ex) {
			dump("Error in detecting language! Found: "+navigator.language.match(/de/)+". Falling back to 'en' ...\n");
			sgffx.language = "en"; 
		}
		
		var allElements = [
			'showcreditmenuitem',
			'pollbalance',
			'showvoicemailmenuitem',
			'showphonebookmenuitem',
			'showsmsformmenuitem',
			'showhistorymenuitem',
			'showfaxmenuitem',
			'showshopmenuitem',
			'showitemizedmenuitem',
			'dialactivate',
			'item_logoff',
			'separator1',
			'separator2',
			'dialdeactivate',
			'item_logon',

			'sipgateffx_loggedout',
			'sipgateffx_loggedin',

			'BalanceText'
		];

		for(var i = 0; i < allElements.length; i++)
		{
			sgffx.setXulObjectReference(allElements[i], document.getElementById(allElements[i]));
		}

		sgffx.setXulObjectVisibility('showcreditmenuitem', 0);
		sgffx.setXulObjectVisibility('pollbalance', 0);
		sgffx.setXulObjectVisibility('showvoicemailmenuitem', 0);
		sgffx.setXulObjectVisibility('showphonebookmenuitem', 0);
		sgffx.setXulObjectVisibility('showsmsformmenuitem', 0);
		sgffx.setXulObjectVisibility('showhistorymenuitem', 0);
		sgffx.setXulObjectVisibility('showfaxmenuitem', 0);
		sgffx.setXulObjectVisibility('showshopmenuitem', 0);
		sgffx.setXulObjectVisibility('showitemizedmenuitem', 0);
		sgffx.setXulObjectVisibility('dialactivate', 0);
		sgffx.setXulObjectVisibility('item_logoff', 0);
		sgffx.setXulObjectVisibility('separator1', 0);
		sgffx.setXulObjectVisibility('separator2', 0);
		sgffx.setXulObjectVisibility('dialdeactivate', 0);
		
		sgffx.setXulObjectVisibility('item_logon', 1);

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

		sgffx.getBalance();
return;
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
		
		sgffx._rpcCall(request, result);			
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
		
		sgffx._rpcCall(request, result);		
	},
  
	login: function() {
		sgffx.login();
return;
		if(this.isLoggedIn()) {
			return;
		}
		
		var request = bfXMLRPC.makeXML("system.serverInfo", [samuraiServer]); //, {'neu': 'irgendwas', 'alt': 'wasanderes'}]);
		dump(request);
		
		var result = function(ourParsedResponse, aXML) {
			if(ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
			
				sgffx.setXulObjectVisibility('showcreditmenuitem', 1);
				sgffx.setXulObjectVisibility('pollbalance', 1);
				sgffx.setXulObjectVisibility('showvoicemailmenuitem', 1);
				sgffx.setXulObjectVisibility('showphonebookmenuitem', 1);
				sgffx.setXulObjectVisibility('showsmsformmenuitem', 1);
				sgffx.setXulObjectVisibility('showhistorymenuitem', 1);
				sgffx.setXulObjectVisibility('showfaxmenuitem', 1);
				sgffx.setXulObjectVisibility('showshopmenuitem', 1);
				sgffx.setXulObjectVisibility('showitemizedmenuitem', 1);
				sgffx.setXulObjectVisibility('dialactivate', 1);
				sgffx.setXulObjectVisibility('item_logoff', 1);
				sgffx.setXulObjectVisibility('separator1', 1);
				sgffx.setXulObjectVisibility('separator2', 1);
				sgffx.setXulObjectVisibility('dialdeactivate', 1);
		
				sgffx.setXulObjectVisibility('item_logon', 0);

				sgffx.setXulObjectVisibility('sipgateffx_loggedout', 0);
				sgffx.setXulObjectVisibility('sipgateffx_loggedin', 1);
				
				isLoggedIn = true;
				
				dump("\n*** NOW logged in ***\n");
				sipgateffx_this.getRecommendedIntervals();
				sipgateffx_this.getBalance();
			}
		};
		
		sgffx._rpcCall(request, result);
	},

	logoff: function() {
		if(!this.isLoggedIn()) {
			return;
		}

		isLoggedIn = false;
		
		sgffx.setXulObjectVisibility('showcreditmenuitem', 0);
		sgffx.setXulObjectVisibility('pollbalance', 0);
		sgffx.setXulObjectVisibility('showvoicemailmenuitem', 0);
		sgffx.setXulObjectVisibility('showphonebookmenuitem', 0);
		sgffx.setXulObjectVisibility('showsmsformmenuitem', 0);
		sgffx.setXulObjectVisibility('showhistorymenuitem', 0);
		sgffx.setXulObjectVisibility('showfaxmenuitem', 0);
		sgffx.setXulObjectVisibility('showshopmenuitem', 0);
		sgffx.setXulObjectVisibility('showitemizedmenuitem', 0);
		sgffx.setXulObjectVisibility('dialactivate', 0);
		sgffx.setXulObjectVisibility('item_logoff', 0);
		sgffx.setXulObjectVisibility('separator1', 0);
		sgffx.setXulObjectVisibility('separator2', 0);
		sgffx.setXulObjectVisibility('dialdeactivate', 0);
		
		sgffx.setXulObjectVisibility('item_logon', 1);

		sgffx.setXulObjectVisibility('sipgateffx_loggedout', 1);
		sgffx.setXulObjectVisibility('sipgateffx_loggedin', 0);
		
		dump("\n*** NOW logged off ***\n");		
	},
	
	isLoggedIn: function() {
		var val = isLoggedIn;
		dump("\n isLoggedIn: " + val + "\n");
		return val;
	},  
  
  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-sipgateffx").hidden = !gContextMenu.isTextSelected;
  },
  
  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    sipgateffx.onMenuItemCommand(e);
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

	toggleClick2Dial: function() {
		const tagsOfInterest = [ "a", "abbr", "acronym", "address", "applet", "b", "bdo", "big", "blockquote", "body", "caption",
        "center", "cite", "code", "dd", "del", "div", "dfn", "dt", "em", "fieldset", "font", "form", "h1", "h2", "h3",
        "h4", "h5", "h6", "i", "iframe", "ins", "kdb", "li", "object", "pre", "p", "q", "samp", "small", "span",
        "strike", "s", "strong", "sub", "sup", "td", "th", "tt", "u", "var" ];

		var xpath = "//text()[(parent::" + tagsOfInterest.join(" or parent::") + ")]";
		var candidates = content.document.evaluate(xpath, content.document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
		var numberRegex = /(^|[\s])((\+[1-9]\d)|(00[1-9]\d)|(0[^0]|([(\[][ \t\f]*[\d \t\f]+[ \t\f]*[)\]])))((((([ \t\f]*[(\[][ \t\f]*[\d \t\f]+[)\]][ \t\f]*)|([\d \t\f]{1,}[\.]?)))|(\(\d{3,}\)))[/]?(([ \t\f]*[\[(][\-\d \t\f]{3,}[\])][ \t\f]*)|([\-\d \t\f]{3,}))+)|(\+[1-9][\.\d]{4,})([\s]|$)/;
	
		for ( var cand = null, i = 0; (cand = candidates.snapshotItem(i)); i++)
		{		
			var nodeText = cand.nodeValue;
			nodeText = nodeText.replace(/^\s+|\s+$|[\xC2-\xFF]*/g, '');
			if (nodeText.match(numberRegex) != null) {
				var numberText = numberRegex.exec(cand.nodeValue)[0];
				var formatednumberText = numberText.replace(/\D/g, '');
				dump(nodeText + " -- \n");
			
				var newNodeClick2DialIcon = document.createElement("A");
				newNodeClick2DialIcon.style.border = "1px solid #000000";
				newNodeClick2DialIcon.style.margin = "0px 5px 0px 0px";
				newNodeClick2DialIcon.setAttribute('href', "tel:" + formatednumberText);
				newNodeClick2DialIcon.setAttribute('title', "sipgate Click2Dial");
				newNodeClick2DialIcon.appendChild(document.createTextNode(numberText));

				cand.parentNode.replaceChild(newNodeClick2DialIcon, cand);
				dump(nodeText + "\n");
			}
		}

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
				
		case 'toggleClick2Dial':
				this.toggleClick2Dial();
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
