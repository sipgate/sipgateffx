/*****************************************************************************

    sipgate FFX - Extension for Mozilla Thunderbird email client
    Copyright (C) 2012 Ben Bucksch, Beonex

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
        button.id = "call_" + containerIDs[i];
        button.classList.add("call");
        button.setAttribute("label", this.strings.getString("call.label"));
        button.setAttribute("tooltiptext", this.strings.getString("call.tooltip"));
        button.addEventListener("command", function(e) { sipgateffx_ABEditOverlay.onClick(e); }, false);
        container.appendChild(button);

        var textbox = container.getElementsByTagName("textbox").item(0);
        textbox.addEventListener("change", function(e) { this.onPhoneChanged(e); }, false);
        textbox.addEventListener("blur", function(e) { this.onPhoneChanged(e); }, false);
        this.onPhoneChanged({ target : textbox }); // update right now
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
  },

  /**
   * Called when the user clicks on the "Call" button inside the contact overview pane.
   * @param e {Event}
   */
  onClick: function onClick(e)
  {
    try {
      e.preventDefault();
      var button = e.target;
      var textbox = button.parentNode.getElementsByTagName("textbox").item(0);
      if ( !textbox) throw "textfield not found";

      var number = textbox.value;
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
      number = this.component.niceNumber(number);
      if (this.component.getPref("extensions.sipgateffx.previewnumber", "bool")) {
          window.openDialog('chrome://sipgateffx/content/previewnumber.xul', 'sipgatePreviewnumber', 'chrome,centerscreen,resizable=no,titlebar=yes,alwaysRaised=yes', number);
      } else {
          this.component.click2dial(number, successCallback, function(msg) {
            alert(msg);
            errorCallback(msg);
          });
      }
  },
};

window.addEventListener("load", function () { sipgateffx_ABEditOverlay.onLoad(); }, false);
