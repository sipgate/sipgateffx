/*
XMLRPC Utility code.
------------------------------------------------------
*/
var bfXMLRPC = new Object();

bfXMLRPC.makeXML = function(method, myParams, isAtom) {
    if(!isAtom){
        var xml = <methodCall></methodCall>;
        xml.methodName = method;
        //i->0 is the URL
        for(var i=1; i < myParams.length; i++){
            xml.params.param += <param> <value> { bfXMLRPC.convertToXML(myParams[i], isAtom) }</value> </param>;
        }
		
        var theBlogCharType = "UTF-8";
		
        return '<?xml version="1.0" encoding="' + theBlogCharType + '" ?>' + xml.toXMLString();
    }
	
    return 0;
}

bfXMLRPC.convertToXML = function(myParams, isAtom) {
    //gPFFTempObject = myParams;
    if(!isAtom){
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
            var theDate = bfXMLRPC.iso8601Format(myParams).toString();
            var theErrorString = "NaNNaNNaNTNaN:NaN:NaN";
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
                tempVal += "<value>" + bfXMLRPC.convertToXML(myParams[i]) + "</value>";
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
	                        tempVal += "<member><name>" + x + "</name>" + "<value><base64><![CDATA[" +bfXMLRPC.convertToXML(myParams[x]) + "]]></base64></value>" +"</member>";
	                    }else{
	                        tempVal += "<member><name>" + x + "</name>" + "<value><string><![CDATA[" +bfXMLRPC.convertToXML(myParams[x]) + "]]></string></value>" +"</member>";
	                    }
                    
	                }else if(myParams[x].constructor.name == 'Date'){
	                    var theDate = bfXMLRPC.iso8601Format(myParams[x]).toString();
	                    var theErrorString = "NaNNaNNaNTNaN:NaN:NaN";
	                    if(theDate != theErrorString){
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" +"<dateTime.iso8601>" + theDate + "Z</dateTime.iso8601>" + "</value>" +"</member>";
	                    }else{
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" +"<dateTime.iso8601></dateTime.iso8601>" + "</value>" +"</member>";
	                    }
                    
	                }else if(myParams[x].constructor.name == 'Number'){
	                    if( myParams[x] == parseInt(myParams[x]) ){
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" +"<int>"  +bfXMLRPC.convertToXML(myParams[x]) + "</int>" + "</value>" +"</member>";
	                    }else{
	                        tempVal += "<member><name>" + x + "</name>" + "<value>" + "<double>" + bfXMLRPC.convertToXML(myParams[x]) + "</double>" + "</value>" +"</member>";
	                    }
	                }else{
	                    tempVal += "<member><name>" + x + "</name>" + "<value>" +bfXMLRPC.convertToXML(myParams[x]) + "</value>" +"</member>";
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
            
        //var paramObject = new XML("<string>" + myParams +"</string>");
        var paramObject = new XML(paramTemp);
        
        return paramObject;
    }
    
    return 0;
}

//XMLToObject is derived from GPL code originally by Flock Inc:
//For the original source, see: http://cvs-mirror.flock.com/index.cgi/mozilla/browser/components/flock/xmlrpc/content/xmlrpchelper.js?rev=1.1&content-type=text/vnd.viewcvs-markup
bfXMLRPC.XMLToObject = function(xml, nodeName) {
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
                arr.push (bfXMLRPC.XMLToObject(xml.data.value[i].children()[0]));
            }
            return arr;
        case 'struct':
            var struct = new Object ();
            for (var i=0; i < xml.member.length(); i++) {
                struct[xml.member[i].name.text()] = 
                    bfXMLRPC.XMLToObject(xml.member[i].value.children()[0], xml.member[i].name.text());
            }
            return struct;
        case 'base64':
			return (atob(xml.text().toString()));
        default:
			// SFLOG("Error parsing XML: " + xml.name().toString());
            //dump('error parsing XML');
    }
}

//Function is derived from GPL code originally by Flock Inc:
//For more informationm See:
bfXMLRPC.iso8601Format = function(date) 
{
    var datetime = date.getUTCFullYear();
    var month = String(date.getUTCMonth() + 1);
    datetime += (month.length == 1 ?  '0' + month : month);
    var day = date.getUTCDate();
    datetime += (day < 10 ? '0' + day : day);

    datetime += 'T';

    var hour = date.getUTCHours();
    datetime += (hour < 10 ? '0' + hour : hour) + ':';
    var minutes = date.getUTCMinutes();
    datetime += (minutes < 10 ? '0' + minutes : minutes) + ':';
    var seconds = date.getUTCSeconds();
    datetime += (seconds < 10 ? '0' + seconds : seconds);
	
	return datetime;
}

/*
    Replace all Stupid XML Requests with this object
    
    USAGE:
    //PffXmlHttpReq( aUrl, aType, aContent, aDoAuthBool, aUser, aPass) 
    theCall = new PffXmlHttpReq('http://theurl.com', "GET", null, false, null, null);
    
    theCall.onResult = function (aText, aXML) {
        alert("Good Result:" + aText);
    }
    theCall.onError = function (aStatusMsg, aXML) {
        alert("Bad Result:" + aStatusMsg);
    }
    theCall.prepCall(); //Set up The call (open connection, etc.)
    theCall.request.setRequestHeader("Content-Type", "text/xml");
    theCall.makeCall(); //Make the call
    theCall.makeCall();
    theCall.request.overrideMimeType ('text/xml');
*/
function PffXmlHttpReq( aUrl, aType, aContent, aDoAuthBool, aUser, aPass) {
    this.url = aUrl;
    this.posttype = aType;
    this.content = aContent;
    this.username = aUser;
    this.password = aPass;
    this.doAuth = aDoAuthBool;
    //this.callback = aCallBackFunc;
    this.request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
}

PffXmlHttpReq.prototype.prepCall = function () {
    
    if(this.doAuth){
        this.request.open(this.posttype, this.url, true, this.username, this.password);
        
        //Keeps stupid Authentication window from poping up
        this.request.channel.notificationCallbacks = {
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
        this.request.open(this.posttype, this.url, true);
    }
    
    var request = this.request;
    var onResult = this.onResult;
    var onError = this.onError;
    this.request.onreadystatechange = function () {
        if(request.readyState == 4){ 
            if (request.status < 300) {
                onResult(request.responseText, request.responseXML);
            }else{
                try{
                    onError(request.statusMessage, request.responseText);
                } catch(e) { alert("Error running onError: " + e); }
            } 
        }
    }
    
    if(this.posttype.toLowerCase() == "post"){
        try{
            this.request.setRequestHeader('Content-Length', this.content.length );
        }catch(e){}
    }
}

PffXmlHttpReq.prototype.makeCall = function () {
    this.request.send(this.content)
}
   
/*
    Defined by Inheritor
*/

PffXmlHttpReq.prototype.onError = function (message) {
    //foo
}

PffXmlHttpReq.prototype.onResult = function (aTestRes, aXMLRes) {
    //foo
}

