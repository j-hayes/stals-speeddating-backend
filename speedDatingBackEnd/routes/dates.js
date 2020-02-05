var express = require('express');
var router = express.Router();
const uuidv1 = require('uuid/v1');
const datesTableName = "Dates";
var AWS = require('aws-sdk');


router.get('/mine', function (req, res, next) {
  AWS.config.update({ region: 'us-east-2' });

  const userId = req.user.id;
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: datesTableName,
    ExpressionAttributeValues: { ":userId": `${userId}` },
    FilterExpression: "manId = :userId OR womanId = :userId"

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
              dates: data.Items
          });
      }
  });


});


module.exports = router;
