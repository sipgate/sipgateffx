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

var debug = true;
var sgffx;

var url = {
    "history": "/",
    "credit": "/settings/account/creditaccount",
    "voicemail": "/",
    "fax": "/fax",
    "phonebook": "/contacts",
    "itemized": "/settings/account/evn",
    "default": "/user/index.php"
};
var sipgateffx_this;

var sipgateffx = {
	onLoad: function(event) {
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
			sgffx.log("Error in detecting language! Found: "+navigator.language.match(/de/)+". Falling back to 'en' ...\n");
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
			'sipgateffx_c2dStatusText',			
			'sipgatecmd_c2dCancellCall',
			
			'sipgatenotificationPanel'
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
		sgffx.setXulObjectVisibility('item_logoff', 0);
		sgffx.setXulObjectVisibility('separator1', 0);
		sgffx.setXulObjectVisibility('separator2', 1);
		
		sgffx.setXulObjectVisibility('dialdeactivate', 0);
		sgffx.setXulObjectVisibility('dialactivate', 0);
		
		// sgffx.setXulObjectVisibility('sipgate-c2d-status-bar', 1);

		document.getElementById("contentAreaContextMenu")
			.addEventListener("popupshowing", function(e) { sipgateffx_this.showContextMenu(e); }, false);
			
		if(sgffx.getPref("extensions.sipgateffx.autologin","bool")) {
			this.login();
		}
		
		gBrowser.addEventListener("DOMContentLoaded", this.parseClick2Dial, false);
	},

	onUnload: function() {
	},
	
	login: function() {
		var retVal = sgffx.getSamuraiAuth();
		if (retVal.username == null || retVal.password == null) {
			window.openDialog('chrome://sipgateffx/content/options.xul', '');
			return;
		}
		
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
	
		window.openDialog('chrome://sipgateffx/content/sms.xul', 'sipgateSMS', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes', selection);
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
	
	onMenuItemContextCallCancel: function(e) {
		sgffx.cancelClick2Dial();
	},

	parseClick2Dial: function() {
		if (sgffx.getPref("extensions.sipgateffx.parsenumbers", "bool")) {
			sipgateffxPageLoaded();
		}
	},
	
	toggleClick2Dial: function() {
		sipgateffxPageLoaded();
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
				promptService.alert(window, 'No Target', text);
				break;
		}
		
	},
	
	echo: function(txt) {
		return txt;
	},
	
	$: function(name) {
		return document.getElementById(name);
	}
	
};
window.addEventListener("load", function(e) { sipgateffx.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx.onUnload(e); }, false); 
