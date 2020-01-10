var express = require('express');
var router = express.Router();
const eventsTableName = "Events";



router.post('/', function (req, res, next) {

    if(!req.user.isAdmin){
        res.status(401);
        res.send({
          "message": "must be an admin",
        });
        return;
      }

    ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });

    //get people 
    //divide into men and women 
    //create lists of possible matches ordered by age gap for women
    //create lists of matches inside range create 
    // loop 
        //

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
        this.createSchedule(users);    
    }
    });

    // var params = {
    //     TableName: eventsTableName,
    //     Item: {
    //         "Id": {
    //             "S": req.body.id
    //         },
    //         "open": {
    //             "BOOL": false
    //         },
    //         "users": {
    //             "L":[]
    //         }
    //     }
    // };
    // ddb.putItem(params, function (err, data) {
    //     if (!err) {
    //         res.send({ "message": "Successfully Created Event" });

    //     } else {
    //         res.status(500);
    //         res.send({ "message": "Failed to create Event" });
    //     }
    // });
});

function createSchedule(users){
    const a = '';
}
module.exports = router;
