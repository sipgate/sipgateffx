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
var sipgateffx_options = {
	component: null,
	componentDB: null,
		
    onLoad: function(){

	try {
		sipgateffx_options.component = Components.classes['@api.sipgate.net/sipgateffx;1'].getService().wrappedJSObject;
        } 
        catch (anError) {
		dump("ERROR: " + anError);
		return;
        }

	try {
		sipgateffx_options.componentDB = Components.classes['@api.sipgate.net/sipgateffx-storage;1'].getService().wrappedJSObject;
	} catch(e) {
		dump("ERROR while initializing DB: " + e);
		return;
	}			

        var auth = sipgateffx_options.component.getSamuraiAuth();
        
        document.getElementById('username').setAttribute("value", auth.username);
        document.getElementById('password').setAttribute("value", auth.password);
		
        var voiceList = sipgateffx_options.component.ownUriList.voice;
		var uriList = [];
		var defaultExtensionPref = sipgateffx_options.component.getPref("extensions.sipgateffx.defaultExtension", "char");
		
        for (var i = 0; i < voiceList.length; i++) {
            document.getElementById("click2DialList").appendItem(
				(voiceList[i].UriAlias != '' ? voiceList[i].UriAlias : voiceList[i].SipUri),
				voiceList[i].SipUri
			);

			uriList.push(voiceList[i].SipUri);
        }
		
		if(uriList.indexOf(defaultExtensionPref) == -1) {
			sipgateffx_options.component.log('options: defaultExtensionPref is not in uriList. Setting defaultExtensionPref to defaultExtension');
			var defaultExtension;
			if(sipgateffx_options.component.defaultExtension && sipgateffx_options.component.defaultExtension.voice && sipgateffx_options.component.defaultExtension.voice.extensionSipUri)
			{
				defaultExtension = sipgateffx_options.component.defaultExtension.voice.extensionSipUri;
			} else if(sipgateffx_options.component.ownUriList && sipgateffx_options.component.ownUriList.voice && sipgateffx_options.component.ownUriList.voice.length > 0) {
				defaultExtension = sipgateffx_options.component.ownUriList.voice[0].SipUri;
			}
			if(defaultExtension)
			{
				document.getElementById("click2DialList").value = defaultExtension;
				sipgateffx_options.component.setPref("extensions.sipgateffx.defaultExtension", defaultExtension, "char");
			}
		} else {
			document.getElementById("click2DialList").value = defaultExtensionPref;
		}
		
		this.buildBlacklistLisbox();
    },
    
    onUnload: function(){
		var relogin = false;

	if(sipgateffx_options.component.isLoggedIn)
	{
		if (document.getElementById("parsenumbers").value) {
		    sipgateffx_options.component.setXulObjectVisibility('dialactivate', 0);
		}
		else {
		    sipgateffx_options.component.setXulObjectVisibility('dialactivate', 1);
		}
	}	
		if(document.getElementById("dontshowbalance").value) {
			sipgateffx_options.component.setXulObjectAttribute('BalanceText', "value", "");			
		} else {
			sipgateffx_options.component.getBalance();
		}
        
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        
        if (username == '' || password == '') {
            return;
        }
 
        var auth = sipgateffx_options.component.getSamuraiAuth();
        
        if (auth.username != username || auth.password != password) {
			sipgateffx_options.component.log('options: changed user name from "'+auth.username+'" to "'+username+'"');
            sipgateffx_options.component.setSamuraiAuth(username, password);
			relogin = true;
        }
		
		if(relogin) {
			sipgateffx_options.component.log('options: logoff triggered');
            sipgateffx_options.component.logoff();
		}

        if (document.getElementById('autologin').value === true && sipgateffx_options.component.loggedOutByUser === false) {
            if (!sipgateffx_options.component.isLoggedIn) {
				sipgateffx_options.component.log('options: login triggered');
				sipgateffx_options.component.login();
            }
            else {
				sipgateffx_options.component.log('options: getBalance triggered');
                sipgateffx_options.component.getBalance();
            }
        }
        
    },
    
    doDeleteBlacklistedHosts: function(){
    	var myListBox = document.getElementById("sipgateffxTree");
    	for(var i = 0; i < myListBox.itemCount; i++) {
    		if(myListBox.getItemAtIndex(i).checked) {
    			sipgateffx_options.componentDB.removeBlacklisting(myListBox.getItemAtIndex(i).value);
    			myListBox.removeItemAt(i);
    		}
    	}
    },
    
    doOpenDebuggingInfo: function(){
    	var siteURL = 'chrome://sipgateffx/content/sendReport.html';
    	this.openURI(siteURL);
        window.close();
    },

    doOpenNewVersionInfo: function(){
    	var siteURL = 'chrome://sipgateffx/content/firststart/welcome_'+sipgateffx_options.component.language+'.html';
    	this.openURI(siteURL);
        window.close();
    },
    
    openURI: function(siteURL) {
    	if(sipgateffx_options.component.application == 'thunderbird') {
    		var mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    		                                         .getService(Components.interfaces.nsIWindowMediator)
    		                                         .getMostRecentWindow("mail:3pane");  
    		if (mail3PaneWindow) {  
    			var tabmail = mail3PaneWindow.document.getElementById("tabmail");  
    			mail3PaneWindow.focus();
    			tabmail.openTab("contentTab", {contentPage: siteURL});
    		}		
    	} else {
    		window.opener.getBrowser().selectedTab = window.opener.getBrowser().addTab(siteURL);
    	}
    },

    buildBlacklistLisbox: function() {
		sipgateffx_options.componentDB.getBlacklistedSites();
	
		var myListBox = document.getElementById("sipgateffxTree");

		for (var i = 0; i < sipgateffx_options.componentDB.blacklisted.length; i++) {
			var b = myListBox.appendItem(sipgateffx_options.componentDB.blacklisted[i], sipgateffx_options.componentDB.blacklisted[i]);
			b.setAttribute('type', 'checkbox');
		}
    }
 
    
};
window.addEventListener("load", function(e){ sipgateffx_options.onLoad(e);}, false);
window.addEventListener("unload", function(e){  sipgateffx_options.onUnload(e);}, false);
