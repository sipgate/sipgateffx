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
var sipgateffx = {
	component: null,
	componentDB: null,
	
	browserRef: null,
		
	url: {
			'team': {
			    "history": "/#filter_inbox",
			    "historycall": "/#type_call",
			    "historyfax": "/#type_fax",
			    "historysms": "/#type_sms",
			    "credit": "/settings/account/creditaccount",
			    "voicemail": "/#type_voicemail",
			    "fax": "/fax",
			    "phonebook": "/contacts",
			    "itemized": "/settings/account/evn",
			    "default": "/"
			},
			'classic': {
			    "history": "/user/calls.php",
			    "credit": "/user/kontoaufladen.php",
			    "voicemail": "/user/voicemail.php",
			    "fax": "/user/fax/index.php",
			    "phonebook": "/user/phonebook.php",
			    "itemized": "/user/konto_einzel.php?show=all",
			    "default": "/user/index.php"
			}
	},
		
	onLoad: function(event) {
		// initialization code
		this.initialized = true;
		this.strings = document.getElementById("sipgateffx-strings");
		sipgateffx = this;

		try {
			sipgateffx.component = Components.classes['@api.sipgate.net/sipgateffx;1'].getService().wrappedJSObject;
		} 
		catch (anError) {
			dump("ERROR: " + anError);
			return;
		}

		try {
			sipgateffx.componentDB = Components.classes['@api.sipgate.net/sipgateffx-storage;1'].getService().wrappedJSObject;
		} catch(e) {
			dump("ERROR while initializing DB: " + e);
			return;
		}			

		sipgateffx.component.init(this.detectVersionChange);
		sipgateffx.componentDB.openDatabase();
		
		// set language:
		this.detectClientLanguage();		
		sipgateffx.component.strings = this.strings;
		
		this.announceWindowElementsToComponent();		
		this.setInitialVisibility();
		
		var contextMenuHolder = "contentAreaContextMenu";
		if(sipgateffx.component.application == 'thunderbird') {
			contextMenuHolder = "mailContext";
		}

		document.getElementById(contextMenuHolder)
			.addEventListener("popupshowing", function(e) { sipgateffx.showContextMenu(e); }, false);
		
		document.getElementById('sipgateLogo').addEventListener("click", function(e) {
			// more Info: https://developer.mozilla.org/en/XUL%3aMethod%3aopenPopup
			document.getElementById('sipgatemenu').openPopup( document.getElementById('sipgateffx_loggedin'), "before_end", 0, 0, true);
		}, false);

		document.getElementById('sipgateLogoOff').addEventListener("click", function(e) {
			// more Info: https://developer.mozilla.org/en/XUL%3aMethod%3aopenPopup
			document.getElementById('sipgatemenu').openPopup( document.getElementById('sipgateffx_loggedout'), "before_end", 0, 0, true);
		}, false);

		this.addEventsClickBinding();
			
		if(sipgateffx.component.getPref("extensions.sipgateffx.autologin","bool")) {
			setTimeout(this.login);
		}
		
		this.browserRef = gBrowser;
		
		if(sipgateffx.component.application == 'thunderbird') {
			var threePane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");
			this.browserRef = threePane.document.getElementById("messagepane");
		}
		
		this.browserRef.addEventListener("DOMContentLoaded", this.parseClick2Dial, false);
		this.browserRef.addEventListener("DOMFrameContentLoaded", this.parseClick2DialFrame, false);
		sipgateffx_highlightNumber._prepareArray();
		
		if(sipgateffx.component.application != 'thunderbird') {
			this.browserRef.tabContainer.addEventListener("select", function(e) {
				try {
					var host = content.document.location.host.toLowerCase();
					if(sipgateffx.componentDB.isBlacklisted(host)) {
						document.getElementById("sipgateffxC2DBlacklistOn").hidden = true;
						document.getElementById("sipgateffxC2DBlacklistOff").hidden = false;
						return;
					} else {
						document.getElementById("sipgateffxC2DBlacklistOn").hidden = false;
						document.getElementById("sipgateffxC2DBlacklistOff").hidden = true;
					}
				} catch(e) {
					//
				}		
			}, false);
		}
	},

	onUnload: function() {

		sipgateffx.component.log('unload overlay');

		var allElements = [
			'sipgateffx_showcreditmenuitem',
			'sipgateffx_pollbalance',
			'sipgateffx_showvoicemailmenuitem',
			'sipgateffx_showphonebookmenuitem',
			'sipgateffx_showsmsformmenuitem',
			'sipgateffx_showphonenumberformmenuitem',
			'sipgateffx_showhistorymenuitem',
			'sipgateffx_showfaxmenuitem',
			'sipgateffx_sendfaxpdfmenuitem',
			'sipgateffx_showitemizedmenuitem',
			'sipgateffx_dialactivate',
			'sipgateffx_item_logoff',
			'sipgateffx_separator1',
			'sipgateffx_separator2',
			'sipgateffx_dialdeactivate',
			'sipgateffx_item_logon',

			'sipgateffx_loggedout',
			'sipgateffx_loggedin',

			'sipgateffx_BalanceText',

			'sipgateffx_c2dStatus',
			'sipgateffx_c2dStatusText',			
			'sipgatecmd_c2dCancellCall',
			
			'sipgatenotificationPanel',
			
			'sipgateffxEventsCall',
			'sipgateffxEventsFax',
			'sipgateffxEventsSMS'
		];

		sipgateffx.component.log('closing window, removing references to elements');
		for(var i = 0; i < allElements.length; i++)
		{
			sipgateffx.component.removeXulObjRef(allElements[i], document.getElementById(allElements[i]));
		}
		
	},
	
	detectClientLanguage: function detectClientLanguage() {
		try { 
			var client_language = sipgateffx.component.getPref("general.useragent.locale", "char");
			if (client_language.match(/de/) == "de") {
				sipgateffx.component.language = "de";
			} else {
				sipgateffx.component.language = "en"; 
			}
		} catch (lang_ex) {
			sipgateffx.component.log("Error in detecting language! Found: "+navigator.language.match(/de/)+". Falling back to 'en' ...\n");
			sipgateffx.component.language = "en"; 
		}
	},
	
	announceWindowElementsToComponent: function announceWindowElementsToComponent() {
		var allElements = [
		       			'sipgateffx-toolbar-button',
		       			'sipgateContacts',
		       			'sipgateffx_showcreditmenuitem',
		       			'sipgateffx_pollbalance',
		       			'sipgateffx_showvoicemailmenuitem',
		       			'sipgateffx_showphonebookmenuitem',
		       			'sipgateffx_showsmsformmenuitem',
		       			'sipgateffx_showphonenumberformmenuitem',
		       			'sipgateffx_showhistorymenuitem',
		       			'sipgateffx_showfaxmenuitem',
		       			'sipgateffx_sendfaxpdfmenuitem',
		       			'sipgateffx_showitemizedmenuitem',
		       			'sipgateffx_dialactivate',
		       			'sipgateffx_item_logoff',
		       			'sipgateffx_separator1',
		       			'sipgateffx_separator2',
		       			'sipgateffx_dialdeactivate',
		       			'sipgateffx_item_logon',

		       			'sipgateffx_loggedout',
		       			'sipgateffx_loggedin',

		       			'sipgateffx_BalanceText',

		       			'sipgateffx_c2dStatus',
		       			'sipgateffx_c2dStatusText',			
		       			'sipgatecmd_c2dCancellCall',
		       			
		       			'sipgatenotificationPanel',
		       			
		       			'sipgateffxDND',
		       			'sipgateffxDNDon',
		       			'sipgateffxDNDoff',
		       			
		       			'sipgateffxEventsCall',
		       			'sipgateffxEventsFax',
		       			'sipgateffxEventsSMS'
		       		];

   		for(var i = 0; i < allElements.length; i++)
   		{
   			sipgateffx.component.setXulObjectReference(allElements[i], document.getElementById(allElements[i]));
   		}
		
	},
	
	setInitialVisibility: function setInitialVisibility() {
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showcreditmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_pollbalance', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showvoicemailmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showphonebookmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showsmsformmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showphonenumberformmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showhistorymenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showfaxmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_sendfaxpdfmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_showitemizedmenuitem', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_item_logoff', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_separator1', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_separator2', 1);
		
		sipgateffx.component.setXulObjectVisibility('sipgateffx_dialdeactivate', 0);
		sipgateffx.component.setXulObjectVisibility('sipgateffx_dialactivate', 0);
		
		// sipgateffx.component.setXulObjectVisibility('sipgate-c2d-status-bar', 1);
	},

	addEventsClickBinding: function addEventsClickBinding() {
		document.getElementById('sipgateffxEventsCall').addEventListener("click", function(e){
			if (e.button != 0) 
				return;
			sipgateffx.onStatusbarCommand('showSitePage', 'historycall');
		}, false);
		
		document.getElementById('sipgateffxEventsFax').addEventListener("click", function(e){
			if (e.button != 0) 
				return;
			sipgateffx.onStatusbarCommand('showSitePage', 'historyfax');
		}, false);
		
		document.getElementById('sipgateffxEventsSMS').addEventListener("click", function(e){
			if (e.button != 0) 
				return;
			sipgateffx.onStatusbarCommand('showSitePage', 'historysms');
		}, false);	
	},

	detectVersionChange: function() {
		try {
			if (sipgateffx.component.version != null && sipgateffx.component.version != "UNKNOWN" && sipgateffx.component.version != "NOTYETKNOWN" && sipgateffx.component.version != sipgateffx.component.getPref("extensions.sipgateffx.lastInstalledVersion", "char")) {
				sipgateffx.showUpdateInfo();
				sipgateffx.addToolbarIcon();
				sipgateffx.component.setPref("extensions.sipgateffx.lastInstalledVersion", sipgateffx.component.version, "char");
			}
		} catch(e) {
			sipgateffx.component.log('detectVersionChange ERROR: ' + e);
		}
	},
	
	showUpdateInfo: function() {
		var siteURL = 'chrome://sipgateffx/content/firststart/welcome_'+sipgateffx.component.language+'.html';
		try {
			sipgateffx.browserRef.selectedTab = sipgateffx.browserRef.addTab(siteURL);
		} catch(e) {
			window.open(siteURL,"What's new?","chrome,centerscreen,height=400px,width=820px"); 
		}
	},
	
	login: function() {
		var retVal = sipgateffx.component.getSamuraiAuth();
		if (retVal.username == null || retVal.password == null) {
			window.openDialog('chrome://sipgateffx/content/options.xul', 'sipgatePrefs');
			return;
		}
		
		if (!sipgateffx.component.loggedOutByUser) {
			sipgateffx.component.login();
		}
	},

	logoff: function() {
		sipgateffx.component.logoff();
	},

	showContextMenu: function(event) {
		// show or hide the menuitem based on what the context menu is on
		// see http://kb.mozillazine.org/Adding_items_to_menus
		document.getElementById("context-sipgateffx-sendassms").disabled = !(gContextMenu.isTextSelected || gContextMenu.isContentSelected);
		
		// allow /,-,(,),.,whitespace and all numers in phonenumbers
		var browserSelection = this.getBrowserSelection().match(/^[^a-zA-Z]+$/);
		var niceNumber = '';
		
		if (browserSelection !== null) {
			niceNumber = sipgateffx.component.niceNumber(browserSelection);
		}
		
		if (browserSelection == null || niceNumber.length < 7) {
			document.getElementById("context-sipgateffx-sendTo").disabled = true;
			document.getElementById("context-sipgateffx-callTo").disabled = true;
		}
		else {
			document.getElementById("context-sipgateffx-sendTo").disabled = false;
			document.getElementById("context-sipgateffx-sendTo").label = this.strings.getFormattedString("sipgateffxContextSendTo", [niceNumber]);
			document.getElementById("context-sipgateffx-sendTo").number = niceNumber;
			document.getElementById("context-sipgateffx-callTo").disabled = false;
			document.getElementById("context-sipgateffx-callTo").label = this.strings.getFormattedString("sipgateffxContextCallTo", [niceNumber]);
			document.getElementById("context-sipgateffx-callTo").number = niceNumber;
		}
		
		try {
			var host = content.document.location.host.toLowerCase();;
			if(sipgateffx.componentDB.isBlacklisted(host)) {
				document.getElementById("context-sipgateffx-c2dblacklistEn").hidden = false;
				document.getElementById("context-sipgateffx-c2dblacklistDis").hidden = true;
			} else {
				document.getElementById("context-sipgateffx-c2dblacklistEn").hidden = true;
				document.getElementById("context-sipgateffx-c2dblacklistDis").hidden = false;
			}
		} catch(e) {
			//
		}		
	},

	onToolbarButtonCommand: function(e) {
		document.getElementById('sipgatemenu').openPopup( document.getElementById('sipgateffx-toolbar-button'), "before_end", 0, 0, true);
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
		var niceNumber = '';
		if(e.target.number != null)
		{
			niceNumber = e.target.number;
		} else {
			// allow /,-,(,),.,whitespace and all numers in phonenumbers
			var browserSelection = this.getBrowserSelection().match(/^\+?[\/\(\)\ \-\.\[\]\d]+$/);
			if(browserSelection !== null) {
				niceNumber = sipgateffx.component.niceNumber(browserSelection);
			}
		}
		window.openDialog('chrome://sipgateffx/content/sms.xul', 'sipgateSMS', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes', '', '+'+niceNumber);
	},

	onMenuItemContextCallTo: function(e) {

		var niceNumber = '';
		if(e.target.number != null)
		{
			niceNumber = e.target.number;
		} else {
			// allow /,-,(,),.,whitespace and all numers in phonenumbers
			var browserSelection = this.getBrowserSelection().match(/^\+?[\/\(\)\ \-\.\[\]\d]+$/);
			if(browserSelection !== null) {
				niceNumber = sipgateffx.component.niceNumber(browserSelection);
			}
		}
		
		sipgateffx.component.click2dial(niceNumber);
	},

	onMenuItemContextCallCancel: function(e) {
		sipgateffx.component.cancelClick2Dial();
	},
	
	onMenuItemBlacklist: function(e, action) {
		var blacklistEntry = '';

		if(sipgateffx.component.application != 'thunderbird') {
			try {
				var blacklistEntry = content.document.location.host.toLowerCase();
			} catch(e) {
				sipgateffx.component.log('onMenuItemBlacklist: could not get host (error: '  + e + ')');
			}
		} else {
			try {
				var msg = gFolderDisplay.selectedMessage;
				if(msg) {
					blacklistEntry = msg.getStringProperty('sender');
					if(new RegExp('<.*>').test(blacklistEntry)) {
						blacklistEntry = blacklistEntry.match(/<(.*)>/)[1]; 
					}
				}
			} catch(e) {
				sipgateffx.component.log('onMenuItemBlacklist: could not get sender (error: '  + e + ')');
			}
		}
		
		try {
			if(action == 'disable') {
				sipgateffx.componentDB.addBlacklisting(blacklistEntry);
				document.getElementById("context-sipgateffx-c2dblacklistEn").hidden = false;
				document.getElementById("context-sipgateffx-c2dblacklistDis").hidden = true;
				document.getElementById("sipgateffxC2DBlacklistOn").hidden = true;
				document.getElementById("sipgateffxC2DBlacklistOff").hidden = false;
			} else if(action == 'enable') {
				sipgateffx.componentDB.removeBlacklisting(blacklistEntry);
				document.getElementById("context-sipgateffx-c2dblacklistEn").hidden = true;
				document.getElementById("context-sipgateffx-c2dblacklistDis").hidden = false;
				document.getElementById("sipgateffxC2DBlacklistOn").hidden = false;
				document.getElementById("sipgateffxC2DBlacklistOff").hidden = true;
			}
		} catch(e) {
			sipgateffx.component.log("sipgateFFX->overlay->onMenuItemBlacklist ERROR " + e);
		}
	},
	
	onMenuItemDoNotDisturb: function(e, action) {
        if(e.button != 0) //only trigger on leftclick
            return;

		try {
			if(action == 'disable') {
				sipgateffx.component.setDoNotDisturb(false);
			} else if(action == 'enable') {
				sipgateffx.component.setDoNotDisturb(true);
			}
		} catch(e) {
			sipgateffx.component.log("sipgateFFX->overlay->onMenuItemDoNotDisturb ERROR " + e);
		}
	},
	
	onNotificationPopupClose: function(e) {
		try {
			sipgateffx.component.log('sipgateFFX->overlay->onNotificationPopupClose: requested');
			sipgateffx.component.runXulObjectCommand('sipgatenotificationPanel', 'hidePopup');
		} catch(e) {
			sipgateffx.component.log("sipgateFFX->overlay->onNotificationPopupClose ERROR " + e);
		}
	},
	
	onNotificationGotoEventlist: function(e) {
		try {
			this.onStatusbarCommand('showSitePage', 'history');
			this.onNotificationPopupClose();
		} catch(e) {
			sipgateffx.component.log("sipgateFFX->overlay->onNotificationGotoEventlist ERROR " + e);
		}
	},
	
	parseClick2Dial: function() {
		var blacklistEntry = '';

		if(sipgateffx.component.application != 'thunderbird') {
			try {
				blacklistEntry = content.document.location.host.toLowerCase();
				if(content.document.location.protocol.match(/^chrome/)) {
					blacklistEntry = '';
				}
			} catch(e) {
				sipgateffx.component.log('parseClick2Dial: could not get host (error: '  + e + ')');
			}
		} else {
			try {
				var msg = gFolderDisplay.selectedMessage;
				if(msg) {
					blacklistEntry = msg.getStringProperty('sender');
					if(new RegExp('<.*>').test(blacklistEntry)) {
						blacklistEntry = blacklistEntry.match(/<(.*)>/)[1]; 
					}
				}
			} catch(e) {
				sipgateffx.component.log('parseClick2Dial: could not get sender (error: '  + e + ')');
			}
		}

		try {
			if(sipgateffx.componentDB.isBlacklisted(blacklistEntry)) {
				document.getElementById("sipgateffxC2DBlacklistOn").hidden = true;
				document.getElementById("sipgateffxC2DBlacklistOff").hidden = false;
				return;
			} else {
				document.getElementById("sipgateffxC2DBlacklistOn").hidden = false;
				document.getElementById("sipgateffxC2DBlacklistOff").hidden = true;
			}
		} catch (e) {
			sipgateffx.component.log('parseClick2Dial: blacklist evaluation failed (error: '  + e + ')');
		}
		
		if (
				sipgateffx.component.getPref("extensions.sipgateffx.parsenumbers", "bool") &&
				sipgateffx.component.isLoggedIn &&
				blacklistEntry != ''
			) {
			sipgateffx_highlightNumber.pageLoaded();
		}
	},
	
	parseClick2DialFrame: function(evnt) {
		if (sipgateffx.component.getPref("extensions.sipgateffx.parsenumbers", "bool") && sipgateffx.component.isLoggedIn) {
			var host = '';
			try {
				host = evnt.target.contentDocument.location.host.toLowerCase();
			} catch(e) {
				//		
			}
			if(sipgateffx.componentDB.isBlacklisted(host)) {
				// sipgateffx.component.log('isBlacklisted: The site "'+host+'" is blacklisted. Do not match for click2dial.');
				return;
			}
			sipgateffx_highlightNumber.pageLoaded(evnt.target.contentDocument);
		}
	},
	
	toggleClick2Dial: function() {
		if (content.frames.length <= 0) {
			sipgateffx_highlightNumber.pageLoaded();
		} else {
		    for (var i=0; i<content.frames.length; i++) {
		    	sipgateffx_highlightNumber.pageLoaded(content.frames[i].document);
		    }
		}
	},
  
	websiteSessionLoginClassic: function(user, pass) {
		if ((user == null) && (pass == null)) {
			user = this.mUserName;
			pass = this.mUserPass;
		}
		
		var protocol = 'https://';
		var httpServer = sipgateffx.component.sipgateCredentials.HttpServer.replace(/^www/, 'secure');
		var urlSessionLogin = protocol + httpServer + "/user/slogin.php";

		var oHttpRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
																 .getService(Components.interfaces.nsIJSXMLHttpRequest);
		oHttpRequest.open("POST",urlSessionLogin,false);
		oHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		oHttpRequest.send("username="+user+"&password="+pass);
		return oHttpRequest.responseText.match(/\d\d\d/).toString();
	},
 
	onStatusbarCommand: function(action, param) {
		switch (action) {
			case 'showSitePage':
				if (!sipgateffx.component.isLoggedIn) {
					sipgateffx.component.log("*** sipgateffx: showSitePage *** USER NOT LOGGED IN ***");
					return;
				}
				
				if(typeof(this.url[sipgateffx.component.systemArea][param]) == 'undefined') {
					sipgateffx.component.log("*** sipgateffx->showSitePage: no url for action");
					return;
				}		

				var protocol = 'https://';
				var httpServer = sipgateffx.component.sipgateCredentials.HttpServer.replace(/^www/, 'secure');
				var siteURL = protocol + httpServer + this.url[sipgateffx.component.systemArea][param];
				sipgateffx.component.log("*** sipgateffx->showSitePage: link = " + siteURL);
				
				var postData = null;
				
				if (sipgateffx.component.systemArea == 'team') {

					var dataString = 'username=' + encodeURIComponent(sipgateffx.component.username) + '&password=' + encodeURIComponent(sipgateffx.component.password);
					
					// POST method requests must wrap the encoded text in a MIME stream
					var stringStream = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
					stringStream.data = dataString;
					
					postData = Components.classes["@mozilla.org/network/mime-input-stream;1"].createInstance(Components.interfaces.nsIMIMEInputStream);
					postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
					postData.addContentLength = true;
					postData.setData(stringStream);

				} else {

					this.websiteSessionLoginClassic(encodeURIComponent(sipgateffx.component.username), encodeURIComponent(sipgateffx.component.password));
					
				}
				
				var referrer = null;  
				var flags = Components.interfaces.nsIWebNavigation.LOAD_FLAGS_NONE;  
				
				if(sipgateffx.component.application == 'thunderbird') {
						this.openURI(siteURL);
						break;
				}				
				
				// open new tab or use already opened (by extension) tab:
				if ((typeof(sipgateffx.browserRef.selectedTab.id) != "undefined") && (sipgateffx.browserRef.selectedTab.id == "TabBySipgateFirefoxExtensionStatusbarShortcut")) {
					sipgateffx.browserRef.loadURIWithFlags(siteURL, flags, referrer, null, postData);  
				} else {
					var theTab = sipgateffx.browserRef.addTab(siteURL, referrer, null, postData);
					sipgateffx.browserRef.selectedTab = theTab;
					theTab.id = "TabBySipgateFirefoxExtensionStatusbarShortcut";
				}
				break;
				
			case 'openPrefs':
				window.openDialog('chrome://sipgateffx/content/options.xul', 'sipgatePrefs');
				break;
				
			case 'sendFaxPDF':
				window.open('chrome://sipgateffx/content/fax.xul', 'sipgate FAX', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes');
				break;
				
			case 'sendSMS':
				window.open('chrome://sipgateffx/content/sms.xul', 'sipgate SMS', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes');
				break;
				
			case 'dialPhonenumber':
				window.open('chrome://sipgateffx/content/previewnumber.xul', 'sipgatePreviewnumber', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes');
				break;
				
			case 'pollBalance':
				sipgateffx.component.getBalance(true);
				break;
				
			case 'logon':
				sipgateffx.component.loggedOutByUser = false;
				this.login();
				break;
				
			case 'logoff':
				sipgateffx.component.loggedOutByUser = true;
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
	},
	
	dumpJson: function(obj) {
		var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
		                 .createInstance(Components.interfaces.nsIJSON);
		sipgateffx.component.log(nativeJSON.encode(obj));
	},
	
	openURI: function(uri)
	{
		// first construct an nsIURI object using the ioservice
		var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
		                          .getService(Components.interfaces.nsIIOService);

		var uriToOpen = ioservice.newURI(uri, null, null);

		var extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
		                      .getService(Components.interfaces.nsIExternalProtocolService);

		// now, open it!
		extps.loadURI(uriToOpen, null);
	},
	
	getBrowserSelection: function() {
		if(typeof "getBrowserSelection" != "function") {
			return sipgateffx.browserRef.contentWindow.getSelection().toString();
		} else {
			return getBrowserSelection();
		}
	},

	addToolbarIcon: function() {
		// we do not support default toolbar icons in thunderbird
		if(sipgateffx.component.application == 'thunderbird') {
			return;
		}

		var myId    = "sipgateffx-toolbar-button"; // ID of button to add
		var navBar  = document.getElementById("nav-bar");
		var curSet  = navBar.currentSet.split(",");
		if (curSet.indexOf(myId) == -1) {
			var set = curSet;
			set.push(myId);

			navBar.setAttribute("currentset", set.join(","));
			navBar.currentSet = set.join(",");
			document.persist(navBar.id, "currentset");
			try {
				BrowserToolboxCustomizeDone(true);
			}
			catch (e) {}
		}

	}
		
};
window.addEventListener("load", function(e) { sipgateffx.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx.onUnload(e); }, false);
