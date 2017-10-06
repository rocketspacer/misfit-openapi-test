const open = require('open');
const express = require('express');
const morgan = require('morgan');
const request = require('request');
const bodyParser = require('body-parser');

//===========================================================
const yamlConfig = require('node-yaml-config');
const config = {
  oauth: yamlConfig.load('config/oauth.yaml'),
  oauth_thirdparty: yamlConfig.load('config/oauth_thirdparty.yaml'),
};

//===========================================================
const router = express.Router();

//===========================================================
// Ping
router.get('/', (req, res, next) => res.status(200).end("OK"));

//===========================================================
// Oauth login: Get authorization_code
router.get('/login', (req, res, next) => {
    var url = config.oauth.dialog_url;
    url += '?response_type=code' + '&';
    url += `client_id=${config.oauth.client_id}` + '&';
    url += 'redirect_uri=' + config.oauth.redirect_uri + '&';
    url += 'scope=public,birthday,email';

    res.redirect(url);
});

// Oauth callback: Exchange authorization_code for token
router.get('/callback', (req, res, next) => {

    request.post({
        url: config.oauth.exchange_url,
        body: {
            grant_type: 'authorization_code',
            client_id: config.oauth.client_id,
            client_secret: config.oauth.client_secret,
            redirect_uri: config.oauth.redirect_uri,
            code: req.query.code
        },
        json: true
    },
        (err, response, body) => {
            if (err) return next(err);

            console.log(body);
            res.status(200).json(body);
        });
});

//===========================================================
// Thirdparty OAuth login: Get authorization_code
router.get('/login_thirdparty', (req, res, next) => {
    var url = config.oauth_thirdparty.dialog_url;
    url += '?response_type=code' + '&';
    url += `client_id=${config.oauth_thirdparty.client_id}` + '&';
    url += `client_secret=${config.oauth_thirdparty.client_secret}` + '&';
    url += 'redirect_uri=' + config.oauth_thirdparty.redirect_uri + '&';
    url += 'scope=public,birthday,email';

    res.redirect(url);
});

// Thirdparty Oauth callback: Exchange authorization_code for token
router.get('/callback_thirdparty', (req, res, next) => {
    request.post({
        url: config.oauth_thirdparty.exchange_url,
        body: {
            grant_type: 'authorization_code',
            client_id: config.oauth_thirdparty.client_id,
            client_secret: config.oauth_thirdparty.client_secret,
            redirect_uri: config.oauth_thirdparty.redirect_uri,
            code: req.query.code
        },
        json: true
    },
        (err, response, body) => {
            if (err) return next(err);

            console.log(body);
            res.status(200).json(body);
        });
});

//===========================================================
// Subscription API
router.post('/subscription/endpoint', (req, res, next) => {

    console.log(">>> Request Body");
    console.log(req.body);
    console.log(">>> Request Headers");
    console.log(req.headers);

    // Request Body is sent as text/plain
    var message = JSON.parse(req.body);

    // Message Type is used to distinguish
    // between SubscriptionConfirmation and actual Notification
    if (message.Type === 'SubscriptionConfirmation') {
        // Send Confirmation Message
        console.log(">>> Confirming subscription at " + message.SubscribeURL);
        request.get({
            url: message.SubscribeURL,
            // headers: { verify_token: message.Token }
        }, function (err, response, body) {
            if (err) {
                return res.status(500).json(err.message);
            }

            // Confirmation Success
            console.log(response.body);
            return res.status(200).json({});
        });
    }
    else {
        // Normal user data notifications
        console.log(message);
        res.status(200).json({});
    }
});

//===========================================================
// Monitoring API
const MONITORING_KEY = process.env.MONITORING_KEY || 'rocketspacer';
router.get('/monitoring', (req, res, next) => {
  if (req.headers.key !== MONITORING_KEY && req.query.key !== MONITORING_KEY) return res.status(401).end('( ͡° ͜ʖ ͡°) Nope');
  res.status(200).json({ ...config });
});

//===========================================================
var app = express();
app.use(morgan('dev'));
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(router);
app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json(err);
});


//===========================================================
var PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // Boot Message
  console.log(`Server is listening on port ${PORT}`);
  console.log('--------------------------------------\n');

  // URLs
  console.log(`http://localhost:${PORT}`);
  console.log(`http://localhost:${PORT}/login`);
  console.log(`http://localhost:${PORT}/login_thirdparty`);
  console.log('--------------------------------------\n');


  // Open Browser
  if (!process.env.NODE_ENV || process.env.NODE_ENV.includes('heroku')) open(`http://localhost:${PORT}`);
});
