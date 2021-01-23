var express    = require('express');
var serveIndex = require('serve-index');
var cors = require('cors');
var fetch = require('node-fetch');
var util = require('util');
var mysql = require("mysql");
var bodyParser = require("body-parser");
var cookieParser = require ('cookie-parser');

var app = express();

var sessions = [];

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
app.use(cookieParser())

app.use('/', express.static(__dirname));

app.get('/', cors(copts), function(req, res){
    logIP(req.ip);
    //validate
    res.sendFile("html/public/index.html", {root: __dirname});
    //res.sendFile("public/start.html", {root: __dirname});
});
app.get('/done', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("html/private/entryform.html", {root: __dirname});
});
app.get('/overview', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("html/private/overview.html", {root: __dirname});
});
app.get('/login', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("html/auth/login.html", {root: __dirname});
});
app.get('/register', cors(copts), function(req, res){
    logIP(req.ip);
    res.sendFile("html/auth/register.html", {root: __dirname});
});


app.post('/callLogin', cors(copts), function (req, res){
    logIP(req, false);
    console.log(req.body)
    if(evalCookie(req)){
        res.status(303).send("http://fap.bilbosjournal.com");
        return;
    }


    sql.getConnection(function (err, connection) {
        if(err) console.log(err);
        var user = req.body.username;
        var hash = req.body.pwhash;
        var cmd = "SELECT * FROM users WHERE username = ? AND pwhash = ?;";
        console.log(cmd);
        var params = [user, hash];
        connection.query(cmd, params, function (err, results, fields) {
            if (err) {
                console.log(cmd)
                console.log(err)
            }
            console.log(results[0])
            if(results.length === 1){
                console.log("Authenticated user " + results.username);
                setNewSession(res);
                res.status(200).send('login successful');
            } else {
                res.status(401).send('login failed');
            }
        });
        connection.release();
    })
});


function logIP(req, loggedIn){
    var ip = req.ip;
    var path = req.originalUrl;
    console.log(ip);
    sql.getConnection(function(err, connection) {
        if(err) console.log(err);
        var timestamp = + new Date();
        var params = [ip, path, timestamp, loggedIn];
        var cmd = "INSERT INTO visits VALUES(?, ?, ?, ?);";
        connection.query(cmd, params, function(err, results, fields) {
            if(err) console.log(err);
        });
        connection.release();
    });
}

function setNewSession(res){
    var id = crypto.randomBytes(20).toString('hex');
    sessions.push(id);
    res.cookie('session', id, { maxAge: 900000, httpOnly: true })
}

function evalCookie(req){
    var session = req.cookies['session'];
    return sessions.includes(session);
}

app.listen(6969);