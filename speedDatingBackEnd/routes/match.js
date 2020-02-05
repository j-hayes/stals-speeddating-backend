var express = require('express');
var router = express.Router();
const uuidv1 = require('uuid/v1');
const matchTableName = "Matches";
var AWS = require('aws-sdk');


router.get('/mine', function (req, res, next) {
  AWS.config.update({ region: 'us-east-2' });

  const userId = req.user.id;

  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: matchTableName,
    ExpressionAttributeValues: { ":userId": `${userId}` },
    FilterExpression: "initiatingUserId = :userId or matchUserId =:userId"
  };

  const exclusiveStartKey = req.query.exclusiveStartKey;
  if (exclusiveStartKey) {
    params.ExclusiveStartKey = { Id: exclusiveStartKey };
  }

  docClient.scan(params, function (err, data) {
    if (err) {
      res.status(500);
      res.send({});
    }
    else {
      res.status(200);
      let lastEvaludatedKey = '';
      if (data.LastEvaluatedKey) {
        lastEvaludatedKey = data.LastEvaluatedKey;
      }
      res.send({
        LastEvaluatedKey: lastEvaludatedKey,
        matches: data.Items
      });
    }
  });


});


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
      },
      "dateId": {
        "S": req.body.dateId
      }
    }
  };


  ddb.putItem(params, function (err, data) {
    if (!err) {
      res.status(200);
      res.send({ "message": "Successfully created match" });
    } else {
      res.status(500);
      res.send({ "message": "failed to create match" });
    }
  });
});



module.exports = router;
