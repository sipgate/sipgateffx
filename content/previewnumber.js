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
var sipgateffx_previewnumber = {
	component: null,
		
	onLoad: function() {

		try {
			sipgateffx_previewnumber.component = Components.classes['@api.sipgate.net/sipgateffx;1'].getService().wrappedJSObject;
		} 
		catch (anError) {
			dump("ERROR: " + anError);
			return;
		}

		if(typeof window.arguments != "undefined") {
			if(typeof window.arguments[0] != "undefined") {
				document.getElementById("sipgate_number").setAttribute('value', window.arguments[0]);
			}
		}

		if(sipgateffx_previewnumber.component.systemArea == 'classic') {
			document.getElementById("sipgateffxPreviewnumberWindow").buttons = "accept,cancel";
		}
		
		sipgateffxstrings = document.getElementById("sipgateffxPreviewnumber-strings");
		
		if(typeof(sipgateffx_previewnumber.component.contacts) != 'undefined') {
			for(var i in sipgateffx_previewnumber.component.contacts) {
				if(!sipgateffx_previewnumber.component.contacts[i].tel) continue;
				for(var teltype in sipgateffx_previewnumber.component.contacts[i].tel) {
					var type = teltype.toUpperCase().split(',');
					if(type.indexOf('FAX') !== -1) continue;
					type.forEach(function(singletype, index) {
						try {
							type[index] = sipgateffxstrings.getString('sipgateffxContact' + singletype);
						} catch(e) {
							type[index] = singletype;
						}
					});
					document.getElementById("sipgate_number").appendItem(sipgateffx_previewnumber.component.contacts[i].name + ' (' + type.join(' ') + ')', sipgateffx_previewnumber.component.contacts[i].tel[teltype]);
				}
			}
		}
		
	},

	onContactSelect: function(element) {
		if(element.selectedItem.value.match(/^\+/)) {
			document.getElementById("sipgate_number").value = element.selectedItem.value; 
		} else if(element.selectedItem.value.match(/^0/)) {
			document.getElementById("sipgate_number").value = '+' + sipgateffx_previewnumber.component.niceNumber(element.selectedItem.value);
		} else {
			document.getElementById("sipgate_number").value = '+' + element.selectedItem.value;
		} 
	},
	
	onUnload: function() {
	},
  
	doOK: function() {
		var number = document.getElementById("sipgate_number").value;
		
		if(number == '') {
			return false;
		}
		
	    var niceNumber = sipgateffx_previewnumber.component.niceNumber(number);
		sipgateffx_previewnumber.component.click2dial(niceNumber, function() { window.close(); });
		
		return false;
	},

	doCancel: function() {
		window.close();
	},

	doExtra: function() {
		var number = document.getElementById("sipgate_number").value;
		var niceNumber = '';
		if (number != '')
			niceNumber = '+' + sipgateffx_previewnumber.component.niceNumber(number);

		window.openDialog('chrome://sipgateffx/content/contactOverlay.xul', 'sipgateContact', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes', niceNumber);
		return true;
	} 

};
window.addEventListener("load", function(e) { sipgateffx_previewnumber.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_previewnumber.onUnload(e); }, false); 
