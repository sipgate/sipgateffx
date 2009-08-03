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
var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

function doOK() {
	var number = document.getElementById("sipgate_number").value;
	
	if(number == '') {
		// promptService.alert(window, 'sipgateFFX', sipgateffxsmsstrings.getString('sipgateffxSmsNumberEmpty'));
		return false;
	}
	
    var niceNumber = sgffx.niceNumber(number, "49");
	sgffx.click2dial(niceNumber);
	
	return true;
}

function doCancel() {
	window.close();
}

function doExtra() {
	var number = document.getElementById("sipgate_number").value;
	var niceNumber = '';
	if (number != '')
		niceNumber = '+' + sgffx.niceNumber(number, "49");

	window.openDialog('chrome://sipgateffx/content/contactOverlay.xul', 'sipgateContact', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes', niceNumber);
	return true;
}

var sipgateffx_previewnumber = {
	onLoad: function() {
		try {
			// this is needed to generally allow usage of components in javascript
			netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");

			sgffx = Components.classes['@api.sipgate.net/sipgateffx;1']
											.getService().wrappedJSObject;
			
		} catch (anError) {
			dump("ERROR: " + anError);
			return;
		}

		if(typeof window.arguments != "undefined") {
			if(typeof window.arguments[0] != "undefined") {
				document.getElementById("sipgate_number").setAttribute('value', window.arguments[0]);
			}
		}

		if(typeof(sgffx.contacts) != 'undefined') {
			for(var i in sgffx.contacts) {
				if(!sgffx.contacts[i].tel) continue;
				for(var teltype in sgffx.contacts[i].tel) {
					if(teltype == 'fax') continue;
					document.getElementById("sipgate_number").appendItem(sgffx.contacts[i].name + ' (' + teltype.toUpperCase() + ')', sgffx.contacts[i].tel[teltype]);
				}
			}
		}
		
	},

	onContactSelect: function(element) {
		document.getElementById("sipgate_number").value = element.selectedItem.value; 
	},
	
  onUnload: function() {

  }

};
window.addEventListener("load", function(e) { sipgateffx_previewnumber.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_previewnumber.onUnload(e); }, false); 