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

var sgffx;

function doOpenDebuggingInfo() {
    window.opener.loadURI('chrome://sipgateffx/content/sendReport.html');
    window.close();
}

var sipgateffx_options = {
  onLoad: function() {
	try {
		// this is needed to generally allow usage of components in javascript
		netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
	
		sgffx = Components.classes['@api.sipgate.net/sipgateffx;1']
	                                    .getService().wrappedJSObject;
//					    .createInstance(Components.interfaces.nsISipgateFFX);
	} catch (anError) {
		dump("ERROR: " + anError);
	}
	
	var auth = sgffx.getSamuraiAuth();
	
	document.getElementById('username').setAttribute("value", auth.username);
	document.getElementById('password').setAttribute("value", auth.password);
	
	var voiceList = sgffx.ownUriList.voice;
	for(var i = 0; i < voiceList.length; i++) {
		var menuItem = document.createElement("menuitem");
		menuItem.setAttribute( "label" , voiceList[i].UriAlias);
		menuItem.setAttribute( "id" , voiceList[i].SipUri);
		
		document.getElementById("click2DialListMenu").appendChild(menuItem);
		
		if(voiceList[i].DefaultUri === true) {
			document.getElementById("click2DialList").selectedItem = menuItem;
		}
	}
  },

  onUnload: function() {
		if(document.getElementById("parsenumbers").value) {
			sgffx.setXulObjectVisibility('dialactivate', 0);
		} else {
			sgffx.setXulObjectVisibility('dialactivate', 1);
		}
	  
	  var username = document.getElementById('username').value;
	  var password = document.getElementById('password').value;
	  
	  if(username == '' || password == '') {
	  	return;
	  }

	  var auth = sgffx.getSamuraiAuth();
	  
	  if(auth.username != username || auth.password != password) {
		  sgffx.setSamuraiAuth(username, password);
	  }

	if(document.getElementById('autologin').value === true) {
		if(!sgffx.isLoggedIn) {
			sgffx.login();
		} else {
			sgffx.getBalance();
		}
	}

  }

};
window.addEventListener("load", function(e) { sipgateffx_options.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_options.onUnload(e); }, false); 
