var express = require('express');
var router = express.Router();
const eventsTableName = "Events";
const usersTableName = "Users";

var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });


router.get('/:eventId', function (req, res, next) {

    var eventId = req.params.eventId;


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
            return;
        }
        events = data.Items;
        event = events.find(x => x.Id === eventId);
        if (!event) {
            res.status(404);
            res.send({
                success: false,
                message: 'Error: Could not find event with id supplied'
            });
            return;
        }

        const getUsersDocClient = new AWS.DynamoDB.DocumentClient();
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
                return;
            }
            createSchedule(event, data.Items, res);
        });
    });
});

function createSchedule(event, users, res) {
    const men = [];
    const women = [];
    users.forEach(user => {
        const userId = this.event.users.find(x => x === user.Id);
        if (userId) {
            if (user.sex === 'male') {
                men.push(user);
            } else {
                women.push(user);
            }
            usersInEvent.push(user);
        }
    });

    // for(const woman in women)
    // {
    //     var pairings = men.Where(x => woman.WithinDatingRange(x))
    //         .Select(x => new Pairing()
    //         {
    //             Woman = woman, Man = x
    //         }).OrderBy(x=>x.AgeGap).ToList();
    //     woman.PairableParticipantsStack = new Stack<Pairing>(pairings);
    //     woman.PairableParticipants = pairings;

    //     foreach (var pairing in pairings)
    //     {
    //         pairing.Man.PairableParticipants.Add(pairing);
    //     }
    // }


}

module.exports = router;
