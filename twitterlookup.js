var http = require('http');

var options = {
  host: 'api.twitter.com',
  port: 443,
  path: '/resource?id=foo&bar=baz',
  method: 'GET'
};

function getOptions(sName) {
	options.path = '1/users/lookup.json?screen_name=' + sName;
	return options;
}

function doTwitterLookup(screenName) {
	http.request(getOptions(screenName), function(response) {
			console.log("Got Response: " + response);
			response.setEncoding('utf8');
			response.on('data', function(chunk) {
				console.log('DATA: ' + chunk);
			});
		}).end();
}
doTwitterLookup('dcarroll');
