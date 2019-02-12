const request = require('request');
const jwkToPem = require('jwk-to-pem');
const jwt = require('jsonwebtoken');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authenticationRouter = require('./routes/authentication');
var eventsRouter = require('./routes/event');
var matchesRouter = require('./routes/match');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', '*');
  
  if(req.method.toLowerCase() == 'options'.toLowerCase()){
 

    res.status(200);
    res.send();
    return;
  }
  
  if (req.url == '/user/login' || (req.url.startsWith('/user') && req.method.toLowerCase() == 'POST'.toLowerCase())) {
    next();
    return
  } else {

  if(!req.headers['authorization']){
    res.status(401);
    res.send();
    return;
  }

  const authHeader = req.headers['authorization'];
  const tokenstrings = authHeader.split(' ');
  const token = tokenstrings[1];
    request({
      url: `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_rh2PJ37YP/.well-known/jwks.json`,
      json: true
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        pems = {};
        var keys = body['keys'];
        for (var i = 0; i < keys.length; i++) {
          //Convert each key to PEM
          var key_id = keys[i].kid;
          var modulus = keys[i].n;
          var exponent = keys[i].e;
          var key_type = keys[i].kty;
          var jwk = { kty: key_type, n: modulus, e: exponent };
          var pem = jwkToPem(jwk);
          pems[key_id] = pem;
        }
        //validate the token
        var decodedJwt = jwt.decode(token, { complete: true });
        if (!decodedJwt) {
          req
        }

        var kid = decodedJwt.header.kid;
        var pem = pems[kid];
        if (!pem) {
          res.status(401);
          res.send("Not Authorized");
          return;
        }

        jwt.verify(token, pem, function (err, payload) {
          if (err) {
            res.status(401);
            res.send("Not Authorized");
          } else {
            req.user = {};
            req.user.isAuthenticated = true;
            req.user.id = payload["username"];
            if(payload["cognito:groups"]){
                const groups = payload["cognito:groups"];
                if(groups){
                  req.user.isAdmin = true;                  
                }
                else{
                  req.user.isAdmin = false;
                }
            }
            else{
              req.user.isAdmin = false;
            }
            next();//successful login
            return;
          }
        });
      } else {
        console.log("Error! Unable to download JWKs");
      }
    });
  }
});

app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/authentication', authenticationRouter);
app.use('/event', eventsRouter);
app.use('/match', matchesRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
