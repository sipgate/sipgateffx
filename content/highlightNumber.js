// highlighNumber.js  FIREFOX
var sgffx;

var phoneRegExp = /((\+[1-9]\d)|(00[1-9]\d)|(0[^0]|([(\[][ \t\f]*[\d \t\f]+[ \t\f]*[)\]])))((((([ \t\f]*[(\[][ \t\f]*[\d \t\f]+[)\]][ \t\f]*)|([\d \t\f]{1,}[\.]?)))|(\(\d{3,}\)))[/]?(([ \t\f]*[\[(][\-\d \t\f]{3,}[\])][ \t\f]*)|([\-\d \t\f]{3,}))+)|(\+[1-9][\.\d]{4,})/;

function sipgateffxPageLoaded(aEvent)
{
	
	try {
		// this is needed to generally allow usage of components in javascript
		netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");

		sgffx = Components.classes['@api.sipgate.net/sipgateffx;1']
										.getService().wrappedJSObject;
		
	} catch (anError) {
		dump("ERROR: " + anError);
		return;
	}
	
//    if (aEvent.originalTarget.nodeName != "#document") return;
//    if (!document.getElementById("sipgateffx_numberHighlight").getAttribute("checked")) return;
//    var doc = aEvent.originalTarget;
    var doc = content.document;
    var body = doc.body;
    if (!body) return;

    var metaItems = doc.getElementsByTagName('meta');  
    for (var i=0; i<metaItems.length; i++)
    	if (metaItems[i].getAttribute('name') == "sipgateffx_click2dial") return;
    
    var headItems = doc.getElementsByTagName('head');
    if (headItems.length) 
    {
    	var webphoneMetaItem = doc.createElement("meta");
    	webphoneMetaItem.setAttribute("name","sipgateffx_click2dial");
    	webphoneMetaItem.setAttribute("value","enabled");
    	headItems[0].appendChild(webphoneMetaItem);
    }
	setTimeout(sipgateffxParseDOM, 0, body);
}

function sipgateffxParseDOM(aNode)
{
	var t0 = new Date().getTime();
	const tagsOfInterest = [ "a", "abbr", "acronym", "address", "applet", "b", "bdo", "big", "blockquote", "body", "caption",
	                         "center", "cite", "code", "dd", "del", "div", "dfn", "dt", "em", "fieldset", "font", "form", "h1", "h2", "h3",
	                         "h4", "h5", "h6", "i", "iframe", "ins", "kdb", "li", "object", "pre", "p", "q", "samp", "small", "span",
	                         "strike", "s", "strong", "sub", "sup", "td", "th", "tt", "u", "var" ];

 	var xpath = "//text()[(parent::" + tagsOfInterest.join(" or parent::") + ")]";
 	var candidates = content.document.evaluate(xpath, content.document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
 	
	for ( var cand = null, i = 0; (cand = candidates.snapshotItem(i)); i++)
	{
	    try {
	    	if (cand.nodeType == Node.TEXT_NODE) sipgateffxCheckPhoneNumber(cand);
        } catch (e) {
        	sgffx.log('*** sipgateffx: sipgateffxCheckPhoneNumber ERROR ' + e);
        }		
    }
	var t1 = new Date().getTime();
	sgffx.log('*** sipgateffx: Time for parsing the page with XPath: ' + (t1-t0));
	return 0;
}

function sipgateffxCheckPhoneNumber(aNode)
{	
    if (aNode.nodeValue.length<7) return 0;
    var text = aNode.nodeValue;
    var offset = 0;

    var i = 0;
    
    while(1)
    {
	    if(i > 5) {
	    	sgffx.log('sipgateffxCheckPhoneNumber: too many iterations. exiting on "' + text.replace(/^\s+|\s+$/g, "") + '"');
	    	return 1;
	    }

	    var results = text.match(phoneRegExp);
	    if (!results) {	    
	    	return 0;
	    }
	    
	    var number = results[0];
	    var pos = text.indexOf(number);
	    if (pos == -1) return 0;
	    offset += pos;

	    var done = 0;
	    if (number.replace(/\s/g, "").length > 6) {
		    // the character before the number MUST be " ", ",", ";", ":", ""
		    // otherwise we have a false positive
		    if(pos > 0 && !text.substr(pos-1,1).match(/[\s,;:|]/)) {
		    	sgffx.log('sipgateffxCheckPhoneNumber: possible false negative found "' + text.replace(/^\s+|\s+$/g, "") + '"');
		    	return 1;
		    }
		    
	        var spanNode;
    	
	        if (aNode.nodeValue.length == number.length && aNode.parentNode.childNodes.length == 0) {
                spanNode = aNode.parentNode;
	        }
	        else
	        {
	            spanNode = aNode.ownerDocument.createElement("nobr");
	            var range = aNode.ownerDocument.createRange();
	            range.setStart(aNode, offset);
	            range.setEnd(aNode, offset+number.length);
			    range.surroundContents(spanNode);
			    aNode = spanNode.nextSibling;
	        }
	        
	        var prettyNumber = number.replace(/[^0-9]/g,'');
	        
            var newNodeClick2DialIcon = aNode.ownerDocument.createElement("IMG");
            newNodeClick2DialIcon.style.border = 0;
            //newNodeClick2DialIcon.style.margin = "0px 5px 0px 0px";
            newNodeClick2DialIcon.style.cursor = "pointer";
            newNodeClick2DialIcon.style.verticalAlign = "top";
            newNodeClick2DialIcon.align = "bottom";
            newNodeClick2DialIcon.src = "chrome://sipgateffx/skin/icon_click2dial.gif";
            newNodeClick2DialIcon.width = "16";
            newNodeClick2DialIcon.height = "16";
            newNodeClick2DialIcon.alt = "sipgate Click2Dial";
            spanNode.appendChild(newNodeClick2DialIcon);
            
	        spanNode.style.backgroundColor = '#fff1b8';
	        spanNode.style.color = 'blue';
	        spanNode.style.cursor = 'pointer';
	        spanNode.style.MozBorderRadius = '3px';
	        spanNode.style.border = '1px solid #AAAAAA';
	        spanNode.title = "sipgate Click2Dial for " +  prettyNumber;
	        
	        spanNode.addEventListener("click", sipgateffxCallClick, false);
        	spanNode.setAttribute("sipgateffx_number", prettyNumber);

    	    text = text.substr(offset + number.length);
    	    offset = 0;
    	    done = 1;
	    }
	    
	    if(done==0) return 0;
	    
	    i++;
	}
	return 0;	
}

// invocate quando viene cliccato il popup di chiamata
function sipgateffxCallClick()
{   
    var number = this.getAttribute("sipgateffx_number");
    if (!number) return;
    var niceNumber = sgffx.niceNumber(number, "49");
    sgffx.click2dial(niceNumber);
    return;
}