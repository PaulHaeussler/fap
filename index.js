var express      = require('express');
var serveIndex   = require('serve-index');
var cors         = require('cors');
var fetch        = require('node-fetch');
var util         = require('util');
var mysql        = require("mysql");
var bodyParser   = require("body-parser");
var cookieParser = require('cookie-parser');
var crypto       = require('crypto');

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
app.use(bodyParser.json());
app.use(cookieParser())

app.use('/', express.static(__dirname));

app.get('/', cors(copts), function(req, res){
    logIP(req, evalCookie(req));
    if(evalCookie(req)){
        res.sendFile("html/private/start.html", {root: __dirname});
    } else {
        res.sendFile("html/public/index.html", {root: __dirname});
    }
});
app.get('/done', cors(copts), function(req, res){
    logIP(req, evalCookie(req));
    if(evalCookie(req)){
        res.sendFile("html/private/entryform.html", {root: __dirname});
    } else {
        res.status(403).send("Please log in");
    }
});
app.get('/overview', cors(copts), function(req, res){
    logIP(req, evalCookie(req));
    if(evalCookie(req)){
        res.sendFile("html/private/overview.html", {root: __dirname});
    } else {
        res.status(403).send("Please log in");
    }
});
app.get('/login', cors(copts), function(req, res){
    logIP(req, evalCookie(req));
    res.sendFile("html/auth/login.html", {root: __dirname});
});
app.get('/register', cors(copts), function(req, res){
    logIP(req, evalCookie(req));
    res.sendFile("html/auth/register.html", {root: __dirname});
});

app.get('/signout', cors(copts), function(req, res){
    if(evalCookie(req)){
        logIP(req, true);
        removeItemAll(sessions, req.cookies['session'] + "=====" + getUserFromCookie(req.cookies['session']));
        console.log("end session: " + req.cookies['session']);
        res.status(200).send('successfully signed out');
    } else {
        logIP(req, false);
        res.status(400).send('not signed in');
    }
});

app.post('/callRegister', cors(copts), function(req, res){
    logIP(req, false);

    if(evalCookie(req)){
        res.status(303).send("http://fap.bilbosjournal.com");
        return;
    }
    var user = req.body.username;
    var hash = req.body.pwhash;
    var mail = req.body.email;
    var timestamp = + new Date();

    if(user.length > 255){
        res.status(400).send("username too long");
        return;
    }
    if(hash.length > 64){
        res.status(400).send("pwhash too long");
        return;
    }
    if(mail.length > 255){
        res.status(400).send("email too long");
        return;
    }
    if(user.length > 255){
        res.status(400).send("username too long");
        return;
    }

    sql.getConnection(function (err, connection) {
        if(err) console.log(err);

        var cmd = "SELECT * FROM users WHERE username = ?;";
        connection.query(cmd, user, function (err, results, fields) {
            if (err) {
                console.log(cmd)
                console.log(err)
            }
            if(results.length === 1){
                res.status(401).send('already in use');
            } else {
                cmd = "INSERT INTO users VALUES(?, ?, ?, ?)";
                var params = [user, hash, mail, timestamp];
                connection.query(cmd, params, function (err, results, fields){
                   if(err) {
                       console.log(cmd)
                       console.log(err)
                   }
                });
                res.status(200).send("successfully registered")
            }
        });
        connection.release();
    })

});

app.post('/callLogin', cors(copts), function (req, res){
    logIP(req, false);
    if(evalCookie(req)){
        res.status(303).send("http://fap.bilbosjournal.com");
        return;
    }


    sql.getConnection(function (err, connection) {
        if(err) console.log(err);
        var user = req.body.username;
        var hash = req.body.pwhash;
        var cmd = "SELECT * FROM users WHERE username = ? AND pwhash = ?;";
        var params = [user, hash];
        connection.query(cmd, params, function (err, results, fields) {
            if (err) {
                console.log(cmd)
                console.log(err)
            }
            if(results.length === 1){
                console.log("Authenticated user " + results[0].username);
                setNewSession(res, results[0].username);
                res.status(200).send('login successful');
            } else {
                res.status(401).send('login failed');
            }
        });
        connection.release();
    })
});

function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}

function getUserFromCookie(session){
    for(let i = 0; i < sessions.length; i++){
        if(sessions[i].split("=====")[0] === session){
            return sessions[i].split("=====")[1];
        }
    }
}

function logIP(req){
    var ip = req.ip;
    var path = req.originalUrl;
    var user = getUserFromCookie(req.cookies['session']);
    console.log(ip);
    sql.getConnection(function(err, connection) {
        if(err) console.log(err);
        var timestamp = + new Date();
        var params = [ip, path, timestamp, user];
        var cmd = "INSERT INTO visits VALUES(?, ?, ?, ?);";
        connection.query(cmd, params, function(err, results, fields) {
            if(err) console.log(err);
        });
        connection.release();
    });
}

function setNewSession(res, user){
    var id = crypto.randomBytes(20).toString('hex');
    sessions.push(id + "=====" + user);
    console.log("new session: " + id);
    res.cookie('session', id, { maxAge: 900000, httpOnly: true })
}

function evalCookie(req){
    var session = req.cookies['session'];
    var contained = false;
    for(let i = 0; i < sessions.length; i++){
        if(sessions[i].split("=====")[0] === session) {
            contained = true;
        }
    }
    return contained;
}

app.listen(6969);