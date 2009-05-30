var sgffx;

function doOK() {
	alert('Sending is to be implemented!');
	window.close();
}

function doCancel() {
	window.close();
}

function countTextChars() {
	var val = document.getElementById("sipgate_sms_text").value.length;
	document.getElementById("sipgate_sms_text_header").setAttribute('label', 'Text (' + val + ' chars)');
	return val;
}

var sipgateffx_sms = {
	onLoad: function() {
		if(typeof window.arguments != "undefined") {
			document.getElementById("sipgate_sms_text").setAttribute('value', window.arguments[0]);
		}

		document.getElementById("sipgate_sms_text").addEventListener("keyup", function(e) {
			var val = countTextChars();
		}, false);

		countTextChars();
		
	},

  onUnload: function() {

  }

};
window.addEventListener("load", function(e) { sipgateffx_sms.onLoad(e); }, false);
window.addEventListener("unload", function(e) { sipgateffx_sms.onUnload(e); }, false); 