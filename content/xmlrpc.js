/*
XMLRPC Utility code.
------------------------------------------------------
*/

var gLastPostID = null;
var gPFFTempObject = [];
var gPFFRightAfterPost = false;
var gPFFLastURIPost = "";
var performancing_xmlcall = new Object();

performancing_xmlcall.init = function() {
    this.lastResponseData = null;
    this.appkey = "0123456789ABCDEF";
}

//Send XMLRPC Command
performancing_xmlcall.sendCommand = function(theURL, theXMLString, theAction, additionalInfo, theGUID, aCallFunction) { //Both arguments have to be strings
	var theCall = new PffXmlHttpReq(theURL, "POST", theXMLString, false, null, null);

	theCall.onResult = function( aText, aXML ){
		aCallFunction(theCall.request.responseText, additionalInfo, theAction, theGUID);
	};

	theCall.onError = function (aStatusMsg, Msg) {
		var errorMessage = '';

		switch (theCall.request.status) {
			case 403:
				errorMessage = performancingUI.getLocaleString("status.403");
			break;
			case 404:
				errorMessage = performancingUI.getLocaleString("status.404");
			break;
			default:
				errorMessage = performancingUI.getLocaleString("status.default", [ theCall.request.status, theURL, theXMLString ]);
			break;
		}

		alert(errorMessage);

		if (theAction == "accountwizard") {
			clearLoginTimeOut();
			goTo('login');
		}
	};

	theCall.prepCall();
	theCall.request.setRequestHeader("Content-Type", "text/xml");
	theCall.makeCall();
	theCall.request.overrideMimeType ('text/xml');
}

performancing_xmlcall.processData = function(theXML, additionalInfo, theAction, theGUID, isAtom) {
	var ourParsedResponse = null;
	
    if(!isAtom){
        var re = /(\<\?\xml[0-9A-Za-z\D]*\?\>)/;
        var newstr = theXML.replace(re, "");

		try {
        	var e4xXMLObject = new XML(newstr);
		} catch (e) {
			alert(performancingUI.getLocaleString("malformedXML"));
			
			if(theAction == "accountwizard"){
				clearLoginTimeOut();
				goTo('login');
				return;
			}
		}

        if (e4xXMLObject.name() != 'methodResponse' ||
                !(e4xXMLObject.params.param.value.length() == 1 ||
                    e4xXMLObject.fault.value.struct.length() == 1)) {
			if (theXML != '') {
            	var localeString2 = performancingUI.getLocaleString('apiurlnonexistant', [gPFFLastURIPost]);
            	alert(localeString2 + "\nXML Response:"+theXML);
			}
        }
    
        if (e4xXMLObject.params.param.value.length() == 1) {
            ourParsedResponse = bfXMLRPC.XMLToObject(e4xXMLObject.params.param.value.children()[0]);
        }
        
        if(e4xXMLObject.fault.children().length() > 0 ) {
            ourParsedResponse = bfXMLRPC.XMLToObject( e4xXMLObject.fault.value.children()[0]);
        }
    }else{
        ourParsedResponse = theXML;
    }
    this.lastResponseDataObject = ourParsedResponse;
    
    //Now do something!
    if(theAction == "accountwizard"){
        processReturnData(this.lastResponseDataObject, isAtom, theXML); //For account wizard calls
    }else{
        performancing_xmlcall.processReturnData(this.lastResponseDataObject , theAction, additionalInfo, isAtom, theGUID, newstr); //for all other calls
    }
}

performancing_xmlcall.replaceText = function(inString,oldText,newText) {
return (inString.split(oldText).join(newText));
}

