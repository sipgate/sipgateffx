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
var sipgateffxcontactstrings;
var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

var sipgateffx_contact = {
	saving: false,
	generateDisplayName: true,
		
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

		sipgateffxcontactstrings = document.getElementById("sipgateffx_contact-strings");

		if(typeof window.arguments != "undefined") {
			if(typeof window.arguments[0] != "undefined") {
				document.getElementById("HomePhone").setAttribute('value', window.arguments[0]);
				try {
					this.getContact(window.arguments[0]);
				} catch(e) {
					sgffx.log('contactOverlay getContact FAILED with ' + e);
				}
			}
		}

	},

	dumpJson: function(obj) {
		var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
		                 .createInstance(Components.interfaces.nsIJSON);
		sgffx.log(nativeJSON.encode(obj));
	},
	
	onUnload: function() {},

	doOK: function() {
		if(sipgateffx_contact.saving) return;
		
		/* 
		 * ORG: $org;
		 * N:$family;$first;;;
		 * FN:$displayname
		 * EMAIL;INTERNET:$email
		 * EMAIL;INTERNET:$email2
		 * TEL;WORK;ISDN:$telwork
		 * TEL;HOME;ISDN:$telhome
		 * TEL;FAX:$fax
		 * TEL;CELL:$cell
		 * ADR;HOME: $adr;;;;;;
		 */
		
		var vCard = ['BEGIN:VCARD', 'VERSION:2.1'];

		if(document.getElementById("Organization").value != '')
			vCard.push('ORG:'+ document.getElementById("Organization").value + ';');

		if(document.getElementById("FirstName").value != '' || document.getElementById("LastName").value != '')
			vCard.push('N:' + document.getElementById("LastName").value +';' + document.getElementById("FirstName").value + ';;;');
		
		if(document.getElementById("DisplayName").value != '')
			vCard.push('FN:'+ document.getElementById("DisplayName").value);
		
		if(document.getElementById("PrimaryEmail").value != '')
			vCard.push('EMAIL;INTERNET:'+ document.getElementById("PrimaryEmail").value);
		
		if(document.getElementById("SecondEmail").value != '')
			vCard.push('EMAIL;INTERNET:'+ document.getElementById("SecondEmail").value);
		
		if(document.getElementById("WorkPhone").value != '')
			vCard.push('TEL;WORK;ISDN:'+ sgffx.niceNumber(document.getElementById("WorkPhone").value));
		
		if(document.getElementById("HomePhone").value != '')
			vCard.push('TEL;HOME;ISDN:'+ sgffx.niceNumber(document.getElementById("HomePhone").value));
		
		if(document.getElementById("FaxNumber").value != '')
			vCard.push('TEL;FAX:'+ sgffx.niceNumber(document.getElementById("FaxNumber").value));
		
		if(document.getElementById("CellularNumber").value != '')
			vCard.push('TEL;CELL:'+ sgffx.niceNumber(document.getElementById("CellularNumber").value));
		
		if(document.getElementById("Address").value != '')
			vCard.push('ADR;HOME:'+ document.getElementById("Address").value + ';;;;;;');
		
		if(vCard.length <= 2) 
			return false;
		
		vCard.push('END:VCARD');
		
		sipgateffx_contact.saving = true; 
		
		var params = { 'EntryList': [{'EntryID': '', 'Entry': vCard.join("\n")}]};

		sgffx.log(params.EntryList.Entry);
		
		var result = function(ourParsedResponse, aXML) {
			sipgateffx_contact.saving = false;
			if (ourParsedResponse.StatusCode && ourParsedResponse.StatusCode == 200) {
				sgffx.getPhonebookList();
				promptService.alert(window, 'sipgateFFX', sipgateffxcontactstrings.getString('sipgateffxContactSaveSuccess'));
				window.close();
			} else {
				sgffx.log((new XMLSerializer()).serializeToString(aXML));
				promptService.alert(window, 'sipgateFFX', sipgateffxcontactstrings.getString('sipgateffxContactSaveFailed'));
			}
		};

		sgffx._rpcCall("samurai.PhonebookEntrySet", params, result);
		
		return false;
	},

	doCancel: function() {
		window.close();
	},
	
	GenerateDisplayName: function() {
		if (!sipgateffx_contact.generateDisplayName)
			return;

		var displayName;
		var firstNameValue = document.getElementById("FirstName").value;
		var lastNameValue = document.getElementById("LastName").value;
		
		if (lastNameValue && firstNameValue) {
			displayName =  firstNameValue + ' ' + lastNameValue;
		} else {
			// one (or both) of these is empty, so this works.
			displayName = firstNameValue + lastNameValue;
		}
		
		document.getElementById("DisplayName").value = displayName;
	},
	
	DisplayNameChanged: function() {
		  // turn off generateDisplayName if the user changes the display name
		  sipgateffx_contact.generateDisplayName = false;
	},

	getContact: function(number) {
		var niceNumber = sgffx.niceNumber(number);
		if(niceNumber.match(/^49[2-9]/) == null)
			return;
		else
			niceNumber = niceNumber.replace(/^49/, '0');
		
		Components.utils.import("resource://sipgateffx/xmlrpc.js");
		
		var now = 0;
		
		sgffx.log("entering getContact");
		document.getElementById("ReverseLookup").hidden = false; 	
		
		var req = new Request();
		req.method = 'get';
		req.url = "http://www.11880.com/Suche/index.cfm";
		req.data = "fuseaction=Suche.rueckwaertssucheresult&init=true&tel=" + niceNumber;

		req.onFailure = function() {
			document.getElementById("ReverseLookup").hidden = true;
			sgffx.log("Something went wrong while requesting 11880.com.");
			sgffx.log("Request took " + ((new Date().getTime() / 1000)-now) + ' seconds');
			
		}

		req.onSuccess = function(aText, aXML) {
			sgffx.log("Request succeeded.");
			sgffx.log("Request took " + ((new Date().getTime() / 1000)-now) + ' seconds');
			var results = aText.match(/a href=\"[^\']*\'([^\']*vcard[^\']*)\'(.*)\".*>/);
			
			if(results != null && typeof results[1] != 'undefined') {
				sgffx.log('URL for vCard: ' + results[1]);
				sgffx.log("Start downloading vCard");

				var vcardReq = new Request();
				vcardReq.method = 'get';
				vcardReq.url = "http://www.11880.com" + results[1];
				vcardReq.onFailure = function() {
					document.getElementById("ReverseLookup").hidden = true;
					sgffx.log("Something went wrong while downloading vCard.");
				}
				vcardReq.onSuccess = function(aText, aXML) {
					document.getElementById("ReverseLookup").hidden = true; 	

					sgffx.log("Downloaded vCard: " + aText);
					if(aText.match(/^BEGIN:VCARD/)) {
						
						var vcardModule = {};
						Components.utils.import("resource://sipgateffx/vcard.js", vcardModule);
						
						var contact = vcardModule.vCard.initialize(aText);
						
						if(contact['fn'])
							document.getElementById("DisplayName").value = contact['fn'];
						
						if(contact['org'])
							document.getElementById("Organization").value = contact['org'];
						
						if(contact['n']) {
							if(contact['n'][0])
								document.getElementById("LastName").value = contact['n'][0];
							if(contact['n'][1])
								document.getElementById("FirstName").value = contact['n'][1];
						}
						
						if(contact['adr']) {
							// find only the first contact
							if(typeof(contact['adr']) == 'object') {
								for(var i in contact['adr']) {
									if(typeof(contact['adr'][i][0]) != 'undefined' && contact['adr'][i][0].length > 0) {
										var tmp = [];
										for(var k=0; k<contact['adr'][i][0].length; k++)
										{
											if(typeof(contact['adr'][i][0][k]) != 'undefined' && contact['adr'][i][0][k].replace(/^\s*|\s$/g,'') != '') {
												tmp.push(contact['adr'][i][0][k]);
											}
										}
										document.getElementById("Address").value = tmp.join(', ');
									}
									break;
								}
							}

							if(contact['n'][0])
								document.getElementById("LastName").value = contact['n'][0];
							if(contact['n'][1])
								document.getElementById("FirstName").value = contact['n'][1];
						}
						
					}
				}
				vcardReq.send();
			} else {
				document.getElementById("ReverseLookup").hidden = true;
				sgffx.log("Could not find any matches or 11880.com page has changed.");
			}
		};
		
		sgffx.log("Starting reverse phone number lookup");
		now = new Date().getTime() / 1000;
		req.send();
	}
	
  
};
window.addEventListener("load", function(e) { sipgateffx_contact.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_contact.onUnload(e); }, false); 