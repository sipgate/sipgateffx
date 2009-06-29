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

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var Cc = Components.classes;
var Ci = Components.interfaces;
var _sgffxStorage;

function SipgateFFXStorage() {
    this.wrappedJSObject = this;
    _sgffxStorage = this;
    this._conn = {};
}

SipgateFFXStorage.prototype = {
	classDescription: "Storage Backend For sipgateFFX",
	classID: Components.ID("{6651ED18-23B6-4A19-83FC-F9718D468AA7}"),
	contractID: "@api.sipgate.net/sipgateffx-storage;1",
	QueryInterface: XPCOMUtils.generateQI(),

	openDatabase: function() {
		var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
			file.append("sipgateffx.sqlite");

		var storageService = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService);
		this._conn = storageService.openDatabase(file); // Will also create the file if it does not exist	
	},
	
	close: function() {
		this._conn.close();
	},

	// execute without results
	execute: function(statement) {
		this._conn.executeSimpleSQL(statement);
	},
	
	query: function(statement) {
		var res;
		res = this._conn.createStatement(statement);
		return res;
	},
	
	insert: function(obj) {
	    var sql = "INSERT INTO " + obj._tablename + " (";
	    for (var col_name in obj) {
	      sql += col_name + ",";
	    }
	    sql += ") VALUES (";
	    for (var value in obj) {
	      sql += "?,";
	    }
	    sql += ")";
	    dump(sql);
	},
	
	lastErrorString: function () {
		return this._conn.lastErrorString;
	}

};
var components = [SipgateFFXStorage];

function NSGetModule(compMgr, fileSpec) {
	return XPCOMUtils.generateModule(components);
}

function dumpJson(obj) {
	var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
	                 .createInstance(Components.interfaces.nsIJSON);
	dump(nativeJSON.encode(obj)+"\n");
};
