var debug = true;
var sgffx;

var url = {
	"history": "/user/calls.php",
	"credit": "/user/kontoaufladen.php",
	"voicemail": "/user/voicemail.php",
	"fax": "/user/fax/index.php",
	"phonebook": "/user/phonebook.php",
	"sms": "/user/sms/index.php",
	"shop": "/voipshop",
	"itemized": "/user/konto_einzel.php?show=all&timeperiod=simple&timeperiod_simpletimeperiod=",
	"default": "/user/index.php"
};
var urlSessionLogin = "https://secure.sipgate.de/user/slogin.php"; // safe default
var urlSessionLogout = "https://secure.sipgate.de/user/slogout.php"; // safe default
var urlSessionCheck = "https://secure.sipgate.de/user/status.php"; // safe default
var sipgateffx_this;

var sipgateffx = {
	onLoad: function() {
		// initialization code
		this.initialized = true;
		this.strings = document.getElementById("sipgateffx-strings");
		sipgateffx_this = this;
		
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
		
		sgffx.strings = this.strings;
		
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

			'BalanceText',
						
			'sipgateffx_c2dStatus',
			'sipgateffx_c2dStatusText'			
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
	
	login: function() {
		sgffx.login();
	},

	logoff: function() {
		sgffx.logoff();
	},

	showContextMenu: function(event) {
		// show or hide the menuitem based on what the context menu is on
		// see http://kb.mozillazine.org/Adding_items_to_menus
		document.getElementById("context-sipgateffx-sendassms").disabled = !gContextMenu.isTextSelected;
		
		// allow /,-,(,),.,whitespace and all numers in phonenumbers
		var browserSelection = getBrowserSelection().match(/^[\/\(\)\ \-\.\[\]\d]+$/);
		var niceNumber = '';

		if(browserSelection !== null) {
			niceNumber = sgffx.niceNumber(browserSelection, "49")
		}
		
		if(browserSelection == null || niceNumber.length <  7 ) {
			document.getElementById("context-sipgateffx-sendTo").disabled = true;
			document.getElementById("context-sipgateffx-callTo").disabled = true;
		} else {
			document.getElementById("context-sipgateffx-sendTo").disabled = false;
			document.getElementById("context-sipgateffx-sendTo").label = this.strings.getFormattedString("sipgateffxContextSendTo", [niceNumber]);
			document.getElementById("context-sipgateffx-callTo").disabled = false;
			document.getElementById("context-sipgateffx-callTo").label = this.strings.getFormattedString("sipgateffxContextCallTo", [niceNumber]);
		}
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
			
			selection = selection.replace(/^\s+/, "").replace(/\s+$/, "").replace(/\s+/g, " ");
		
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

	onMenuItemContextSendTo: function(e) {
		// allow /,-,(,),.,whitespace and all numers in phonenumbers
		var browserSelection = getBrowserSelection().match(/^[\/\(\)\ \-\.\[\]\d]+$/);
		var niceNumber = '';

		if(browserSelection !== null) {
			niceNumber = sgffx.niceNumber(browserSelection, "49")
		}
		
		window.openDialog('chrome://sipgateffx/content/sms.xul', 'sipgateSMS', 'chrome,centerscreen,resizable=yes,width=400,height=250,titlebar=yes,alwaysRaised=yes', '', '+'+niceNumber);
	},

	onMenuItemContextCallTo: function(e) {
		// allow /,-,(,),.,whitespace and all numers in phonenumbers
		var browserSelection = getBrowserSelection().match(/^[\/\(\)\ \-\.\[\]\d]+$/);
		var niceNumber = '';

		if(browserSelection !== null) {
			niceNumber = sgffx.niceNumber(browserSelection, "49")
		}
		
		sgffx.click2dial(niceNumber);
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
  
	onStatusbarCommand: function(action, param) {
		switch (action) {
			case 'showSitePage':
				if (!sgffx.isLoggedIn) {
					sgffx.log("*** sipgateffx: showSitePage *** USER NOT LOGGED IN ***");
					return;
				}		

				var protocol = 'https://';
				var httpServer = 'secure.live.sipgate.de';
				var siteURL = protocol + httpServer + url[param];
				
				if (param == "itemized") {
					var _date = new Date();
					var _year = _date.getYear() + 1900;
					var _month = _date.getMonth() + 1;
					if (_month < 10) {
						var _postfix = _year + "-0" + _month;
					} else {
						var _postfix = _year + "-" + _month;
					}
					siteURL = siteURL + _postfix;
				}

				var dataString = 'username='+sgffx.username+'&password='+sgffx.password;
				
				// POST method requests must wrap the encoded text in a MIME stream
				var stringStream = Components.classes["@mozilla.org/io/string-input-stream;1"].
				                   createInstance(Components.interfaces.nsIStringInputStream);
				stringStream.data = dataString;
				
				var postData = Components.classes["@mozilla.org/network/mime-input-stream;1"].
				               createInstance(Components.interfaces.nsIMIMEInputStream);
				postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
				postData.addContentLength = true;
				postData.setData(stringStream);
				
				var referrer = null;  
				var flags = Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE;  

				// open new tab or use already opened (by extension) tab:
				if ((typeof(gBrowser.selectedTab.id) != "undefined") && (gBrowser.selectedTab.id == "TabBySipgateFirefoxExtensionStatusbarShortcut")) {
					gBrowser.loadURIWithFlags(siteURL, flags, referrer, null, postData);  
				} else {
					var theTab = gBrowser.addTab(siteURL, referrer, null, postData);
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
				sgffx.getBalance();
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
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
				promptService.alert(window, this.strings.getString("helloMessageTitle"), text);
				break;
		}
		
	},
	
	echo: function(txt) {
		return txt;
	}
};
window.addEventListener("load", function(e) { sipgateffx.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx.onUnload(e); }, false); 
