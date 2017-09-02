/*****************************************************************************

    sipgate FFX - Extension for Mozilla Thunderbird email client
    Copyright (C) 2012 Ben Bucksch, Beonex

    The original code is hosted at
    http://www.github.com/sipgate/sipgateffx

    Alternatively, this file is available as MPL 1.1, MPL 2.0 or GPL 2.x.

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
/**
 * This changes the contact edit dialog of the
 * address book of Thunderbird, which opens when you double-click
 * on a contact.
 *
 * The buttons need to change when the user enters or removes a phone number.
 *
 * <copied from="thunderbirdABOverlay.js">
 * If you make changes here, please check whether you need to
 * fix thunderbirdABOverlay.js, too.
 */
var sipgateffx_ABEditOverlay =
{
  /**
   * Called when the main address book window or
   * the contact edit dialog is being opened.
   */
  onLoad : function onLoad()
  {
    try{
    this.component = Components.classes["@api.sipgate.net/sipgateffx;1"].
        getService().wrappedJSObject;
    this.strings = document.getElementById("sipgateffx-strings");

    // Create UI
    // Call buttons
    const containerIDs = [
        "WorkPhoneContainer",
        "HomePhoneContainer",
        "FaxNumberContainer",
        "PagerNumberContainer",
        "CellularNumberContainer",
      ];
      for (let i = 0; i < containerIDs.length; i++) {
        let container = document.getElementById(containerIDs[i]);

        let button = document.createElement("button");
        button.id = "sipgateFFX_call_" + containerIDs[i];
        button.classList.add("call");
        button.setAttribute("label", this.strings.getString("call.label"));
        button.setAttribute("tooltiptext", this.strings.getString("call.tooltip"));
        button.addEventListener("command", function(e) { sipgateffx_ABEditOverlay.onClickCall(e); }, false);
        container.appendChild(button);

        let smsButton = document.createElement("button");
        smsButton.id = "sipgateFFX_sms_" + containerIDs[i];
        smsButton.classList.add("sms");
        smsButton.setAttribute("label", this.strings.getString("sms.label"));
        smsButton.setAttribute("tooltiptext", this.strings.getString("sms.tooltip"));
        if (containerIDs[i] == "CellularNumberContainer") {
          smsButton.addEventListener("command", function(e) { sipgateffx_ABEditOverlay.onClickSMS(e); }, false);
        } else {
          smsButton.setAttribute("disabled", true);
        }
        container.appendChild(smsButton);

        var textbox = container.getElementsByTagName("textbox").item(0);
        textbox.addEventListener("change", function(e) { this.onPhoneChanged(e); }, false);
        textbox.addEventListener("blur", function(e) { this.onPhoneChanged(e); }, false);
        this.onPhoneChanged({ target : textbox }); // update right now
      }

      // SMS button
      {
        let containerID = "CellularNumberContainer";
        let container = document.getElementById(containerID);

      }
    } catch (e) { alert(e); }
  },

  /**
   * Called when the content of the phone number text field changes.
   * We will enable/disable the corresponding "Call" button based on
   * the new value.
   * @param e {Event} change event on the textbox
   */
  onPhoneChanged : function onPhoneChanged(e)
  {
    if ( !e.target.localName == "textbox") throw "only textbox events here";
    var textbox = e.target;
    var button = textbox.parentNode.getElementsByClassName("call").item(0);
    if ( !button) throw "button not found";
    button.setAttribute("disabled", !textbox.value);

    var smsButton = textbox.parentNode.getElementsByClassName("sms").item(0);
    if ( !smsButton) throw "button not found";
    if (smsButton.id == "sipgateFFX_sms_CellularNumberContainer") {
      smsButton.setAttribute("disabled", !textbox.value);
    }
  },

  /**
   * Called when the user clicks on the "Call" button inside the contact overview pane.
  * @param e {Event}
  */
  onClickCall: function onClickCall(e)
  {
    try {
      e.preventDefault();
      var button = e.target;
      var number = this._getNumber(button);
      button.setAttribute("status", "calling");
      var done = function() {
        button.removeAttribute("status");
      }
      this.call(number, done, done);
    } catch (e) { alert(e); }
  },

  /**
   * Called when the user clicked on the "Call" button.
   * Makes the actual phone call.
   * Shows error dialog, if necessary.
   * Shows confirmation dialog, if user has set this in prefs.
   */
  call : function call(number, successCallback, errorCallback)
  {
      if (this.component.getPref("extensions.sipgateffx.previewnumber", "bool")) {
          window.openDialog('chrome://sipgateffx/content/previewnumber.xul', 'sipgatePreviewnumber', 'chrome,centerscreen,resizable=no,titlebar=yes,alwaysRaised=yes', number);
      } else {
          this.component.click2dial(number, successCallback, function(msg) {
            alert(msg);
            errorCallback(msg);
          });
      }
  },

  /**
   * Called when the user clicks on the "SMS" button inside the contact overview pane.
  * @param e {Event}
  */
  onClickSMS: function onClickSMS(e)
  {
    try {
      e.preventDefault();
      var number = "+" + this._getNumber(e.target);
      window.openDialog("chrome://sipgateffx/content/sms.xul", "sipgateSMS", "chrome,centerscreen,resizable=yes,titlebar=yes,alwaysRaised=yes", "", number);
    } catch (e) { alert(e); }
  },

  _getNumber : function(button)
  {
    var textbox = button.parentNode.getElementsByTagName("textbox").item(0);
    if ( !textbox) throw "textfield not found";
    var number = textbox.value;
    return  this.component.niceNumber(number); // without leading +
  },

};

window.addEventListener("load", function () { sipgateffx_ABEditOverlay.onLoad(); }, false);
