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
var sipgateffx_sms = {
	component: null,
	sending: false,
	strings: null,
	promptService: null,
		
	onLoad: function() {
		sipgateffx_sms.promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		
		try {
			sipgateffx_sms.component = Components.classes['@api.sipgate.net/sipgateffx;1'].getService().wrappedJSObject;
		} 
		catch (anError) {
			dump("ERROR: " + anError);
			return;
		}

		sipgateffx_sms.strings = document.getElementById("sipgateffx_sms-strings");
		
		if(sipgateffx_sms.component.tosList.indexOf('text') == -1) {
			sipgateffx_sms.promptService.alert(window, 'sipgateFFX', sipgateffx_sms.strings.getString('sipgateffxSmsNotAvailable'));
			window.close();
			return false;
		}		

		// get verified numbers if systemarea is classic
		if(sipgateffx_sms.component.systemArea == 'classic') {
			
			document.getElementById("sipgate_sms_senderbox").setAttribute('hidden', 'true');
			
		} else {
			
			var senderNumberPref = sipgateffx_sms.component.getPref("extensions.sipgateffx.smsSenderNumber", "char");
			
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
						
						if(sipgateffx_sms.component.sipgateCredentials.HttpServer.match(/com$/)) {
							document.getElementById("sipgate_sms_sendernumber").removeItemAt(0);
							document.getElementById("sipgate_sms_sendernumber").selectedIndex = 0;
						}
					}
				}
			};

			sipgateffx_sms.component._rpcCall("samurai.VerifiedNumbersGet", {}, result);
		}
		
		if(typeof window.arguments != "undefined") {
			if(typeof window.arguments[0] != "undefined") {
				document.getElementById("sipgate_sms_text").setAttribute('value', window.arguments[0]);
			}
			if(typeof window.arguments[1] != "undefined") {
				document.getElementById("sipgate_sms_number").setAttribute('value', window.arguments[1]);
				document.getElementById("sipgate_sms_text").focus();
			}
		}

		if(sipgateffx_sms.component.systemArea == 'classic') {
			document.getElementById("sipgateffxSmsWindow").buttons = "accept,cancel";
		}
		
		document.getElementById("sipgate_sms_text").addEventListener("keyup", function(e) {
			var val = sipgateffx_sms.countTextChars();
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
		
		
		if(typeof(sipgateffx_sms.component.contacts) != 'undefined') {
			for(var i in sipgateffx_sms.component.contacts) {
				if(!sipgateffx_sms.component.contacts[i].tel || !sipgateffx_sms.component.contacts[i].tel.cell) continue;
				document.getElementById("sipgate_sms_number").appendItem(sipgateffx_sms.component.contacts[i].name, sipgateffx_sms.component.contacts[i].tel.cell);
			}
		}
		
		if(document.getElementById("sipgate_sms_number").itemCount == 0) {
			document.getElementById("sipgate_sms_number").appendItem(
				sipgateffx_sms.strings.getString('sipgateffxNoAppropriateContactsFound'), '');
		}

		this.countTextChars();
		
	},

	onContactSelect: function(element) {
		var val = element.selectedItem.value;
		if(val == '') {
			document.getElementById("sipgate_sms_number").value = '';
		} else if(val.match(/^\+/)) {
			document.getElementById("sipgate_sms_number").value = val; 
		} else if(val.match(/^0/)) {
			document.getElementById("sipgate_sms_number").value = '+' + sipgateffx_sms.component.niceNumber(val);
		} else {
			document.getElementById("sipgate_sms_number").value = '+' + val;
		}
	},
	
	onUnload: function() {
		if(document.getElementById("sipgate_sms_sendernumber").value) {
			sipgateffx_sms.component.setPref("extensions.sipgateffx.smsSenderNumber", document.getElementById("sipgate_sms_sendernumber").value, "char");
		} else {
			sipgateffx_sms.component.setPref("extensions.sipgateffx.smsSenderNumber", "", "char");
		}
	},
  
	countTextChars: function() {
		var val = document.getElementById("sipgate_sms_text").value.length;
		document.getElementById("sipgate_sms_text_header").label = sipgateffx_sms.strings.getFormattedString("sipgateffxSmsText", [val]);
		return val;
	},

	doOK: function() {
		if(sipgateffx_sms.sending) {
			return false;
		}
		
		var number = document.getElementById("sipgate_sms_number").value;
		var text = document.getElementById("sipgate_sms_text").value;
		
		if(sipgateffx_sms.component.systemArea == 'classic') {
			text = text.replace(/\n|\r/g, ' ');
		}
		
		if(number == '' || text == '') {
			sipgateffx_sms.promptService.alert(window, 'sipgateFFX', sipgateffx_sms.strings.getString('sipgateffxSmsNumberEmpty'));
			return false;
		}
		
		sipgateffx_sms.sending = true;	
		
		document.getElementById("sipgate_sms").setAttribute('hidden', 'true');
		document.getElementById("sipgate_sms_sending").setAttribute('hidden', 'false');
		
		var remoteUri = '';
		var apiFunction = '';
		
		var numbers = number.split(',');
		
		if(numbers.length == 1) {
			
			apiFunction = 'SessionInitiate';
			remoteUri = "sip:"+ sipgateffx_sms.component.niceNumber(numbers[0]) +"\@sipgate.net";
			
		} else {
			
			apiFunction = 'SessionInitiateMulti';
			remoteUri = [];
			
			for (var i = 0; i < numbers.length; i++) {
				remoteUri.push("sip:"+ sipgateffx_sms.component.niceNumber(numbers[i]) +"\@sipgate.net");
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
				sipgateffx_sms.promptService.alert(window, 'sipgateFFX', sipgateffx_sms.strings.getString('sipgateffxSmsSentSuccess'));
				window.close();
			} else {
				document.getElementById("sipgate_sms").setAttribute('hidden', 'false');
				document.getElementById("sipgate_sms_sending").setAttribute('hidden', 'true');
				sipgateffx_sms.sending = false;
				sipgateffx_sms.component.log((new XMLSerializer()).serializeToString(aXML));
				sipgateffx_sms.promptService.alert(window, 'sipgateFFX', sipgateffx_sms.strings.getString('sipgateffxSmsSentFailed'));
			}
		};

		sipgateffx_sms.component._rpcCall("samurai." + apiFunction, params, result);
		return false;
	},

	doCancel: function() {
		window.close();
	},

	doExtra: function() {
		var number = document.getElementById("sipgate_sms_number").value;
		var niceNumber = '';
		if (number != '')
			niceNumber = '+' + sipgateffx_sms.component.niceNumber(number);

		window.openDialog('chrome://sipgateffx/content/contactOverlay.xul', 'sipgateContact', 'chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes', niceNumber);
		return true;
	}
};
window.addEventListener("load", function(e) { sipgateffx_sms.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_sms.onUnload(e); }, false); 