performancing_xmlcall.processReturnData = function(theObject, theAction, additionalInfo, isAtom, theGUID){
    var isError = false;
	
    if(!isAtom){
        if(theObject.length == null){
            if(theObject.faultString){
				if ((theAction != "pagelistcall") && (theAction != "newcategorycall")){
	                var localeString = performancingUI.getLocaleString('requesterror', [theObject.faultString]);
	       	        alert(localeString);
	           	    performancingUI.okClearPost();
				}
				else {
					// Wordpress API pre new API
					SCRIBEFIRE_BLOG.serviceObject.supportsPages = false;
					SCRIBEFIRE_BLOG.serviceObject.addCategories = false;
					SCRIBEFIRE_BLOG.serviceObject.createCategories = false;
				}
				
               	isError = true;
            }
		}
	}
	
	if (theAction == "newcategorycall"){
		if (isError){
			// The category already exists.
			var catArr = [additionalInfo];
			var doNotCheckClear = performancingUI.hasCheckboxChildren('blog-sidebar-listing-categories');
			gPerformancingUtil.setCategoriesSidebar(theCategoryArray, !doNotCheckClear);
		}
		else {
			// We need to set the "cat" attribute to the id that was returned.
			var catID = theObject.toString();
			
			var checkList = document.getElementById("blog-sidebar-listing-categories");
			for (var i = 0; i < checkList.childNodes.length; i++) {
				if (checkList.childNodes[i].getAttribute("label") == additionalInfo){
					checkList.childNodes[i].setAttribute("cat",catID);
					break;
				}
			}
		}
	}
	else if ((theAction == "pagelistcall") && (!isError)){
		SCRIBEFIRE_BLOG.serviceObject.supportsPages = true;
		SCRIBEFIRE_BLOG.serviceObject.addCategories = true;
		SCRIBEFIRE_BLOG.serviceObject.createCategories = true;
		
		// Wordpress blog whose API supports Pages and adding categories
		window.setTimeout(function () { gPerformancingUtil.getBlogPages(theGUID); }, 0);
		document.getElementById("blog-sidebar-categories-addbtn").hidden = false;
		
		document.getElementById("tab-pages").setAttribute("disabled","false");
	}
	else if (theAction == "pagescall") {
		gPerformancingUtil.clearListOut('performancing-pages-list');
		
		if(!isError){
			var theTitle = null;
			var theContent = null;
			var moreContent = "";
			var theCategories = "";
			var thePostID = null;
			var thePostLink = null;
			var atomEditURI = null;
			var blogName = gPerformancingUtil.currentBlogName;
			
			for(k = 0; k < theObject.length; k++){
				try { theTitle = theObject[k].title.toString(); theTitle = theTitle.replace(/\s\s+/gi, " "); } catch(e) { theTitle = "Untitled" }
				try { theContent = theObject[k].description.toString(); } catch(e) { }
				try { thePostLink = theObject[k].permaLink.toString(); } catch(e) { thePostLink = ""; }
				try { theDateCreated = theObject[k].dateCreated.toString(); } catch(e) { theDateCreated = ""; }
				try { thePostID = theObject[k].page_id; } catch(e) { thePostID = ""; }
				try { isDraft = theObject[k].page_status.toString() == 'draft'; } catch (e) { isDraft = false; }
				
				SCRIBEFIRE_HISTORY.saveItem(thePostID, theContent, theTitle, "", theDateCreated, "", isDraft, 'page');
	
				var tempArray = [theTitle];
				gPerformancingUtil.addItemToList([tempArray], k, 'performancing-pages-list', theGUID, theTitle, "SCRIBEFIRE_HISTORY.addHistoryItemToEditor(this, 'page');", theDateCreated, thePostID, null, null, isDraft );
	
				if(gPFFRightAfterPost == true && gLastPostID == thePostID) {
					gPFFRightAfterPost = false;
					performancingUI.deliciousAddTechnorati(thePostLink, theTitle, isAtom, atomEditURI);
					window.setTimeout(function () {
					        performancingUI.sendTrackBacks(theTitle, thePostLink, blogName);
					    }, 2500);
				}
			}
		}
	}
	else if(theAction == "historycall"){
        gPerformancingUtil.clearListOut('performancing-history-list');
        if(!isError){
                //aPostid, aTitle, aDescription, aDateCreated, aPublish
                //gPerformancingUtil.addItemToList(tempArray, j, 'performancing-history-list');
                //dump("History Response Length: "+theObject.length + "\n");
                gPerformancingUtil.clearListOut('performancing-history-list');
                var theTitle = null;
                var theContent = null;
                var theCategories = null;
				var theTags = null;
                var thePostID = null;
                var thePostLink = null;
                var atomEditURI = null;
				var isDraft = false;
                var blogName = gPerformancingUtil.currentBlogName;
				
                for(k = 0; k < theObject.length; k++){
                    //gBlogObject[k].postid, gBlogObject[k].postDate
                    try{
                        //dump("Try finding .TITLE \n");
                        theTitle = theObject[k].title.toString();
                    }catch(e){
                        theTitle = "Untitled"
                    }
                    //Remove any extra spaces (atleast 2 or more consecutive spaces)
                    theTitle = theTitle.replace(/\s\s+/gi, " ");
                    try{
                        theContent = theObject[k].content.toString();
                    }catch(e){
                        
                    }

					try {
						isDraft = (theObject[k].post_status.toString() == 'draft');
					} catch (e) {
						if (!theObject[k].permaLink) {
							isDraft = true;
						}
						else {
							isDraft = false;
						}
					}
                    
                    try{
                        theContent = theObject[k].description.toString();
                        //alert("theContent: "+ theContent)
                    }catch(e){
                        //alert("Content Error: "+ e)
                    }

                    dump("\n\n History Content: \n" +theContent+ "\n\n");
                    //categories
                    var moreContent = "";
                    try{
                        moreContent = theObject[k].mt_text_more.toString();
                    }catch(e){
                    }

                    if(moreContent != ""){
                        theContent = theContent + "<!--more-->" + moreContent;
                    }
                    
					try {
						var ljTitle = null;
						
						if (ljTitle = theContent.match(/<title>([^<]*)<\/title>/i)[1]) {
							theTitle = ljTitle;
							theContent = theContent.replace("<title>"+ljTitle+"</title>", "");
						}
					} catch (e) {
					}

                    try{
                        theCategories = theObject[k].categories.toString();
                        //alert("theCategories: " + theCategories);
                    }catch(e){
                        theCategories = "";
                    }
                    
					try {
						theTags = theObject[k].mt_keywords.toString();
					} catch (e) {
						try {
							theTags = theObject[k].tags.toString();
						} catch (e) {
							theTags = '';
						}
					}
					

                     //links
                    try{
                        thePostLink = theObject[k].permaLink.toString();
                    }catch(e){
                        thePostLink = "";
                    }
                    
                    //theDateCreated

                    try{
						if (theObject[k].date_created_gmt) {
							theDateCreated = theObject[k].date_created_gmt.toString();
						}
						else {
                        	theDateCreated = theObject[k].dateCreated.toString();
						}
                    }catch(e){
                        theDateCreated = "";
                    }

					var isScheduled = false;
					
					try {
						var d = new Date(theDateCreated);
						
						if (d.getTime() > (new Date().getTime())) {
							isScheduled = true;
						}
					} catch (e) { }
                    
                     //Atom links
                    try{
                        atomEditURI = theObject[k].editURI.toString();
                        //thePostLink = atomEditURI;
                    }catch(e){
                        atomEditURI = "";
                    }
                    
                    try{
                        if(theObject[k].postid == null){
                            thePostID = theObject[k].postId; //LiveJournal Hack, bastards!!
                        }else{
                            thePostID = theObject[k].postid;
                        }
                    }catch(e){
                        thePostID = "";
                    }
                    //gPFFTempObject.push(thePostID);
                    
					SCRIBEFIRE_HISTORY.saveItem(thePostID, theContent, theTitle, theCategories, theDateCreated, theTags, isDraft, 'post');
					
                    var tempArray = [ theTitle];
                    //dataArray, number, listIDname, theGUID, theURL, onItemClick, aDate, aPostId
                    gPerformancingUtil.addItemToList([tempArray], k, 'performancing-history-list', theGUID, theTitle, "SCRIBEFIRE_HISTORY.addHistoryItemToEditor( this, 'post' );", theDateCreated, thePostID, "", thePostLink, isDraft, isScheduled );
                    
                    if( gPFFRightAfterPost == true && gLastPostID == thePostID ){
                        gPFFRightAfterPost = false;
                        performancingUI.deliciousAddTechnorati(thePostLink, theTitle, isAtom, atomEditURI);
                        window.setTimeout(function () {
    					        performancingUI.sendTrackBacks(theTitle, thePostLink, blogName);
    					    }, 2500);
                    }
                }
        }
    }else if(theAction == "categorycall"){
        //dump('\n Got Categorycall BlogObject: ' + theObject + '\n');
        if(!isError){
            //dump("Response Length: "+theObject.length + "\n");
            gPerformancingUtil.clearCheckListOut('blog-sidebar-listing-categories');
            //gBlogObject.categoryId, gBlogObject.categoryName
            //gPFFTempObject = theObject;
            var theCatArray = [];
            var theCatIdArray = [];
            if( theObject.length >= 0 ){
                for(k = 0; k < theObject.length; k++){
                    //ROLLER metaWebLoghack
                    var tempArray = null;
                    try{
                        if(theObject[k].categoryName.toString() != ""){
                            tempArray = [theObject[k].categoryName];
                        }
                    }catch(e){
                        try{
                            if(theObject[k].title.toString() != ""){
                                tempArray = [theObject[k].title];
                            }
                        }catch(e){
                            if(theObject[k].description.toString() != ""){
                            tempArray = [theObject[k].description];
                            }
                        }
                    }
                    //gPerformancingUtil.addItemToCheckList([tempArray], k, 'blog-sidebar-listing-categories', null, theObject[k].categoryId, "" );
                    theCatArray.push(tempArray + "\t" + theObject[k].categoryId);
                    //theCatIdArray.push(theObject[k].categoryId);
                }
                
                //Should we sort the list?
                var doTheSort = false;
                try{
                    doTheSort = gPerformancingUtil.prefs.getBoolPref("display.sortcats");
                }catch(e){
                    doTheSort = false;
                }
                
                function sortTags(a, b) {
                	a = a.toLowerCase();
                	b = b.toLowerCase();
                	if (a < b) return -1;
                	else if (b < a) return 1;
                	else return 0;
                }
                
                if(doTheSort){
                    theCatArray.sort(sortTags);
                }
                
                //Now add the Cat List
                var theCatID = "";
                for(l = 0; l < theCatArray.length; l++){
                    theNewCatArray = theCatArray[l].split("\t");
                    gPerformancingUtil.addItemToCheckList([theNewCatArray[0].replace(/&amp;/g, "&")], l, 'blog-sidebar-listing-categories', null, theNewCatArray[1], "" );
                }
                
            }else{
                for(x in theObject){ 
                    var tempArray = x.toString();
                    gPerformancingUtil.addItemToCheckList([tempArray], 0, 'blog-sidebar-listing-categories', null, '', "" );
                }
            }
        }
    }else if(theAction == "newpostcall"){
        if(!isError){
	        //Fix for Blogger/ATOM
            if(theObject.uid != null){
                gLastPostID = theObject.uid;
            }else{
                gLastPostID = theObject;
            }
    
			if (gTempPost) {
				gPerformancingUtil.grabBlogCode(gLastPostID);
			}
			else {
	            gPFFRightAfterPost = true;
	            //dump('\n Got New Post BlogObject: ' + theObject + '\n');
	            //Call clear content and mark as posted to user!
	            performancingEditor.postSuccessful();
            
	            //Fix for Blogger/ATOM
	            if(theObject.uid != null){
	                gLastPostID = theObject.uid;
	            }else{
	                gLastPostID = theObject;
	            }
	            gLastPostID = gLastPostID.toString();
	            //Now set the category (if there are categories checked)
	            gPerformancingUtil.setCategoryList(gLastPostID, additionalInfo);
            
	            theGUID = gPerformancingUtil.prefs.getCharPref("settings.lastselected.blog");
	            var theBlogURL = document.getElementById("blog-group").selectedItem.getAttribute("tooltiptext");
	            var blogName = gPerformancingUtil.currentBlogName;
            
	            window.setTimeout(function () { performancingUI.doPing(blogName, theBlogURL); }, 3000);
            
	            window.setTimeout(function () { gPerformancingUtil.getBlogHistory(theGUID); }, 0);
	            //gPerformancingUtil.getBlogHistory(theGUID);
			}
        }

		document.getElementById("input-tags").value = '';
    }else if(theAction == "newpagecall"){
        if(!isError){
            gPFFRightAfterPost = true;
			
            //Call clear content and mark as posted to user!
            performancingEditor.postSuccessful();
            
            //Fix for Blogger/ATOM
            if(theObject.uid != null){
                gLastPostID = theObject.uid;
            }else{
                gLastPostID = theObject;
            }
            gLastPostID = gLastPostID.toString();
            
            window.setTimeout(function (name, url) { performancingUI.doPing(name, url); }, 3000, SCRIBEFIRE_BLOG.name, SCRIBEFIRE_BLOG.url);
            window.setTimeout(function () { gPerformancingUtil.getBlogPages(); }, 0);
        }
    }else if(theAction == "editpostcall"){
        if(!isError){
            gPFFRightAfterPost = true;
            //dump('\n Got Edit Post BlogObject: ' + theObject + '\n');
            //Call clear content and mark as posted to user!
            performancingEditor.postSuccessful();
            
            //Now set the category (if there are categories checked)
            var thePostID = performancingEditor.getCurrentEditorWindow().pffEditorUI.entryId;
            gPerformancingUtil.setCategoryList(thePostID, additionalInfo);
            
            theGUID = gPerformancingUtil.prefs.getCharPref("settings.lastselected.blog");
            
            var theBlogURL = document.getElementById("blog-group").selectedItem.getAttribute("tooltiptext");
            var blogName = gPerformancingUtil.currentBlogName;
            window.setTimeout(function (blogName, theBlogURL) { performancingUI.doPing(blogName, theBlogURL); }, 3000, blogName, theBlogURL);
            
            window.setTimeout(function () { gPerformancingUtil.getBlogHistory(theGUID); }, 0);
            //gPerformancingUtil.getBlogHistory(theGUID);
            gLastPostID = thePostID;
        }
    }else if(theAction == "setcategoriescall"){
        //dump('\n Categories got set!!\n');
        //Now publish it! This fixes a typepad category bug
        //gPerformancingUtil.publishThePost(gLastPostID);
        //Now publish it! This fixes a typepad category bug
        if(!gIsDraft){
            gPerformancingUtil.publishThePost(gLastPostID);
        }
    }else if(theAction == "deletehistorycall"){
        //dump('\n\n Post Deleted!!\n');
        theGUID = gPerformancingUtil.prefs.getCharPref("settings.lastselected.blog");
        gPerformancingUtil.getBlogHistory(theGUID); //re get the new list now

		if (!gTempPost) {
        	var localeString = performancingUI.getLocaleString('postdeleted', []);
        	alert(localeString);
        
			performancingUI.reLoadBlogs();
			performancingEditor.closeTab();
		}
		else {
			performancingEditor.getCurrentEditorWindow().performancingMidas.syncPreviewFromSource();
			performancingEditor.getCurrentEditorDocument().getElementById("performancing-publish-deck").selectedIndex = 0;
			gTempPost = false;
		}
	}
	else if (theAction == "postcategories") {
		var categoryArray = [];
		
		for (var i = 0; i < theObject.length; i++) {
			categoryArray.push(theObject[i].categoryName);
		}
		
		gPerformancingUtil.setCategoriesSidebar(categoryArray, false, true);
	}
	
	return true;
}

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

bfXMLRPC.makePingXML = function(theMethodName, theBlogName, theBlogURL) {
         thePingXML = new XML();
        //The Content for each Blog
        thePingXML =
                     <methodCall>
                         <methodName>{theMethodName}</methodName>
                          <params>
                           <param>
                           <value>{theBlogName}</value>
                           </param>
                           <param>
                           <value>{theBlogURL}</value>
                           </param>
                          </params>
                      </methodCall>;
        return "<?xml version=\"1.0\"?>" + thePingXML.toXMLString();
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

