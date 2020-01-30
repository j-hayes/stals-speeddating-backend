var express = require('express');
var router = express.Router();
const eventsTableName = "Events";
const usersTableName = "Users";


var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });

router.get('/', function (req, res, next) {


    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: eventsTableName
    };

    docClient.scan(params, function (err, data) {
        if (err) {
            res.status(500);
            res.send({
                success: false,
                message: 'Error: Could not retrieve events'
            });
        } else {
            var events = data.Items;
            res.send(events);
        }
    });
});

router.get('/', function (req, res, next) {


    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: eventsTableName
    };

    docClient.scan(params, function (err, data) {
        if (err) {
            res.status(500);
            res.send({
                success: false,
                message: 'Error: Could not retrieve events'
            });
        } else {
            var events = data.Items;
            res.send(events);
        }
    });
});

router.get('/:id/users', function (req, res, next) {
    var id = req.params.id;

    const params = {
        TableName: eventsTableName,
        KeyConditionExpression: 'Id = :i',
        ExpressionAttributeValues: {
            ':i': id
        }
    };

    const docClient = new AWS.DynamoDB.DocumentClient();

    docClient.query(params, function (err, data) {
        if (err) {
            res.send({
                success: false,
                message: 'Error: Server error'
            });
        }
        else if (!data || !data.Items) {
            res.status(404);
            res.send({
                success: false,
                message: 'Error: Event Not Found'
            });
        }
        else {
            const userParams = {
                TableName: usersTableName
            };
            docClient.scan(userParams, function (userError, userData) {
                if (userError) {
                    res.send({
                        success: false,
                        message: 'Error: Server error'
                    });
                }
                else if (!userData || !data.Items) {
                    res.status(404);
                    res.send({
                        success: false,
                        message: 'Error: Event Not Found'
                    });
                }
                else {
                    var currentUser = userData.Items.find(x => x.Id == req.user.id);
                    var minAge = 1;
                    var maxAge = 1000;

                    var sex = currentUser.sex == 'female' ? 'male' : 'female';

                    if (currentUser.age < 30) {
                        minAge = 20;
                        maxAge = 30;
                    }
                    else {
                        minAge = 30;
                        maxAge = 1000;
                    }

                    var matchingUsers = userData.Items.filter(x => x.age <= maxAge && x.age > minAge && x.sex == sex && data.Items[0].users.includes(x.Id));
                    res.send(matchingUsers);
                }
            });
        }
    });
});

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
                "L": []
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

router.put('/:eventId/open', function (req, res, next) {

    const eventId = req.params.eventId;
    /* This example updates an item in the Music table. It adds a new attribute (Year) and modifies the AlbumTitle attribute. 
     All of the attributes in the item, as they appear after the update, are returned in the response. */
    const dynamodb = new AWS.DynamoDB();

    var params = {
        ExpressionAttributeNames: {
            "#O": "open",
        },
        ExpressionAttributeValues: {
            ":o": {
                BOOL: true
            },           
        },
        Key: {
            "Id": {
                S: eventId
            }
        },
        ReturnValues: "ALL_NEW",
        TableName: eventsTableName,
        UpdateExpression: "SET #O = :o"
    };
    dynamodb.updateItem(params, function (err, data) {
        if (err) {
            res.status(500);
            res.send({
              "message": "Failed to open the event",
              "error": err
            });
          }
          else {
            res.status(200);  
            res.send();
          }
    });
});


router.put('/users', function (req, res, next) {

    const params = {
        TableName: eventsTableName,
        KeyConditionExpression: 'Id = :i',
        ExpressionAttributeValues: {
            ':i': req.body.id
        }
    };

    const docClient = new AWS.DynamoDB.DocumentClient();

    docClient.query(params, function (err, data) {
        if (err) {
            res.send({
                success: false,
                message: 'Error: Server error'
            });
        }
        else if (!data || !data.Items) {
            res.status(404);
            res.send({
                success: false,
                message: 'Error: Event Not Found'
            });
        }
        else {
            ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });
            var users = [];
            var usersList = [];
            if (data.Items[0].users) { // map the existing users
                data.Items[0].users.forEach(user => {
                    if (!users[user]) {
                        users[user] = user;
                        usersList.push({ "S": user });
                    }
                });;
            }

            req.body.users.forEach(user => { // add the new users
                if (!users[user]) {
                    users[user] = user;
                    usersList.push({ "S": user });
                }
            });

            var params = {
                TableName: eventsTableName,
                Item: {
                    "Id": {
                        "S": req.body.id
                    },
                    "users": {
                        "L": usersList
                    },
                    "open": {
                        "BOOL": data.Items[0].open || false
                    }
                }
            };
            ddb.putItem(params, function (err, data) {
                if (!err) {
                    res.send({ "message": "Successfully Update Event" });

                } else {
                    res.status(500);
                    res.send({ "message": "Failed to Update Event" });
                }
            });
        }
    });
});


router.delete('/users', function (req, res, next) {

    const params = {
        TableName: eventsTableName,
        KeyConditionExpression: 'Id = :i',
        ExpressionAttributeValues: {
            ':i': req.body.id
        }
    };

    const docClient = new AWS.DynamoDB.DocumentClient();

    docClient.query(params, function (err, data) {
        if (err) {
            res.send({
                success: false,
                message: 'Error: Server error'
            });
        }
        else if (!data || !data.Items) {
            res.status(404);
            res.send({
                success: false,
                message: 'Error: Event Not Found'
            });
        }
        else {
            ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });
            var users = {};
            var usersList = [];
            if (data.Items[0].users) {
                data.Items[0].users.forEach(user => {
                    users[user] = user;
                });
            }
            req.body.users.forEach(user => {
                if (users[user]) {
                    users[user] = null;
                }
            });

            for (var key in users) {
                if (users[key]) {
                    usersList.push({ "S": key });
                }
            };

            var params = {
                TableName: eventsTableName,
                Item: {
                    "Id": {
                        "S": req.body.id
                    },
                    "users": {
                        "L": usersList
                    },
                    "open": {
                        "BOOL": data.Items[0].open || false
                    }
                }
            };
            ddb.putItem(params, function (err, data) {
                if (!err) {
                    res.send({ "message": "Successfully Updated Event Users" });

                } else {
                    res.status(500);
                    res.send({ "message": "Failed to Update Event Users" });
                }
            });
        }
    });
});


module.exports = router;
