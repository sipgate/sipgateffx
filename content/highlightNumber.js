// highlighNumber.js  FIREFOX
var sgffx;

var sipgateffxHN = {
    numberItem: null,
    showTooltip: true,
    // phoneRegExp: /(^|[\s])((\+[1-9]\d)|(00[1-9]\d)|(0[^0]|([(\[][ \t\f]*[\d \t\f]+[ \t\f]*[)\]])))((((([ \t\f]*[(\[][ \t\f]*[\d \t\f]+[)\]][ \t\f]*)|([\d \t\f]{1,}[\.]?)))|(\(\d{3,}\)))[/]?(([ \t\f]*[\[(][\-\d \t\f]{3,}[\])][ \t\f]*)|([\-\d \t\f]{3,}))+)|(\+[1-9][\.\d]{4,})([\s]|$)/, 
    phoneRegExp: /((\+[1-9]\d)|(00[1-9]\d)|(0[^0]|([(\[][ \t\f]*[\d \t\f]+[ \t\f]*[)\]])))((((([ \t\f]*[(\[][ \t\f]*[\d \t\f]+[)\]][ \t\f]*)|([\d \t\f]{1,}[\.]?)))|(\(\d{3,}\)))[/]?(([ \t\f]*[\[(][\-\d \t\f]{3,}[\])][ \t\f]*)|([\-\d \t\f]{3,}))+)|(\+[1-9][\.\d]{4,})/, 
    //phoneRegExp: /((((\+|(00))[1-9]\d{0,3}[\s\-.]?)?\d{2,4}[\s\/\-.]?)|21)\d{5,9}/,
    //phoneRegExpUSA: /(\+1\s?)?\(?\d{3}\)?[\s-.]?\d{3}[\s-.]?\d{4}/,
    phoneRegExpUSA: /(\+1\s?)?-?\(?\d{3}\)?-?[\s-.]?\d{3}[\s-.]?\d{4}/,
    hideTimeout: null
};

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
    	if (metaItems[i].getAttribute('name') == "sipgateffx_extension") return;
    
    var headItems = doc.getElementsByTagName('head');
    if (headItems.length) 
    {
    	var webphoneMetaItem = doc.createElement("meta");
    	webphoneMetaItem.setAttribute("name","sipgateffx_extension");
    	headItems[0].appendChild(webphoneMetaItem);
    }
	setTimeout(sipgateffxParseDOM, 0, body);
}

function sipgateffxParseDOM(aNode)
{
    if (aNode.nodeName == "SCRIPT" || aNode.nodeName == "A")     return 0;
    if (aNode.nodeName == "SELECT" || aNode.nodeName == "INPUT") return 0;  
    if (aNode.nodeName == "TEXTAREA" )                           return 0;
    
    /** specifics for WYSIWYG HTML editors **/
    // TODO: gestire i casi di altri html editor
    // if (aNode.className && (aNode.className == "mceContentBody") )return 0; //tinyMCE
    // if (aNode.className && (aNode.className == "htmlarea")  ) return 0; //htmlarea

    for (var i=0; i<aNode.childNodes.length; i++) i += sipgateffxParseDOM(aNode.childNodes[i]);
    if (aNode.nodeType == Node.TEXT_NODE) return sipgateffxCheckPhoneNumber(aNode);
	return 0;	
}

function sipgateffxCheckPhoneNumber(aNode)
{	
    if (aNode.nodeValue.length<7) return 0;
    var text = aNode.nodeValue;
    var offset = 0;
    while(1)
    {
    
        var usaPhone = false;
	    var results = text.match(sipgateffxHN.phoneRegExp);
	    if (!results) {	    
	        results = text.match(sipgateffxHN.phoneRegExpUSA);	        
    	    if (results) {
                usaPhone = true;
            } else {
              return 0;
            }
	    }

	    var number = results[0];
	    var pos = text.indexOf(number);
	    if (pos == -1) return 0;
	    offset += pos;
	    if (!(pos && !text.substr(pos-1,1).match(/[\s,;:|]/)) &&
	        !(text.length > pos+number.length && !text.substr(pos+number.length,1).match(/[\s.,;:|]/))){
	    	//text = text.replace(/[^0-9]/g, '');
	        var spanNode;
	        if (aNode.nodeValue.length == number.length && aNode.parentNode.childNodes.length == 0)
                spanNode = aNode.parentNode;
	        else
	        {
	            spanNode = aNode.ownerDocument.createElement("nobr");
	            var range = aNode.ownerDocument.createRange();
	            range.setStart(aNode, offset);
	            range.setEnd(aNode, offset+number.length);
	            var docfrag = range.extractContents();
	            var before = range.startContainer.splitText(range.startOffset);
	            var parent = before.parentNode;
	            spanNode.appendChild(docfrag);
	            parent.insertBefore(spanNode, before);
	        }
	        
	        number = number.replace(/[^0-9]/g,'');
	        
            var newNodeClick2DialIcon = aNode.ownerDocument.createElement("IMG");
            newNodeClick2DialIcon.style.border = 0;
            //newNodeClick2DialIcon.style.margin = "0px 5px 0px 0px";
            newNodeClick2DialIcon.style.cursor = "pointer";
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
	        spanNode.title = "sipgate Click2Dial for " +  number;
	        
	        spanNode.addEventListener("click", sipgateffxCallClick, false);
            if (usaPhone && number.substr(0,2)!="+1") spanNode.setAttribute("sipgateffx_number", "+1" + number);
	        else spanNode.setAttribute("sipgateffx_number", number);
	        return 1;
	    }
	    offset += number.length;
	    text = text.substr(pos + number.length);
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