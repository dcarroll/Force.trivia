/*
 * Faye Chat server adapted from Soapbox by James Coglan
 * (https://github.com/jcoglan/faye/tree/master/examples)
 */
var express = require('express'),
    faye    = require('faye'),
    rest    = require('./rest.js'),
    oauth   = require('./oauth.js'),
		nurl 		= require('url'),
		https		= require('https');
		

var fayeServer = new faye.NodeAdapter({mount: '/faye', timeout: 20}),
    client     = fayeServer.getClient(),
    port       = process.env.PORT || '8000';

var app = express.createServer(
    express.bodyParser(),
    express.cookieParser(),
		express.logger(),
    express.session({ secret: process.env.CLIENT_SECRET  || "1088793090219252439"}),
    express.query());
    
/*var oauthMiddleware = oauth.oauth({
   	clientId: process.env.CLIENT_ID,
   	clientSecret: process.env.CLIENT_SECRET,
   	loginServer: process.env.LOGIN_SERVER,
   	redirectUri: process.env.REDIRECT_URI
	});*/
	var oauthMiddleware = oauth.oauth({
	    clientId: process.env.CLIENT_ID || "3MVG9QDx8IX8nP5RwKyTXo_vDe8bDN9A8i174wBFpLpu.wRNZ_OcBf0uVdIE4YQwhSOmyr7MqgVfibT.db47u",
	    clientSecret: process.env.CLIENT_SECRET || "1088793090219252439",
	    loginServer: process.env.LOGIN_SERVER || "https://login.salesforce.com",
	    redirectUri: process.env.REDIRECT_URI || "http://localhost:8000/master"
	});

console.log(process.argv[2]);
var options = {
  host: 'api.twitter.com',
  port: 443,
  path: '/resource?id=foo&bar=baz',
  method: 'GET'
};

function getOptions(sName) {
	options.path = '/1/users/lookup.json?screen_name=' + sName;
	return options;
}

function doTwitterLookup(screenName, res) {
	//var sname = nurl.parse(req.url, true).screenname;
	console.log("SCREENNAME: " + screenName);
	if (screenName.substr(0, 1) === "@") {
		screenName = screenName.substr(1, screenName.length - 1);
	}
	https.request(getOptions(screenName), function(response) {
			console.log("Got Response: " + response);
			//console.log('STATUS: ' + response.statusCode);
		  console.log('HEADERS: ' + JSON.stringify(response.headers));			
			response.setEncoding('utf8');
			response.on('data', function(chunk) {
				console.log('DATA: ' + chunk);
				if (JSON.parse(chunk).error || JSON.parse(chunk).errors) {
					res.write("bug_blue_3d_rgb.png")
				} else {
					var image_url = JSON.parse(chunk)[0].profile_image_url;
					console.log("PROFILE IMAGE URL: " + image_url)
					res.write(image_url);
				}
				res.end();
			});
		}).end();
}

app.set('views', __dirname + '/views');
if (process.argv.length > 2) {
	app.set('view engine', process.argv[2]);
} else {
	app.set('view engine', 'jade');
}

app.get('/', function(req, res) {
	console.log("get root");
	res.render('index');
});

app.get('/twitter', function(req, res) {
	doTwitterLookup(nurl.parse(req.url, true).query.screenname, res, function(url) {
		rest.api(req).update("Player__c", req.body, function(data) {
			
		})
	});
});
// Require OAuth login at /master.html
app.get('/master', oauthMiddleware, function(req, res) {
    var id = req.query.id;
    if (id) {
    	rest.api(req).query("SELECT Number__c, Question__r.Question__c, Question__r.Answer__c FROM Quiz_Question__c WHERE Quiz__c = '"+id+"' ORDER BY Number__c", function(data) {
    	    console.log(data);
    		res.render('showquiz', data);
    	});        
    } else {
    	rest.api(req).query("SELECT Id, Date__c, Location__c FROM Quiz__c ORDER BY Date__c DESC", function(data) {
    	    console.log(data);
    		res.render('selectquiz', data);
    	});
    }
});

app.post('/player', oauthMiddleware, function(req, res) {
		console.log("In the app.post handler...");
		console.log("req body:\n" + JSON.stringify(req.body));
		rest.api(req).query("Select Id, Name, Name__c From Player__c Where Quiz__c = '" + req.body.Quiz__c + "' AND Name = '" + req.body.Name + "'", function(data) {
			if (data.totalSize == 0) {
				rest.api(req).create('Player__c', req.body, function(data){
		    	res.send(data);
		    	}, function(data, response){
		        res.send(data, response.statusCode);
		    	});
			}else {
				res.send(data);
			}
		});
	});

app.post('/incscore', oauthMiddleware, function(req, res) {
    var restClient = rest.api(req);
    restClient.query("SELECT Id, Score__c FROM Player__c WHERE Quiz__c = '"+req.body.Quiz__c+"' AND Name = '"+req.body.Name+"'", function(data) {
	    console.log(data);
	    var score = data.records[0].Score__c + 1;
	    restClient.update('Player__c', data.records[0].Id, { Score__c: score }, function(data) {
	        res.end();
	    });
	});
});

app.get('/highscores', oauthMiddleware, function(req, res) {
    rest.api(req).query("SELECT Id, Name, Score__c FROM Player__c WHERE Quiz__c = '"+req.query.Quiz__c+"' ORDER BY Score__c DESC", function(data) {
	    console.log(data);
        res.send(data);
	});
});

app.use(express.static(__dirname + '/public'));

fayeServer.attach(app);

app.listen(Number(port));

console.log('Listening on ' + port);
