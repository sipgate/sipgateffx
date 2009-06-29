// highlighNumber.js  FIREFOX
var sgffx;

var phoneRegExp = /((\+[1-9]\d)|(00[1-9]\d)|(0[^0]|([(\[][ \t\f]*[\d \t\f]+[ \t\f]*[)\]])))((((([ \t\f]*[(\[][ \t\f]*[\d \t\f]+[)\]][ \t\f]*)|([\d \t\f]{1,}[\.]?)))|(\(\d{3,}\)))[/]?(([ \t\f]*[\[(][\-\d \t\f]{3,}[\])][ \t\f]*)|([\-\d \t\f]{3,}))+)|(\+[1-9][\.\d]{4,})/;
var allCountries = {
	"1[2-9]": "North America",
	"7": "Russia",
	"20": "Egypt",
	"27": "South Africa",
	"30": "Greece",
	"31": "Netherlands",
	"32": "Belgium",
	"33": "France",
	"34": "Spain",
	"36": "Hungary",
	"39": "Italy",
	"40": "Romania",
	"41": "Switzerland",
	"43": "Austria",
	"44": "United Kingdom",
	"45": "Denmark",
	"46": "Sweden",
	"47": "Norway",
	"48": "Poland",
	"49": "Germany",
	"51": "Peru",
	"52": "Mexico",
	"53": "Cuba",
	"54": "Argentina",
	"55": "Brazil",
	"56": "Chile",
	"56": "Easter Island",
	"57": "Colombia",
	"58": "Venezuela",
	"60": "Malaysia",
	"61": "Cocos-Keeling Islands",
	"61": "Australia",
	"61": "Christmas Island",
	"62": "Indonesia",
	"63": "Philippines",
	"64": "Chatham Island (New Zealand)",
	"64": "New Zealand",
	"65": "Singapore",
	"66": "Thailand",
	"81": "Japan",
	"82": "South Korea",
	"84": "Vietnam",
	"86": "China",
	"90": "Turkey",
	"91": "India",
	"92": "Pakistan",
	"93": "Afghanistan",
	"94": "Sri Lanka",
	"95": "Myanmar",
	"98": "Iran",
	"212": "Morocco",
	"213": "Algeria",
	"216": "Tunisia",
	"218": "Libya",
	"220": "Gambia",
	"221": "Senegal",
	"222": "Mauritania",
	"223": "Mali",
	"224": "Guinea",
	"225": "Ivory Coast",
	"226": "Burkina Faso",
	"227": "Niger",
	"228": "Togo",
	"229": "Benin",
	"230": "Mauritius",
	"231": "Liberia",
	"232": "Sierra Leone",
	"233": "Ghana",
	"234": "Nigeria",
	"235": "Chad",
	"236": "Central African Republic",
	"237": "Cameroon",
	"238": "Cape Verde",
	"239": "São Tomé and Príncipe",
	"240": "Equatorial Guinea",
	"241": "Gabon",
	"242": "Congo",
	"242": "Congo - Brazzaville",
	"243": "Congo, Dem. Rep. of (Zaire)",
	"243": "Congo - Kinshasa",
	"244": "Angola",
	"245": "Guinea-Bissau",
	"246": "Diego Garcia",
	"246": "British Indian Ocean Territory",
	"247": "Ascension",
	"248": "Seychelles",
	"249": "Sudan",
	"250": "Rwanda",
	"251": "Ethiopia",
	"252": "Somalia",
	"253": "Djibouti",
	"254": "Kenya",
	"255": "Zanzibar",
	"255": "Tanzania",
	"256": "Uganda",
	"257": "Burundi",
	"258": "Mozambique",
	"260": "Zambia",
	"261": "Madagascar",
	"262": "Réunion",
	"262": "Mayotte",
	"263": "Zimbabwe",
	"264": "Namibia",
	"265": "Malawi",
	"266": "Lesotho",
	"267": "Botswana",
	"268": "Swaziland",
	"269": "Comoros",
	"290": "Saint Helena",
	"291": "Eritrea",
	"297": "Aruba",
	"298": "Faroe Islands",
	"299": "Greenland",
	"350": "Gibraltar",
	"351": "Portugal",
	"352": "Luxembourg",
	"353": "Ireland",
	"354": "Iceland",
	"355": "Albania",
	"356": "Malta",
	"357": "Cyprus",
	"358": "Finland",
	"359": "Bulgaria",
	"370": "Lithuania",
	"371": "Latvia",
	"372": "Estonia",
	"373": "Moldova",
	"374": "Armenia",
	"375": "Belarus",
	"376": "Andorra",
	"377": "Monaco",
	"378": "San Marino",
	"379": "Vatican",
	"380": "Ukraine",
	"381": "Serbia",
	"382": "Montenegro",
	"385": "Croatia",
	"386": "Slovenia",
	"387": "Bosnia and Herzegovina",
	"389": "Macedonia",
	"420": "Czech Republic",
	"421": "Slovakia",
	"423": "Liechtenstein",
	"500": "Falkland Islands",
	"500": "South Georgia and the South Sandwich Islands",
	"501": "Belize",
	"502": "Guatemala",
	"503": "El Salvador",
	"504": "Honduras",
	"505": "Nicaragua",
	"506": "Costa Rica",
	"507": "Panama",
	"508": "Saint Pierre and Miquelon",
	"509": "Haiti",
	"590": "Saint Martin",
	"590": "Guadeloupe",
	"590": "Saint Barthélemy",
	"591": "Bolivia",
	"592": "Guyana",
	"593": "Ecuador",
	"594": "French Guiana",
	"595": "Paraguay",
	"596": "Martinique",
	"596": "French Antilles",
	"597": "Suriname",
	"598": "Uruguay",
	"599": "Netherlands Antilles",
	"599": "Curacao",
	"670": "Timor Leste",
	"670": "East Timor",
	"672": "Australian External Territories",
	"672": "Norfolk Island",
	"673": "Brunei",
	"674": "Nauru",
	"675": "Papua New Guinea",
	"676": "Tonga",
	"677": "Solomon Islands",
	"678": "Vanuatu",
	"679": "Fiji",
	"680": "Palau",
	"681": "Wallis and Futuna",
	"682": "Cook Islands",
	"683": "Niue",
	"685": "Samoa",
	"686": "Kiribati",
	"687": "New Caledonia",
	"688": "Tuvalu",
	"689": "French Polynesia",
	"690": "Tokelau",
	"691": "Micronesia",
	"692": "Marshall Islands",
	"800": "International Freephone Service",
	"808": "International Shared Cost Service (ISCS)",
	"808": "Wake Island",
	"850": "North Korea",
	"852": "Hong Kong SAR China",
	"853": "Macau SAR China",
	"855": "Cambodia",
	"856": "Laos",
	"870": "Inmarsat SNAC",
	"878": "Universal Personal Telecommunications (UPT)",
	"880": "Bangladesh",
	"881": "Global Mobile Satellite System (GMSS)",
	"886": "Taiwan",
	"960": "Maldives",
	"961": "Lebanon",
	"962": "Jordan",
	"963": "Syria",
	"964": "Iraq",
	"965": "Kuwait",
	"966": "Saudi Arabia",
	"967": "Yemen",
	"968": "Oman",
	"970": "Palestinian Territory",
	"971": "United Arab Emirates",
	"972": "Israel",
	"973": "Bahrain",
	"974": "Qatar",
	"975": "Bhutan",
	"976": "Mongolia",
	"977": "Nepal",
	"992": "Tajikistan",
	"993": "Turkmenistan",
	"994": "Azerbaijan",
	"995": "Georgia",
	"996": "Kyrgyzstan",
	"998": "Uzbekistan",
	"5399": "Cuba (Guantanamo Bay)",
	"5399": "Guantanamo Bay",
	"8810": "ICO Global (Mobile Satellite Service)",
	"8812": "Ellipso (Mobile Satellite service)",
	"8816": "Iridium (Mobile Satellite service)",
	"8818": "Globalstar (Mobile Satellite Service)",
	"8811": "ICO Global (Mobile Satellite Service)",
	"8813": "Ellipso (Mobile Satellite service)",
	"8817": "Iridium (Mobile Satellite service)",
	"8819": "Globalstar (Mobile Satellite Service)",
	"88213": "EMSAT (Mobile Satellite service)",
	"88216": "Thuraya (Mobile Satellite service)"
	};
var countryCodeRegex;

function _prepareArray() {
	var tmp="/^XXX";
	for(i in allCountries) {
		tmp += "|^" + i;
	}
	tmp += "/";
	countryCodeRegex = new RegExp(tmp);
}

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

		    if(number.match(/^\+|^00|^011/) && !countryCodeRegex.test(number.replace(/^\+|^00|^011|\D/g, ""))) {
		    	sgffx.log('sipgateffxCheckPhoneNumber: unknown country code on "' + number.replace(/^\+|^00|^011|\D/g, "") + '"');
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
	        
	        spanNode.addEventListener("click", sipgateffxCallClick, true);
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
function sipgateffxCallClick(e)
{   
    var number = this.getAttribute("sipgateffx_number");
    if (!number) return;
    var niceNumber = sgffx.niceNumber(number, "49");
    sgffx.click2dial(niceNumber);
    return;
}