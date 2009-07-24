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
var sending = false;
var sipgateffxsmsstrings;
var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

function doOK() {
	if(sending) {
		return false;
	}
	
	var number = document.getElementById("sipgate_sms_number").value;
	var text = document.getElementById("sipgate_sms_text").value;
	
	if(sgffx.systemArea == 'classic') {
		text = text.replace(/\n|\r/g, ' ');
	}
	
	if(number == '' || text == '') {
		promptService.alert(window, 'sipgateFFX', sipgateffxsmsstrings.getString('sipgateffxSmsNumberEmpty'));
		return false;
	}
	
	number = sgffx.niceNumber(number, 49);
	
	document.getElementById("sipgate_sms").setAttribute('hidden', 'true');
	document.getElementById("sipgate_sms_sending").setAttribute('hidden', 'false');
	
	var result = function(ourParsedResponse, aXML) {
		if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
			promptService.alert(window, 'sipgateFFX', sipgateffxsmsstrings.getString('sipgateffxSmsSentSuccess'));
			window.close();
		} else {
			document.getElementById("sipgate_sms").setAttribute('hidden', 'false');
			document.getElementById("sipgate_sms_sending").setAttribute('hidden', 'true');
			sending = false;
			sgffx.log((new XMLSerializer()).serializeToString(aXML));
			promptService.alert(window, 'sipgateFFX', sipgateffxsmsstrings.getString('sipgateffxSmsSentFailed'));
		}
	};
	
	var params = { 'RemoteUri': "sip:"+ number +"\@sipgate.net", 'TOS': "text", 'Content': text };
	
	if(document.getElementById("sipgate_sms_schedule_check").checked) {
		var date = document.getElementById("sipgate_sms_schedule_date").dateValue;
		var time = document.getElementById("sipgate_sms_schedule_time");	
		date.setHours(time.hour);
		date.setMinutes(time.minute);		
		params.Schedule	= date;
	}

/*	
	if(document.getElementById("sipgate_sms_schedule_check").checked) {
		var date = document.getElementById("sipgate_sms_schedule_date").value;
		var time = document.getElementById("sipgate_sms_schedule_time").value;	
		params.Schedule	= date + 'T' + time + '+01:00';
	}
*/

	sending = true;	
	sgffx._rpcCall("samurai.SessionInitiate", params, result);
	return false;
}

function doCancel() {
	window.close();
}

function countTextChars() {
	var val = document.getElementById("sipgate_sms_text").value.length;
	document.getElementById("sipgate_sms_text_header").label = sipgateffxsmsstrings.getFormattedString("sipgateffxSmsText", [val]);
	return val;
}

var sipgateffx_sms = {
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

		sipgateffxsmsstrings = document.getElementById("sipgateffx_sms-strings");
		
		if(sgffx.tosList.indexOf('text') == -1) {
			promptService.alert(window, 'sipgateFFX', sipgateffxsmsstrings.getString('sipgateffxSmsNotAvailable'));
			window.close();
			return false;
		}		
		
		if(typeof window.arguments != "undefined") {
			if(typeof window.arguments[0] != "undefined") {
				document.getElementById("sipgate_sms_text").setAttribute('value', window.arguments[0]);
			}
			if(typeof window.arguments[1] != "undefined") {
				document.getElementById("sipgate_sms_number").setAttribute('value', window.arguments[1]);
			}
		}
		
		document.getElementById("sipgate_sms_text").addEventListener("keyup", function(e) {
			var val = countTextChars();
		}, false);

		document.getElementById("sipgate_sms_schedule_check").addEventListener("click", function(e) {
			if (this.checked) {
				document.getElementById("sipgate_sms_schedule_date").removeAttribute('disabled');
				document.getElementById("sipgate_sms_schedule_time").removeAttribute('disabled');
			} else {
				document.getElementById("sipgate_sms_schedule_date").setAttribute('disabled', 'true');
				document.getElementById("sipgate_sms_schedule_time").setAttribute('disabled', 'true');
			}
		}, false);

		countTextChars();
		
	},

  onUnload: function() {

  }

};
window.addEventListener("load", function(e) { sipgateffx_sms.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_sms.onUnload(e); }, false); 