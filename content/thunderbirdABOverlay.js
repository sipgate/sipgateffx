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
 * This changes the contact overview in the lower right pane of the
 * main address book window of Thunderbird.
 *
 * It needs to change when the user changes the selection in the
 * upper list pane.
 *
 * <copied to="thunderbirdABEditOverlay.js">
 * If you make changes here, please check whether you need to
 * fix thunderbirdABEditOverlay.js, too.
 */
var sipgateffx_ABOverlay =
{
  /**
   * Called when the main address book window is being opened.
   */
  onLoad : function onLoad()
  {
    this.component = Components.classes["@api.sipgate.net/sipgateffx;1"].
        getService().wrappedJSObject;
    this.strings = document.getElementById("sipgateffx-strings");
  },

  /**
   * Called when a new contact is shown in the lower right pane
   * of the addressbook window.
   * We add our buttons, if not already there..
   * We will enable/disable the "Call" buttons
   * based on whether each field has a value.
   *
   * Hookup:
   * We listen to command update "addrbook-select" with our <commandset>.
   * called from http://mxr.mozilla.org/comm-central/source/mail/components/addrbook/content/addressbook.xul#630
   * <tree onselect="... updateCommands('addrbook-select');">
   *
   * The TB view update code is in
   * http://mxr.mozilla.org/comm-central/source/mail/components/addrbook/content/abCardViewOverlay.js#179
   * DisplayCardViewPane()
   * called from http://mxr.mozilla.org/comm-central/source/mail/components/addrbook/content/addressbook.js#113
   * called from http://mxr.mozilla.org/comm-central/source/mail/components/addrbook/content/addressbook.xul#630
   * <tree onselect="this.view.selectionChanged(); ... updateCommands('addrbook-select');">
   *
   * TB's card update empties the <description>s using .textContent = "foo",
   * removing our buttons on each update, but
   * luckily, the TB code runs from selectionChanged(), so we run afterward.
   */
  onContactOverviewLoad : function onContactOverviewLoad()
  {
    try {
      // create UI
      const descrIDs = [
        "cvPhWork",
        "cvPhHome",
        "cvPhFax",
        "cvPhCellular",
        "cvPhPager",
      ];
      // Thunderbird's cvSetNode() is doing descr.textContent = "foo", which
      // removes the buttons on each update, so we have to re-create them.
      for (let i = 0; i < descrIDs.length; i++) {
        let descr = document.getElementById(descrIDs[i]);
        let button = document.createElement("button");
        button.id = "call_" + descrIDs[i];
        button.classList.add("call");
        button.setAttribute("label", this.strings.getString("call.label"));
        button.setAttribute("tooltiptext", this.strings.getString("call.tooltip"));
        button.addEventListener("command", function(e) { sipgateffx_ABOverlay.onClick(e); }, false);
        descr.appendChild(button);
        // disabling not necessary, because TB collapses unused <descr>s.
        //let hasContent = descr.firstChild.nodeName == "#text";
        //button.setAttribute("disabled", !hasContent);
      }
    } catch (e) { alert(e); }
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
      var descr = button.parentNode.firstChild.textContent;
      // descr is e.g. "Home: 1343"
      var number = descr.substr(descr.indexOf(":") + 2);
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

window.addEventListener("load", function () { sipgateffx_ABOverlay.onLoad(); }, false);
