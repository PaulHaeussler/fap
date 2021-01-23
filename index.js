var express    = require('express')
var serveIndex = require('serve-index')
var cors = require('cors')
var fetch = require('node-fetch');
var util = require('util');
var mysql = require("mysql");
var bodyParser = require("body-parser")
var session = require('express-session')

var app = express();

var copts = {
    origin: function (origin, callback) {
        callback(null, true);
    },
    optionsSuccessStatus: 200
}
app.options("*", cors(copts));
app.set('trust proxy',true);

var sql = mysql.createPool({
    connectionLimit: 500,
    user: process.argv[2],
    password: process.argv[3],
    host: process.argv[4],
    database: process.argv[5],
    charset: 'utf8mb4'
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());

app.use('/', express.static(__dirname));

app.get('/', cors(copts), function(req, res){
    logIP(req.ip);
    //validate
    res.sendFile("public/index.html");
    //res.sendFile("public/start.html");
});
app.get('/done', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("private/start.html");
});
app.get('/overview', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("private/overview.html");
});
app.get('/login', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("auth/login.html");
});
app.get('/register', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("auth/register.html");
});

function logIP(ip){
    console.log(ip);


}

app.listen(6969);