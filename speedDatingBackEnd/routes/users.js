var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });

const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const CognitoUserPool = AmazonCognitoIdentity.CognitoUserPool;
global.fetch = require('node-fetch');
const pool_region = 'us-east-1';
const poolData = {
  UserPoolId: "us-east-2_rh2PJ37YP", // Your user pool id here    
  ClientId: "gnmg8qbg80vbpndrfd62ant6t" // Your client id here
};
const usersTableName = "Users";
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({});

router.post('/login', function (req, res, next) {
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username: req.body.username,
    Password: req.body.password
  });
  var userData = {
    Username: req.body.username,
    Pool: userPool
  };

  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      res.send({ token: `${result.getAccessToken().getJwtToken()}` });
    },
    onFailure: function (err) {
      res.status(401);
      res.send({ "Message": "Login failed, please try again" });
    }
  });
});

router.get('/', function (req, res, next) {

  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: usersTableName
  };

  docClient.scan(params, function (err, data) {
    if (err) {
      res.status(500);
      res.send({
        success: false,
        message: 'Error: Could not retrieve users'
      });
    } else {
      var users = data.Items;

      res.send(users);
    }
  });
});

router.post('/', function (req, res, next) {

  ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });

  //for building test data
  // let minDateAge = Math.round( req.body.age/2 + 9);
  // let maxDateAge = Math.round(req.body.age*2 - 9);

  // if(minDateAge < 21){
  //   minDateAge = 21;
  // }
  // if(maxDateAge > 39){
  //   maxDateAge = 39;
  // }
  
  
  minDateAge = req.body.minDateAge;
  maxDateAge = req.body.maxDateAge;

  var params = {
    TableName: usersTableName,
    Item: {
      "age": {
        "N": `${req.body.age}`
      },
      "firstName": {
        "S": req.body.firstName
      },
      "Id": {
        "S": req.body.email
      },
      "lastName": {
        "S": req.body.lastName
      },
      "sex": {
        "S": req.body.sex
      },
      "email": {
        "S": req.body.email
      },
      "minDateAge": {
        "N":  `${minDateAge}`
      },
      "maxDateAge": {
        "N":  `${maxDateAge}`
      }
    }
  };
  ddb.putItem(params, function (err, data) {
    if (!err) {


      var attributeList = [];
      attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: req.body.email }));
      userPool.signUp(req.body.email, req.body.password, attributeList, null, function (err, result) {
        if (err) {
          res.status(500);
          res.send({ "message": "Failed to create user" });
        }
        else {
          res.status(200);

          var params = {
            UserPoolId: poolData.UserPoolId, /* required */
            Username: req.body.email /* required */

          };
          CognitoIdentityServiceProvider.adminConfirmSignUp(params, function (err, data) {
            if (err) {
              console.log(err, err.stack); // an error occurred
            }

            else {
              console.log(data);
            }
            // successful response
          });

          res.send({ "message": "Successfully Created User" });
        }
      });
    } else {
      res.status(500);
      res.send({ "message": "Failed to create user" });
    }
  });
});



module.exports = router;
