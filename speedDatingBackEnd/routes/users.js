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


router.post('/login', function (req, res, next) {
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username : req.body.username,
    Password : req.body.password
});
var userData = {
  Username :  req.body.username,
  Pool : userPool
};

var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
        res.send({token: `${result.getAccessToken().getJwtToken()}`});       
    },
    onFailure: function(err) {
       res.status(401);
       res.send({"Message":"Login failed, please try again"});
    }
});
});

router.get('/', function (req, res, next) {
  
  //matchableUser=UserId
  
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: usersTableName
  };

  docClient.scan(params, function(err, data) {
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
        "S": req.body.id
      },
      "lastName": {
        "S": req.body.lastName
      },
      "sex": {
        "S": req.body.sex
      }
    }
  };
  ddb.putItem(params, function (err, data) {
    if (!err) {
  
    
      var attributeList = [];
      attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: req.body.id }));
      userPool.signUp(req.body.id, req.body.password, attributeList, null, function (err, result) {
        if (err) {
          res.status(500);
          res.send({ "message": "Failed to create user" });
        }
        else {
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
