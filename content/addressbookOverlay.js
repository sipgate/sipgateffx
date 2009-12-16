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

var sipgateffx_addressbook = {
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
		
		document.getElementById('context-sipgateffx')
				.addEventListener("popupshowing", function(e) { sipgateffx_addressbook.showContextMenu(e); }, false);
		
		document.getElementById('CardViewBox').addEventListener("DOMContentLoaded", function() { sgffx.log('KUKUK'); }, false)
	},

	showContextMenu: function(event) {
		// var to = GetSelectedAddresses();
		var fields = ["WorkPhone",
			        "HomePhone",
			        "FaxNumber",
			        "PagerNumber",
			        "CellularNumber"];
		
		var cards = GetSelectedAbCards();
		
		var addresses = "";

		sgffx.log(cards);
		
		if (cards) {

			var count = cards.length;
			
			/*
			if (count > 0)
				addresses += GenerateAddressFromCard(cards[0]);
			*/
			
			for (var i = 0; i < count; i++) {
				sgffx.log(i);
				for(var k = 0; k < fields.length; k++) {
					sgffx.log(cards[i].getProperty(fields[k], ""));
				}
				/*
				var generatedAddress = GenerateAddressFromCard(cards[i]);
	
				if (generatedAddress)
					addresses += "," + generatedAddress;
				*/
			}
		
		}
		
		// sgffx.log('BLAAAA: ' + to);
	}
};
window.addEventListener("load", function(e) { sipgateffx_addressbook.onLoad(e); }, false); 