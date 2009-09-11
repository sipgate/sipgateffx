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
	
	sending = true;	
	
	document.getElementById("sipgate_sms").setAttribute('hidden', 'true');
	document.getElementById("sipgate_sms_sending").setAttribute('hidden', 'false');
	
	var remoteUri = '';
	var apiFunction = '';
	
	var numbers = number.split(',');
	
	if(numbers.length == 1) {
		
		apiFunction = 'SessionInitiate';
		remoteUri = "sip:"+ sgffx.niceNumber(numbers[0]) +"\@sipgate.net";
		
	} else {
		
		apiFunction = 'SessionInitiateMulti';
		remoteUri = [];
		
		for (var i = 0; i < numbers.length; i++) {
			remoteUri.push("sip:"+ sgffx.niceNumber(numbers[i]) +"\@sipgate.net");
		}
	}

	var params = { 'RemoteUri': remoteUri, 'TOS': "text", 'Content': text };
	
	// set sender
	if(document.getElementById("sipgate_sms_sendernumber").value) {
		params.LocalUri = "sip:" + document.getElementById("sipgate_sms_sendernumber").value + "\@sipgate.net";
	}
	
	// set if scheduled
	if(document.getElementById("sipgate_sms_schedule_check").checked) {
		var date = document.getElementById("sipgate_sms_schedule_date").dateValue;
		var time = document.getElementById("sipgate_sms_schedule_time");	
		date.setHours(time.hour);
		date.setMinutes(time.minute);		
		params.Schedule	= date;
	}

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

	sgffx._rpcCall("samurai." + apiFunction, params, result);
	return false;
}

function doCancel() {
	window.close();
}

function doExtra() {
	var number = document.getElementById("sipgate_sms_number").value;
	var niceNumber = '';
	if (number != '')
		niceNumber = '+' + sgffx.niceNumber(number);

	window.openDialog('chrome://sipgateffx/content/contactOverlay.xul', 'sipgateContact', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes', niceNumber);
	return true;
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

		// get verified numbers if systemarea is classic
		if(sgffx.systemArea == 'classic') {
			
			document.getElementById("sipgate_sms_senderbox").setAttribute('hidden', 'true');
			
		} else {
			
			var senderNumberPref = sgffx.getPref("extensions.sipgateffx.smsSenderNumber", "char");
			
			var result = function(ourParsedResponse, aXML) {
				if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
					if (ourParsedResponse.NumbersList && ourParsedResponse.NumbersList.length > 0) {
						for (var i = 0; i < ourParsedResponse.NumbersList.length; i++) {
							
							var entry = ourParsedResponse.NumbersList[i];

							document.getElementById("sipgate_sms_sendernumber").appendItem('+' + entry.E164, entry.E164);
							
							if(entry.E164 == senderNumberPref) {
								document.getElementById("sipgate_sms_sendernumber").value = senderNumberPref;
							}
						}
						
						if(sgffx.sipgateCredentials.HttpServer.match(/com$/)) {
							document.getElementById("sipgate_sms_sendernumber").removeItemAt(0);
							document.getElementById("sipgate_sms_sendernumber").selectedIndex = 0;
						}
					}
				}
			};

			sgffx._rpcCall("samurai.VerifiedNumbersGet", {}, result);
		}
		
		if(typeof window.arguments != "undefined") {
			if(typeof window.arguments[0] != "undefined") {
				document.getElementById("sipgate_sms_text").setAttribute('value', window.arguments[0]);
			}
			if(typeof window.arguments[1] != "undefined") {
				document.getElementById("sipgate_sms_number").setAttribute('value', window.arguments[1]);
			}
		}

		if(sgffx.systemArea == 'classic') {
			document.getElementById("sipgateffxSmsWindow").buttons = "accept,cancel";
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
		
		if(typeof(sgffx.contacts) != 'undefined') {
			for(var i in sgffx.contacts) {
				if(!sgffx.contacts[i].tel || !sgffx.contacts[i].tel.cell) continue;
				document.getElementById("sipgate_sms_number").appendItem(sgffx.contacts[i].name, sgffx.contacts[i].tel.cell);
			}
		}

		countTextChars();
		
	},

	onContactSelect: function(element) {
		document.getElementById("sipgate_sms_number").value = element.selectedItem.value; 
	},
	
  onUnload: function() {
	if(document.getElementById("sipgate_sms_sendernumber").value) {
		sgffx.setPref("extensions.sipgateffx.smsSenderNumber", document.getElementById("sipgate_sms_sendernumber").value, "char");
	} else {
		sgffx.setPref("extensions.sipgateffx.smsSenderNumber", "", "char");
	}
  }

};
window.addEventListener("load", function(e) { sipgateffx_sms.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_sms.onUnload(e); }, false); 