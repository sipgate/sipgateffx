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

/*
XMLRPC Utility code.
------------------------------------------------------
*/
var EXPORTED_SYMBOLS = ["bfXMLRPC", "Request"];

var bfXMLRPC = {
	makeXML: function(method, myParams) {
        var xml = <methodCall></methodCall>;
        xml.methodName = method;
        //i->0 is the URL
        for(var i=1; i < myParams.length; i++){
            xml.params.param += <param> <value> { this.convertToXML(myParams[i]) }</value> </param>;
        }
		
        var theBlogCharType = "UTF-8";
		
        return '<?xml version="1.0" encoding="' + theBlogCharType + '" ?>' + xml.toXMLString();
	},
	
	convertToXML: function(myParams, isValue) {
        var paramType = myParams.constructor.name;
        var paramTemp = null;

        switch (paramType){
            
          case "Number":
            if( myParams == parseInt(myParams) ){
                paramTemp = "<int>" + myParams + "</int>";
            }else{
                paramTemp = "<double>" + myParams + "</double>";
            }
            break;
            
          case "String":
            if( myParams.toString() == 'bool1'){
                paramTemp = "<boolean>1</boolean>";
            }else if( myParams.toString() == 'bool0' ){
                paramTemp = "<boolean>0</boolean>";
            }else{
                paramTemp = "<string><![CDATA[" + myParams + "]]></string>";
            }
            break;
            
          case "Boolean"://0,1, true, false
            paramTemp = "<boolean>" + myParams + "</boolean>";
            break;

          case "Date": //Date Object: var date = new Date();
            var theDate = this.iso8601Format(myParams).toString();
            var theErrorString = "NaNNaNNaNTNaNNaNNaN";
            if(theDate != theErrorString){
                paramTemp = "<dateTime.iso8601>" + theDate + "Z</dateTime.iso8601>";
            }else{
                paramTemp = "<dateTime.iso8601></dateTime.iso8601>";
            }
            break;
            
          case "Array": //Array Object
            var tempVal = "<array><data>";
            //for(var i=0;i<myParams.length;++i)
            for(var i = 0; i < myParams.length; i++)
            {
                //dump("\n i: " + i + "\n")
                tempVal += this.convertToXML(myParams[i], true);
            }
            tempVal += "</data></array>";
            paramTemp = tempVal;
            break;
            
          case "Object": //Array Object
            var tempVal = "<struct>";
            //for(var i=0;i<myParams.length;++i)
            for(x in myParams)
            {
				if (typeof myParams[x] != 'undefined') {
	                if(myParams[x].constructor.name == 'String'){
	                    if(x == "bits"){
	                        tempVal += "<member><name>" + x + "</name>" + "<value><base64><![CDATA[" +this.convertToXML(myParams[x]) + "]]></base64></value>" +"</member>";
	                    }else{
	                        tempVal += "<member><name>" + x + "</name>" + "<value><string><![CDATA[" +this.convertToXML(myParams[x]) + "]]></string></value>" +"</member>";
	                    }
                    
	                }else if(myParams[x].constructor.name == 'Date'){
	                    var theDate = this.iso8601Format(myParams[x]).toString();
	                    var theErrorString = "NaNNaNNaNTNaNNaNNaN";
	                    if(theDate != theErrorString){
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" +"<dateTime.iso8601>" + theDate + "Z</dateTime.iso8601>" + "</value>" +"</member>";
	                    }else{
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" +"<dateTime.iso8601></dateTime.iso8601>" + "</value>" +"</member>";
	                    }
                    
	                }else if(myParams[x].constructor.name == 'Number'){
	                    if( myParams[x] == parseInt(myParams[x]) ){
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" +"<int>"  +this.convertToXML(myParams[x]) + "</int>" + "</value>" +"</member>";
	                    }else{
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" + "<double>" + this.convertToXML(myParams[x]) + "</double>" + "</value>" +"</member>";
	                    }
	                }else{
	                    tempVal += "<member><name>" + x + "</name>" + "<value>" +this.convertToXML(myParams[x]) + "</value>" +"</member>";
	                }
				}
            }
            tempVal += "</struct>";
            paramTemp = tempVal;
            break;
            
          default:
            paramTemp = "<![CDATA[" + myParams + "]]>";
            break;
            
        }
        
		if(isValue) {
			paramTemp = "<value>" + paramTemp + "</value>";
		}
		
        var paramObject = new XML(paramTemp);
        
        return paramObject;

	},
	
	//XMLToObject is derived from GPL code originally by Flock Inc:
	//For the original source, see: http://cvs-mirror.flock.com/index.cgi/mozilla/browser/components/flock/xmlrpc/content/xmlrpchelper.js?rev=1.1&content-type=text/vnd.viewcvs-markup
	XMLToObject: function(xml, nodeName) {
	    try{
	        if (xml.nodeKind()) {
	            //foo
	        }
	    }catch(e){
	        //foo
	        xml = new XML(xml);
	    }
	    //gPFFTempObject = xml;
	    
	    if (xml.nodeKind() == 'text') {
	            // the default type in string
	            return xml.toString();
	    }
	        
	    switch (xml.name().toString()) {
	        case 'int':
	        case 'i4':
	            return parseInt (xml.text());
	        case 'boolean':
	            return (parseInt (xml.text()) == 1);
	        case 'string':
	            return (xml.text().toString());
	        case 'double':
	            return parseFloat (xml.text());
	        case 'dateTime.iso8601':
	            var val = xml.text().toString().replace(/^\s+|\s+$/g, "");
	
				if (val.match(/z/i) || (nodeName && nodeName == 'date_created_gmt')) {
		            val = val.replace(/\-/gi, "");
		            val = val.replace(/\z/gi, "");
		            var dateutc =  Date.UTC(val.slice(0, 4), val.slice(4, 6) - 1, 
		                    val.slice(6, 8), val.slice(9, 11), val.slice(12, 14), 
		                    val.slice(15,17));
					return new Date(dateutc);
				}
				else {
					// Check for a timezone offset
					var possibleOffset = val.substr(-6);
					var hasTimezone = false;
					var minutes = null;
					
					if (possibleOffset.charAt(0) == "-" || possibleOffset.charAt(0) == "+") {
						var hours = parseInt(possibleOffset.substr(1,2), 10);
						var minutes = (hours * 60) + parseInt(possibleOffset.substr(4,2), 10);
						
						if (possibleOffset.charAt(0) == "+") {
							minutes *= -1;
						}
						
						hasTimezone = true;
					}
					
					val = val.replace(/\-/gi, "");
					var dateutc =  Date.UTC(
						val.slice(0, 4), 
						val.slice(4, 6) - 1, 
						val.slice(6, 8), 
						val.slice(9, 11), 
						val.slice(12, 14), 
						val.slice(15,17));
					dateutc = new Date(dateutc);
					
					if (!hasTimezone) {
						minutes = new Date(dateutc).getTimezoneOffset();
					}
					
					var offsetDate = dateutc.getTime();
					offsetDate += (1000 * 60 * minutes);
					dateutc.setTime(offsetDate);
					return dateutc;
				}
	        case 'array':
	            var arr = new Array ();
	            for (var i=0; i<xml.data.value.length(); i++) {
	                arr.push (this.XMLToObject(xml.data.value[i].children()[0]));
	            }
	            return arr;
	        case 'struct':
	            var struct = new Object ();
	            for (var i=0; i < xml.member.length(); i++) {
	                struct[xml.member[i].name.text()] = 
	                    this.XMLToObject(xml.member[i].value.children()[0], xml.member[i].name.text());
	            }
	            return struct;
	        case 'base64':
				return (atob(xml.text().toString()));
	        default:
				// SFLOG("Error parsing XML: " + xml.name().toString());
	            //dump('error parsing XML');
	    }
	},
	
	//Function is derived from GPL code originally by Flock Inc:
	//For more informationm See:
	iso8601Format: function(date) 
	{
	    var datetime = date.getUTCFullYear();
	    var month = String(date.getUTCMonth() + 1);
	    datetime += (month.length == 1 ?  '0' + month : month);
	    var day = date.getUTCDate();
	    datetime += (day < 10 ? '0' + day : day);
	
	    datetime += 'T';
	
	    var hour = date.getUTCHours();
	    datetime += (hour < 10 ? '0' + hour : hour);
	    var minutes = date.getUTCMinutes();
	    datetime += (minutes < 10 ? '0' + minutes : minutes);
	    var seconds = date.getUTCSeconds();
	    datetime += (seconds < 10 ? '0' + seconds : seconds);
		
		return datetime;
	},
	
    // Converts a UTF-8 encoded string to ISO-8859-1  
    // 
    // version: 905.3122
    // discuss at: http://phpjs.org/functions/utf8_decode
    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // +      input by: Aman Gupta
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: Norman "zEh" Fuchs
    // +   bugfixed by: hitwork
    // +   bugfixed by: Onno Marsman
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: utf8_decode('Kevin van Zonneveld');
    // *     returns 1: 'Kevin van Zonneveld'
	utf8decode: function(str_data) {
	    var tmp_arr = [], i = 0, ac = 0, c1 = 0, c2 = 0, c3 = 0;
	    
	    str_data += '';
	    
	    while ( i < str_data.length ) {
	        c1 = str_data.charCodeAt(i);
	        if (c1 < 128) {
	            tmp_arr[ac++] = String.fromCharCode(c1);
	            i++;
	        } else if ((c1 > 191) && (c1 < 224)) {
	            c2 = str_data.charCodeAt(i+1);
	            tmp_arr[ac++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
	            i += 2;
	        } else {
	            c2 = str_data.charCodeAt(i+1);
	            c3 = str_data.charCodeAt(i+2);
	            tmp_arr[ac++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
	            i += 3;
	        }
	    }
	
	    return tmp_arr.join('');
	}
	
};

Function.prototype.bind = function(bind, args) {
	var self = this;
	
	args = (args == null) ? null : args;
	
	return function(){
		return self.apply(bind, args || arguments);
	};
};

function Request(aUrl, aMethod, aData, aDoAuthBool, aUser, aPass) {
	this.url = aUrl;
	this.data = aData;
    this.username = aUser;
    this.password = aPass;
    this.doAuth = aDoAuthBool;
	this.headers = {
			'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
		};
	this.async = true;
	this.method = 'post';
	this.link = 'ignore';
	this.encoding = 'utf-8';
	this.running = false;
	this.status = 0;
	this.response = {text: null, xml: null};
	
	this.onSuccess = function(text, xml) {};
	this.onFailure = function(message) {};
	this.onCancel = function() {};
	this.onRequest = function() {};
	
	this.xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);

	this.setHeader = function(key, value) {
		this.headers[key] = value;
	};

	this.setHeaders = function(headers) {
		for(var key in headers) {
			this.setHeader(key, headers[key]);
		}
	};

	this.onStateChange = function(){
		if (this.xhr.readyState != 4 || !this.running) return;
		this.running = false;
		this.status = 0;
		
		try {
			this.status = this.xhr.status;
		} catch (e) {}		

		if(typeof(this.isSuccess) == 'function') {
			var success = this.isSuccess.call(this, this.status);
			if(success) {
				this.response = {text: this.xhr.responseText, xml: this.xhr.responseXML};
				this.success(this.response.text, this.response.xml);
			} else {
				this.response = {text: null, xml: null};
				this.failure();
			}
		}

		this.xhr.onreadystatechange = function(){};
	};

	this.isSuccess = function(){
		return ((this.status >= 200) && (this.status < 300));
	};

	this.success = function(text, xml){
		this.onSuccess(text, xml);
	};
	
	this.failure = function(){
		this.onFailure(this.xhr.status, this.xhr.responseText);
	};
	
	this.check = function(caller){
		if (!this.running) return true;
		switch (this.link){
			case 'cancel': this.cancel(); return true;
			// case 'chain': this.chain(caller.bind(this, Array.slice(arguments, 1))); return false;
		}
		return false;
	};
	
	this.send = function(options){
		if (!this.check(arguments.callee)) return this;
		this.running = true;

		var data = this.data;
		var url = this.url;
		var method = this.method;

		if (data && method == 'get'){
			url = url + ( url.indexOf('?') !== -1 ? '&' : '?') + data;
			data = null;
		}

	    if(data && method == "post"){
	        try{
	            this.headers['Content-Length'] = data.length;
	        }catch(e){}
	    }

		this.xhr.mozBackgroundRequest = true;
		
	    if(this.doAuth){
			this.xhr.open(method.toUpperCase(), url, this.async, this.username, this.password);
        
	        //Keeps stupid Authentication window from poping up
	        this.xhr.channel.notificationCallbacks = {
	            QueryInterface: function (iid) { // nsISupports
	                if (iid.equals (Components.interfaces.nsISupports) ||
	                    iid.equals (Components.interfaces.nsIAuthPrompt) ||
	                    iid.equals (Components.interfaces.nsIInterfaceRequestor)) {
	                        return this;
	                }
	                throw Components.results.NS_ERROR_NO_INTERFACE;
	            },
	            getInterface: function (iid, result) { // nsIInterfaceRequestor
	                if (iid.equals (Components.interfaces.nsIAuthPrompt)) {
	                    return this;
	                }
	                Components.returnCode = Components.results.NS_ERROR_NO_INTERFACE;
	                return null;
	            },
	            prompt: function (dialogTitle, text, passwordRealm, savePAssword, 
	                    defaultText, result) { // nsIAuthPromptInterface
	                return false;
	            },
	            promptUsernameAndPassword: function (dialogTitle, text, 
	                    passwordRealm, savePassword, user, pwd) {
	                          //Didn't work, asking for password again
	                return false;
	            },
	            promptPassword: function (dialogTitle, text, passwordRealm, savePassword, user) {
	                return false;
	            }
	        }
	    }else{
			this.xhr.open(method.toUpperCase(), url, this.async);
	    }
	    
		for (var key in this.headers){
			var value = this.headers[key];
			try {
				this.xhr.setRequestHeader(key, value);
			} catch(e) {
				dump("Failed to set header --- " + key + " --- \n");
			}
		}

		this.xhr.onreadystatechange = this.onStateChange.bind(this);
		
		if (typeof(this.onRequest) == 'function') {
			this.onRequest();
		};		
		
		try {
			this.xhr.send(data);
		} catch (e) {
			dump('xhr.send EXCEPTION: ' + e + "\n");
		}
		
		if (!this.async) this.onStateChange();
		
		return this;
	};
	
	this.cancel = function(){
		if (!this.running) return this;
		this.running = false;
		this.xhr.abort();
		this.xhr.onreadystatechange = function() {};
		this.xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
		if (typeof(this.onCancel) == 'function') {
			this.onCancel();
		};
		
		return this;
	};
	
};