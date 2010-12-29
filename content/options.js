/*****************************************************************************

    sipgate FFX - Firefox Extension for Mozilla Firefox Webbrowser
    Copyright (C) 2010 sipgate GmbH, Germany

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
var sgffx;
var sgffxDB;

var sipgateffx_options = {
    onLoad: function(){

	try {
		sgffx = Components.classes['@api.sipgate.net/sipgateffx;1'].getService().wrappedJSObject;
        } 
        catch (anError) {
		dump("ERROR: " + anError);
		return;
        }

	try {
		sgffxDB = Components.classes['@api.sipgate.net/sipgateffx-storage;1'].getService().wrappedJSObject;
	} catch(e) {
		dump("ERROR while initializing DB: " + e);
		return;
	}			

        var auth = sgffx.getSamuraiAuth();
        
        document.getElementById('username').setAttribute("value", auth.username);
        document.getElementById('password').setAttribute("value", auth.password);
		
        var voiceList = sgffx.ownUriList.voice;
		var uriList = [];
		var defaultExtensionPref = sgffx.getPref("extensions.sipgateffx.defaultExtension", "char");
		
        for (var i = 0; i < voiceList.length; i++) {
            document.getElementById("click2DialList").appendItem(
				(voiceList[i].UriAlias != '' ? voiceList[i].UriAlias : voiceList[i].SipUri),
				voiceList[i].SipUri
			);

			uriList.push(voiceList[i].SipUri);
        }
		
		if(uriList.indexOf(defaultExtensionPref) == -1) {
			document.getElementById("click2DialList").value = sgffx.defaultExtension.voice.extensionSipUri;
			sgffx.setPref("extensions.sipgateffx.defaultExtension", sgffx.defaultExtension.voice.extensionSipUri, "char");
		} else {
			document.getElementById("click2DialList").value = defaultExtensionPref;
		}
		
		this.buildBlacklistLisbox();
    },
    
    onUnload: function(){
		var relogin = false;
		
        if (document.getElementById("parsenumbers").value) {
            sgffx.setXulObjectVisibility('dialactivate', 0);
        }
        else {
            sgffx.setXulObjectVisibility('dialactivate', 1);
        }
		
		if(document.getElementById("dontshowbalance").value) {
			sgffx.setXulObjectAttribute('BalanceText', "value", "");			
		} else {
			sgffx.getBalance();
		}
        
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        
        if (username == '' || password == '') {
            return;
        }
  /*      
        var chosenSystemArea = (document.getElementById("systemTeam").value ? 'team' : 'classic');
        if (sgffx.systemArea != chosenSystemArea) {
			sgffx.log('options: changed systemArea from "'+sgffx.systemArea+'" to "'+chosenSystemArea+'"');
            sgffx.systemArea = chosenSystemArea;
			relogin = true;
        }
*/        
        var auth = sgffx.getSamuraiAuth();
        
        if (auth.username != username || auth.password != password) {
			sgffx.log('options: changed user name from "'+auth.username+'" to "'+username+'"');
			if(new RegExp(/^.+@.+\.[a-z]{2,6}$/).test(username)) {
				sgffx.systemArea = 'team';
				sgffx.setPref("extensions.sipgateffx.systemTeam", true, "bool");
				sgffx.log('options: changed systemArea to "team"');
			} else {
				sgffx.systemArea = 'classic';
				sgffx.setPref("extensions.sipgateffx.systemTeam", false, "bool");
				sgffx.log('options: changed systemArea to "classic"');
			}
            sgffx.setSamuraiAuth(username, password);
			relogin = true;
        }
		
		if(relogin) {
			sgffx.log('options: logoff triggered');
            sgffx.logoff();
		}

        if (document.getElementById('autologin').value === true && sgffx.loggedOutByUser === false) {
            if (!sgffx.isLoggedIn) {
				sgffx.log('options: login triggered');
				sgffx.login();
            }
            else {
				sgffx.log('options: getBalance triggered');
                sgffx.getBalance();
            }
        }
        
    },
    
    doDeleteBlacklistedHosts: function(){
    	var myListBox = document.getElementById("sipgateffxTree");
    	for(var i = 0; i < myListBox.itemCount; i++) {
    		if(myListBox.getItemAtIndex(i).checked) {
    			sgffxDB.removeBlacklisting(myListBox.getItemAtIndex(i).value);
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
    	var siteURL = 'chrome://sipgateffx/content/firststart/welcome_'+sgffx.language+'.html';
    	this.openURI(siteURL);
        window.close();
    },
    
    openURI: function(siteURL) {
    	if(sgffx.application == 'thunderbird') {
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
		sgffxDB.getBlacklistedSites();
	
		var myListBox = document.getElementById("sipgateffxTree");

		for (var i = 0; i < sgffxDB.blacklisted.length; i++) {
			var b = myListBox.appendItem(sgffxDB.blacklisted[i], sgffxDB.blacklisted[i]);
			b.setAttribute('type', 'checkbox');
		}
    }
 
    
};
window.addEventListener("load", function(e){ sipgateffx_options.onLoad(e);}, false);
window.addEventListener("unload", function(e){  sipgateffx_options.onUnload(e);}, false);
