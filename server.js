// Dependencies
var express = require("express");
var mongoose = require("mongoose");
var request = require("request");
var cheerio = require("cheerio");
var bodyParser = require("body-parser");
var logger = require("morgan");
var exphbs  = require('express-handlebars');


var Note = require('./models/note.js');
var Article = require('./models/article.js');

mongoose.Promise = Promise;

// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000;

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Database configuration with mongoose
//mongoose.connect("mongodb://localhost/webscrapeapp");
mongoose.connect("mongodb://heroku_k839gv0t:hk62n62cdea3vpj3bq3bhl3o57@ds143245.mlab.com:43245/heroku_k839gv0t");
var db = mongoose.connection;

db.on("error", function(error) {
  console.log("Database Error:", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

app.use(express.static("public"));

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

app.get('/', function(req, res) {
	Article.find(function(error, doc) {

		var hbsObj = {
			article: doc
		};

		if (error) {
			console.log(error);
		}else {
			res.render('home', hbsObj);
		}
	});
});

app.get('/scrape', function(req, res) {
	request('https://newsone.com/category/good-news/', function(err, response, html) {
		var $ = cheerio.load(html);

		var mongoResults = {};

		$('div.post-split').each(function(i, element) {
			mongoResults.link = $(this).children('div.poster').children('a').attr('href');
			mongoResults.image = $(this).children('div.poster').children('a').children('img').attr('src');
			mongoResults.headline = $(this).children('div.post-meta').children('a').children('div').text();
			mongoResults.summary = $(this).children('div.post-meta').children('a').children('p').text();
			
			var entry = new Article(mongoResults);
			
			entry.save(function(err, doc) {
				if (err) {
					console.log(err);
				}else {
				}
			});
		});
	});
	console.log('scraped');
});	

app.get('/article/:id', function(req, res) {

	Article.findOne({'_id': req.params.id})
	.populate('note')
	.exec(function(err, doc) {
		if (err) {
			console.log(err);
		}else {
			res.json(doc);
		}
	})
});

app.post('/note/:id', function(req, res) {
	var newNote = new Note(req.body);

	newNote.save(function(err, doc) {
		if (err) {
			console.log(err);
		}else {
			Article.findOneAndUpdate({'_id': req.params.id}, {'note': doc._id})
			.exec(function(err, doc) {
				if (err) {
					console.log(err);
				}else {
					res.send(doc);
				}
			})
		}
	})
})

// Listen on port 3000
app.listen(PORT, function() {
    console.log("==> 🌎  Listening on port %s. Visit http://localhost:%s/ in your browser.", PORT, PORT);
});
