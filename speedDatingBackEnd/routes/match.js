var express = require('express');
var router = express.Router();
const uuidv1 = require('uuid/v1');
const matchTableName = "Matches";
var AWS = require('aws-sdk');


router.post('/', function (req, res, next) {
  AWS.config.update({ region: 'us-east-2' });

  ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });

  var params = {
    TableName: matchTableName,
    Item: {
      "Id": {
        "S": uuidv1()
      },
      "initiatingUserId": {
        "S": req.user.id
      },
      "matchUserId": {
        "S": req.body.matchUserId
      },
      "eventId": {
        "S": req.body.eventId
      }
    }
  };


  ddb.putItem(params, function (err, data) {
    if (!err) {
      res.send({ "message": "Successfully created match" });
    } else {
      res.status(500);
      res.send({ "message": "Failed to create user" });
    }
  });


});



router.put('/send', function (req, res, next) {
  AWS.config.update({ region: 'us-east-2' });

  const matchQueryParams = {
    TableName: matchTableName,
    KeyConditionExpression: 'Id = :i',
    ExpressionAttributeValues: {
      ':i': req.body.id
    }
  };

  const docClient = new AWS.DynamoDB.DocumentClient();

  docClient.query(matchQueryParams, function (err, matchData) {
    if (err) {
      res.send({
        success: false,
        message: 'Error: Server error'
      });
      return;
    }
    else if (!matchData || !matchData.Items) {
      res.status(404);
      res.send({
        success: false,
        message: 'Error: Event Not Found'
      });
      return;
    }
    else {
      var match = matchData.Items[0];
      // Create sendEmail params 
      var emailParams = {
        Destination: { /* required */
          CcAddresses: [
            match.initiatingUserId
          ],
          ToAddresses: [
            match.initiatingUserId
          ]
        },
        Message: { /* required */
          Body: { /* required */
            Html: {
             Charset: "UTF-8",
             Data: "<html>hello</html>"
            },
            Text: {
             Charset: "UTF-8",
             Data: "TEXT_FORMAT_BODY"
            }
           },
           Subject: {
            Charset: 'UTF-8',
            Data: 'Test email'
           }
          },
        Source: 'stalspeeddate@gmail.com', /* required */
        ReplyToAddresses: [
            'stalspeeddate@gmail.com'
        ],
      }; 
      AWS.config.update({ region: 'us-east-1' });
      // Create the promise and SES service object
      var sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(emailParams).promise();

      // Handle promise's fulfilled/rejected states
      sendPromise.then(
        function (data) {
          AWS.config.update({ region: 'us-east-2' });
          ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });

          var updateParams = {
            TableName: matchTableName,
            Item: {
              "Id": {
                "S": match.Id
              },
              "initiatingUserId": {
                "S": match.initiatingUserId
              },
              "matchUserId": {
                "S": match.matchUserId
              },
              "eventId": {
                "S": match.eventId
              },
              "send": {
                "BOOL": true
              }
            }
          };
          ddb.putItem(updateParams, function (err, data) {
            if (!err) {
              res.send({ "message": "Successfully Sent Match" });
              return;

            } else {
              res.status(500);
              res.send({ "message": "Failed to Update Match" });
              return;
            }
          });
        }).catch(function (err) {
          res.status(500);
          res.send({ "message": "Failed to Update Match" });
          return;
        });
    }
  });
});

module.exports = router;
