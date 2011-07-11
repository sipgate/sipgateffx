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
var sipgateffx_fax = {
	component: null,
	sending: false,
	strings: null,
	promptService: null,

	
	onLoad: function() {
		sipgateffx_fax.promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		
		try {
			sipgateffx_fax.component = Components.classes['@api.sipgate.net/sipgateffx;1'].getService().wrappedJSObject;
		} 
		catch (anError) {
			dump("ERROR: " + anError);
			return;
		}

		sipgateffx_fax.strings = document.getElementById("sipgateffx_fax-strings");

		if(sipgateffx_fax.component.tosList.indexOf('fax') == -1) {
			sipgateffx_fax.promptService.alert(window, 'sipgateFFX', sipgateffx_fax.strings.getString('sipgateffxFaxNotAvailable'));
			window.close();
			return false;
		}

		if(typeof(sipgateffx_fax.component.contacts) != 'undefined') {
			for(var i in sipgateffx_fax.component.contacts) {
				if(!sipgateffx_fax.component.contacts[i].tel) continue;
				for(var teltype in sipgateffx_fax.component.contacts[i].tel) {
					var type = teltype.toUpperCase().split(',');
					type.forEach(function(singletype, index) {
						try {
							type[index] = sipgateffx_fax.strings.getString('sipgateffxContact' + singletype);
						} catch(e) {
							type[index] = singletype;
						}
					});
					document.getElementById("sipgate_fax_number").appendItem(sipgateffx_fax.component.contacts[i].name + ' (' + type.join(' ') + ')', sipgateffx_fax.component.contacts[i].tel[teltype]);
				}
			}
		}
		
	},

	onContactSelect: function(element) {
		if(element.selectedItem.value.match(/^\+/)) {
			document.getElementById("sipgate_fax_number").value = element.selectedItem.value; 
		} else if(element.selectedItem.value.match(/^0/)) {
			document.getElementById("sipgate_fax_number").value = '+' + sipgateffx_fax.component.niceNumber(element.selectedItem.value);
		} else {
			document.getElementById("sipgate_fax_number").value = '+' + element.selectedItem.value;
		}
	},
	
	onUnload: function() {
	},

	doOpenFileBox: function doOpenFileBox()
	{
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Select a File", nsIFilePicker.modeOpen);
		fp.appendFilter("PDF","*.pdf");
		
		if (fp.show() != nsIFilePicker.returnCancel) {
			document.getElementById("sipgate_fax_file").setAttribute('value', fp.file.path);
		}		
	},

	doOK: function doOK()
	{
		var number = document.getElementById("sipgate_fax_number").value;
		var file = document.getElementById("sipgate_fax_file").value;

		if(number == '' || file == '') {
			sipgateffx_fax.promptService.alert(window, 'sipgateFFX', sipgateffx_fax.strings.getString('sipgateffxFaxNumberEmpty'));
			return false;
		}
		
		sipgateffx_fax.sending = true;	
		
		document.getElementById("sipgate_fax").setAttribute('hidden', 'true');
		document.getElementById("sipgate_fax_sending").setAttribute('hidden', 'false');
		
		var fileHandler = Components.classes["@mozilla.org/file/local;1"]
		                                     .createInstance(Components.interfaces.nsILocalFile);
		fileHandler.initWithPath(file);
		
		// |file| is nsIFile
		var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
		                        createInstance(Components.interfaces.nsIFileInputStream);
		var bstream = Components.classes["@mozilla.org/binaryinputstream;1"].
								createInstance(Components.interfaces.nsIBinaryInputStream);
		fstream.init(fileHandler, -1, -1, false);
		bstream.setInputStream(fstream);
		var bytes = bstream.readBytes(bstream.available());

		var remoteUri = '';
		var apiFunction = '';
		
		var numbers = number.split(',');
		
		if(numbers.length == 1) {
			
			apiFunction = 'SessionInitiate';
			remoteUri = "sip:"+ sipgateffx_fax.component.niceNumber(numbers[0]) +"\@sipgate.net";
			
		} else {
			
			apiFunction = 'SessionInitiateMulti';
			remoteUri = [];
			
			for (var i = 0; i < numbers.length; i++) {
				remoteUri.push("sip:"+ sipgateffx_fax.component.niceNumber(numbers[i]) +"\@sipgate.net");
			}
		}

		var params = { 'RemoteUri': remoteUri, 'TOS': "fax", 'Content': btoa(bytes) };
		
		// set if scheduled
		if(document.getElementById("sipgate_fax_schedule_check").checked) {
			var date = document.getElementById("sipgate_fax_schedule_date").dateValue;
			var time = document.getElementById("sipgate_fax_schedule_time");	
			date.setHours(time.hour);
			date.setMinutes(time.minute);		
			params.Schedule	= date;
		}

		var result = function(ourParsedResponse, aXML) {
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				sipgateffx_fax.promptService.alert(window, 'sipgateFFX', sipgateffx_fax.strings.getString('sipgateffxFaxSentSuccess'));
				window.close();
			} else {
				document.getElementById("sipgate_fax").setAttribute('hidden', 'false');
				document.getElementById("sipgate_fax_sending").setAttribute('hidden', 'true');
				sipgateffx_fax.sending = false;
				sipgateffx_fax.component.log((new XMLSerializer()).serializeToString(aXML));
				sipgateffx_fax.promptService.alert(window, 'sipgateFFX', sipgateffx_fax.strings.getString('sipgateffxFaxSentFailed'));
			}
		};

		sipgateffx_fax.component._rpcCall("samurai." + apiFunction, params, result);

		return false;
	},

	doCancel: function doCancel() {
		window.close();
	}	
};
window.addEventListener("load", function(e) { sipgateffx_fax.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_fax.onUnload(e); }, false); 
