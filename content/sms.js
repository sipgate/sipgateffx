var sgffx;
var sending = false;

function doOK() {
	if(sending) {
		return false;
	}
	
	var number = document.getElementById("sipgate_sms_number").value;
	var text = document.getElementById("sipgate_sms_text").value;
	
	if(number == '' || text == '') {
		alert('Number or text is empty. Won\'t send!');
		return false;
	}
	
	number = sgffx.niceNumber(number, 49);
	
	document.getElementById("sipgate_sms").setAttribute('hidden', 'true');
	document.getElementById("sipgate_sms_sending").setAttribute('hidden', 'false');
	
	var result = function(ourParsedResponse, aXML) {
		if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			promptService.alert(window, 'sipgateFFX', 'The message was sent successfully!');
			window.close();
		} else {
			document.getElementById("sipgate_sms").setAttribute('hidden', 'false');
			document.getElementById("sipgate_sms_sending").setAttribute('hidden', 'true');
			sending = false;
			sgffx.log((new XMLSerializer()).serializeToString(aXML));
			alert('Sending failed!');
		}
	};
	
	var params = { 'RemoteUri': "sip:"+ number +"\@sipgate.net", 'TOS': "text", 'Content': text };
	
	if(document.getElementById("sipgate_sms_schedule_check").checked) {
		var date = document.getElementById("sipgate_sms_schedule_date").dateValue;
		var time = document.getElementById("sipgate_sms_schedule_time");	
		date.setHours(time.hour);
		date.setMinutes(time.minute);		
		params.Schedule	= date;
		dump(date);
	}

/*	
	if(document.getElementById("sipgate_sms_schedule_check").checked) {
		var date = document.getElementById("sipgate_sms_schedule_date").value;
		var time = document.getElementById("sipgate_sms_schedule_time").value;	
		params.Schedule	= date + 'T' + time + '+01:00';
	}
*/
	
	Components.utils.import("resource://sipgateffx/xmlrpc.js");
	
	var request = bfXMLRPC.makeXML("samurai.SessionInitiate", [sgffx.samuraiServer, params]);
	dump(request + "\n");

	sending = true;	
	sgffx._rpcCall(request, result);
	return false;
}

function doCancel() {
	window.close();
}

function countTextChars() {
	var val = document.getElementById("sipgate_sms_text").value.length;
	document.getElementById("sipgate_sms_text_header").setAttribute('label', 'Text (' + val + ' chars)');
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
				
		if(typeof window.arguments != "undefined") {
			document.getElementById("sipgate_sms_text").setAttribute('value', window.arguments[0]);
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