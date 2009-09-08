//     ____________
//    |            |    A Javascript parser for vCards
//    |  vCard.js  |    Created by Mattt Thompson, 2008
//    |            |    Released under the MIT License
//     ̅̅̅̅̅̅̅̅̅̅̅̅
var EXPORTED_SYMBOLS = ["vCard"];

vCard = {
  initialize: function(_input){
    var vc = {};
    this.parse(_input, vc);
    
    vc.prototype = vCard.Base;
    return vCard.extend(vc, vCard.SingletonMethods);
  },
  parse: function(_input, fields) {
    var regexps = {
      simple: new RegExp(/^(version|n|fn|title|org|bday)(\;.*)?\:(.+)$/i),
      complex: new RegExp(/^([^\:\;]+);([^\:]+)\:(.+)$/),
      key: new RegExp(/item\d{1,2}\./),
      properties: new RegExp(/((type=)?(.+);?)+/),
      prefix:  new RegExp(/^[^\.\;\:]*\./),
      trim:	  new RegExp(/^(\t|\s|\n|\r)*|(\t|\s|\n|\r)*$/g)
    }
 
    var lines = _input.split('\n');
    
    for (n in lines) {
      line = lines[n];
            
      line = line.replace(regexps['prefix'],'');
      line = line.replace(regexps['trim'],'');
      
      if(regexps['simple'].test(line))
      {
        results = line.match(regexps['simple']);
        key = results[1].toLowerCase();
        value = results[3];

        if(results[2] && results[2].match(/quoted-printable/i)) {
        	value = value.replace(/=\r\n/gm, '');
        	value = value.replace(/=([0-9A-F]{2})/gim, function(sMatch, sHex) {
        		return String.fromCharCode(parseInt(sHex, 16));
        	});
        }
        
        value = /;/.test(value) ? value.split(';') : value;
        
        fields[key] = value;
      }
      
      else if(regexps['complex'].test(line))
      {
        results = line.match(regexps['complex']);
        key = results[1].replace(regexps['key'], '').toLowerCase();
        
        properties = results[2].split(';');
        properties = Array.filter(properties, function(p) { return ! p.match(/[a-z]+=[a-z]+/) });
        properties = Array.map(properties, function(p) { return p.replace(/type=/g, '') });
        
        type = properties.pop() || 'default';
        type = type.toLowerCase();
        type = type.replace(/type=/,'');
        
        value = results[3];
        value = /;/.test(value) ? [value.split(';')] : value;

        fields[key] = fields[key] || {};
        fields[key][type] = fields[key][type] || [];
        fields[key][type] = fields[key][type].concat(value);
      }
    }
  
  },
  SingletonMethods: {
    to_html: function() {
      var output = '<div class="vcard">';
      
      if(this.photo)
      {
        output += '<img class="photo" src="data:image/png;base64,' + this.photo['base64'][0] + '" />';
      }
      
      output += '<span class="fn">' + this.fn + '</span>'; // Required
    
      
      
      if(this.title)
      {
        output += '<span class="title">' + this.title + '</span>';
      }
      
      if(this.org)
      {
        output += '<span class="org">' + this.org + '</span>';
      }

      output += '<hr/>'
      
      for(type in this.adr)
      {
        for(n in this.adr[type])
        {
          value = this.adr[type][n];
          
          output += '<address class="adr">';
          output += '<span class="type">' + type + '</span>';
          output += '<div class="content">';
        
          adr_fields = ['post-office-box', 'extended-address', 'street-address', 
                        'locality', 'region', 'postal-code', 'country-name'       ]
          for(field in adr_fields)
          {
            if(value[field])
            {      
              output += '<span class="' + adr_fields[field] + '">';
              output += value[field];
              output += '</span>';
            }
          }
        
          output += '</div>';
          output += '</address>';
        }
      }
      
      for(type in this.tel)
      {
        for(n in this.tel[type])
        {
          value = this.tel[type][n];
          output += '<span class="tel">';
          output += '<span class="type">' + type + '</span>';
          output += '<span class="value">' + value + '</span>';
          output += '</span>';
        }
      }
      
      for(type in this.email)
      {
        for(n in this.email[type])
        {
          value = this.email[type][n];
          output += '<span class="email">';
          output += '<span class="type">' + type + '</span>';
          output += '<a class="value" href="mailto:' + value + '">' + value + '</a>';
          output += '</span>';
        }
      }
      
      for(type in this.url)
      {
        for(n in this.url[type])
        {
          value = this.url[type][n];
          output += '<span class="url">';
          output += '<span class="type">' + type + '</span>';
          output += '<a class="value" href="' + value + '">' + value + '</a>';
          output += '</span>';
        }
      }
      
      output += '</div>';
      output = output.replace(/\\n/g, '<br/>');
      return output;
    }
  },
  extend : function(dest, source) {
    for (var prop in source) dest[prop] = source[prop];
    return dest;
  },
  
  Base: {}
}
