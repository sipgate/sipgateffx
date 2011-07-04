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
var sipgateffx_about = {
	component: null,
	onLoad: function() {

		try {
			sipgateffx_about.component = Components.classes['@api.sipgate.net/sipgateffx;1'].getService().wrappedJSObject;
		} 
		catch (anError) {
			dump("ERROR: " + anError);
			return;
		}
		
		var ver = sipgateffx_about.component.version;
		sipgateffx_about.component.log(ver);
		sipgateffx_about.component.log(document.getElementById("sipgateffxAboutVersion").value);
		document.getElementById("sipgateffxAboutVersion").value = ver;
	}
};

window.addEventListener("load", function(e) { sipgateffx_about.onLoad(e); }, false);
