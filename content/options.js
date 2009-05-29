var sgffx;

var sipgateffx_options = {
  onLoad: function() {
	try {
		// this is needed to generally allow usage of components in javascript
		netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
	
		sgffx = Components.classes['@api.sipgate.net/sipgateffx;1']
	                                    .getService().wrappedJSObject;
//					    .createInstance(Components.interfaces.nsISipgateFFX);
	} catch (anError) {
		dump("ERROR: " + anError);
	}
	
	var auth = sgffx.getSamuraiAuth();
	
	document.getElementById('username').setAttribute("value", auth.username);
	document.getElementById('password').setAttribute("value", auth.password);
  },

  onUnload: function() {
	  var username = document.getElementById('username').value;
	  var password = document.getElementById('password').value;

	  var auth = sgffx.getSamuraiAuth();
	  
	  if(auth.username != username || auth.password != password) {
		  sgffx.setSamuraiAuth(username, password);
	  }
  }

};
window.addEventListener("load", function(e) { sipgateffx_options.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_options.onUnload(e); }, false); 