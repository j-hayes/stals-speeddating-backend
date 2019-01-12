var express = require('express');
var router = express.Router();
const eventsTableName = "Events";



router.post('/', function (req, res, next) {

    ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });

    var params = {
        TableName: eventsTableName,
        Item: {
            "Id": {
                "S": req.body.id
            },
            "open": {
                "BOOL": false
            },
            "users": {
                "L":[]
            }
        }
    };
    ddb.putItem(params, function (err, data) {
        if (!err) {
            res.send({ "message": "Successfully Created Event" });

        } else {
            res.status(500);
            res.send({ "message": "Failed to create Event" });
        }
    });
});
module.exports = router;
