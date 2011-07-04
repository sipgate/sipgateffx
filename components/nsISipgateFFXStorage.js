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

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
try{
	Components.utils.import("resource://gre/modules/AddonManager.jsm");
} catch(e) {}

var _sgffxStorage;

function SipgateFFXStorage() {
    this.wrappedJSObject = this;
    _sgffxStorage = this;
    this._conn = null;
    
    this.blacklisted = [];
    
    this.mLogBuffer = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
	this.mLogBufferMaxSize = 1000;
}

SipgateFFXStorage.prototype = {
	classDescription: "Storage Backend For sipgateFFX",
	classID: Components.ID("6651ED18-23B6-4A19-83FC-F9718D468AA7"),
	contractID: "@api.sipgate.net/sipgateffx-storage;1",
	QueryInterface: XPCOMUtils.generateQI(),

	openDatabase: function() {
		if(this._conn !== null) {
			return;
		}
		
		try {
			var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
			file.append("sipgateffx.sqlite");
			
			if(!file.exists()) {

				this.createDatabase(file);
				file.permissions = 420;

				_sgffxStorage.getBlacklistedSites();
				
			} else {	
				this._conn = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService).openDatabase(file);
				this.getBlacklistedSites();
			}
		} catch(e) {
			this.log("Failed to initialize database: " + e.message + "\n");
		}
	},
	
	createDatabase: function(file) {
		if(this._conn == null) {
			this._conn = Components.classes["@mozilla.org/storage/service;1"].getService(Components.interfaces.mozIStorageService).openDatabase(file);
		}

		// create recentNumbers
		this.execute('CREATE TABLE "recentNumbers" ("number" CHAR NOT NULL , "date" DATETIME DEFAULT CURRENT_TIMESTAMP);');

		// create c2dBlacklist
		this.execute('CREATE TABLE "c2dBlacklist" ("domain" TEXT NOT NULL ,"date_added" DATETIME);');
		
	},

	close: function() {
		this._conn.close();
	},

	// execute without results
	execute: function(statement) {
		try {
			this._conn.executeSimpleSQL(statement);
			return true;
		} catch (e) {
			this.log("Failed to execute query: (" + statement + ") " + this._conn.lastErrorString + "\n");
			return false;
		}
	},
	
	query: function(statement) {
		var res;
		try {
			res = this._conn.createStatement(statement);
		} catch (e) {
			this.log("Failed to prepare statement: (" + statement + ") " + this._conn.lastErrorString + "\n");
		}
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
	
	getValue: function(stmt, column) {
		var iType = stmt.getTypeOfIndex(column);
		var cell;
        switch (iType) {
        case stmt.VALUE_TYPE_NULL: 
						cell = null;
						break;
        case stmt.VALUE_TYPE_INTEGER:
						cell = stmt.getInt64(column);
						break;
        case stmt.VALUE_TYPE_FLOAT:
						cell = stmt.getDouble(column);
						break;
        case stmt.VALUE_TYPE_TEXT:
						cell = stmt.getString(column);
						break;
        case stmt.VALUE_TYPE_BLOB: //todo - handle blob properly
        	if (bBlobAsHex) {
              	var iDataSize = {value:0};
              	var aData = {value:null};
  							stmt.getBlob(i, iDataSize, aData);
  							cell = sm_blob2hex(aData.value);
        	}
        	else {
              cell = 'BLOB';
            }
						break;
        default: cell = "<unknown>"; 
      }
      return cell;
	},
	
	getBlacklistedSites: function(force) {
		if(this.blacklisted.length != 0 && force !== true) {
			return;
		}
		
		this.blacklisted = [];
		this.openDatabase();
		var stmt = this.query('SELECT domain FROM c2dBlacklist');
		
		while (stmt.executeStep()) {
			this.blacklisted.push(this.getValue(stmt, 0));
		}
	},
	
	isBlacklisted: function(host) {
		return (this.blacklisted.indexOf(host) >= 0);
	},
	
	addBlacklisting: function(host) {
		this.openDatabase();
		this.log('--- adding --> ' + host);
		var stmt = this.query('INSERT INTO c2dBlacklist ("domain", "date_added") VALUES (?, ?)');
		stmt.bindStringParameter(0, host);
		stmt.bindInt64Parameter(1, new Date().getTime());
		stmt.execute();
		stmt.reset();
		this.getBlacklistedSites(true);
	},

	removeBlacklisting: function(host) {
		this.openDatabase();
		this.log('--- removing --> ' + host);
		var stmt = this.query('DELETE FROM c2dBlacklist WHERE domain = ?');
		stmt.bindStringParameter(0, host);
		stmt.execute();
		stmt.reset();
		this.getBlacklistedSites(true);
	},
	
	lastErrorString: function () {
		return this._conn.lastErrorString;
	},
	
	log: function (logMessage) {
		try {
			var jetzt = new Date();
			var timestampFloat = jetzt.getTime() / 1000;
			var _CStringLogMessage = Components.classes["@mozilla.org/supports-cstring;1"].createInstance(Components.interfaces.nsISupportsCString);
			_CStringLogMessage.data = "[" + timestampFloat.toFixed(3) + "] " + logMessage;
			this.mLogBuffer.AppendElement(_CStringLogMessage);
			dump("[" + timestampFloat.toFixed(3) + "] " + logMessage + "\n");
			while (this.mLogBuffer.Count() > this.mLogBufferMaxSize) {
				this.mLogBuffer.DeleteElementAt(0);
			}
		} catch (ex) {
			dump("Error in _log(): "+ex+"\n");
		}
	}

};
var components = [SipgateFFXStorage];

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule(components);

/*
function NSGetModule(compMgr, fileSpec) {
	return XPCOMUtils.generateModule(components);
}
*/
