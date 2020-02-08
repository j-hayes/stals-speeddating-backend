var express = require('express');
var router = express.Router();
const eventsTableName = "Events";
const usersTableName = "Users";
const datesTableName = "Dates";
const uuidv1 = require('uuid/v1');

const { json2csv } = require('json2csv');

var _ = require('lodash');


var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });


function areInEachOthersDatingRange(woman, man) {
    return man.age >= woman.minDateAge && man.age <= woman.maxDateAge &&
        woman.age >= man.minDateAge && woman.age <= man.maxDateAge;
}


function usersAlreadyMatched(person1, person2) {

    var isMan = false;
    if (person1.sex === 'male') {
        isMan = true;
    }
    var alreadyMatched = person1.dates.filter(x => x !== undefined && x.Id === person2.Id);
    if(person2.dates === undefined){
        var a = 'why';
    }
    var alreadyMatchedOther = person2.dates.filter(x => x !== undefined && x.Id === person1.Id);


    if(alreadyMatched.length !== alreadyMatchedOther.length){
        var a = '';
    }

    return alreadyMatched.length > 0;
}

router.put('/:eventId/finalize', function (req, res, next) {

    const eventId = req.params.eventId;
    /* This example updates an item in the Music table. It adds a new attribute (Year) and modifies the AlbumTitle attribute.  All of the attributes in the item, as they appear after the update, are returned in the response. */
    const dynamodb = new AWS.DynamoDB();

    var params = {
        ExpressionAttributeNames: {
            "#F": "scheduleFinalized",
        },
        ExpressionAttributeValues: {
            ":f": {
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
        UpdateExpression: "SET #F = :f"
    };
    dynamodb.updateItem(params, function (err, data) {
        if (err) {
            res.status(500);
            res.send({
                "message": "Failed to finalize the schedule",
                "error": err
            });
        }
        else {
            res.status(200);
            res.send();
        }
    });
});

router.post('/:eventId', function (req, res, next) {

    var eventId = req.params.eventId;
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: eventsTableName
    };

    docClient.scan(params, function (err, eventsQueryResult) {
        if (err) {
            res.status(500);
            res.send({
                success: false,
                message: 'Error: Could not retrieve events'
            });
            return;
        }
        events = eventsQueryResult.Items;
        event = events.find(x => x.Id === eventId);
        if (!event) {
            res.status(404);
            res.send({
                success: false,
                message: 'Error: Could not find event with id supplied'
            });
            return;
        }

        const params = {
            TableName: usersTableName
        };
        docClient.scan(params, function (err, usersQueryResult) {
            if (err) {
                res.status(500);
                res.send({
                    success: false,
                    message: 'Error: Could not retrieve users'
                });
                return;
            }
            createSchedule(event, usersQueryResult.Items, res);
        });
    });
});

function createSchedule(event, users, res) {
    var men = [];
    var women = [];
    var timeSlots = 30;
    minNumberOfDates = 20;

    users.forEach(user => {

        const userId = this.event.users.find(x => x === user.Id);
        if (userId) {
            user.datesInAgeBothAgeRange = [];
            user.datesNotInAgeRange = [];
            user.numberOfDatesInARow = 0;
            user.numberOfTotalDates = 0;
            user.dates = new Array(timeSlots);

            if (user.sex === 'male') {
                men.push(user);
            } else {
                women.push(user);
            }
        }
    });
    women.forEach(woman => {

        men.forEach(man => {
            var ageDifference = Math.abs(woman.age - man.age);
            var dateForMan = {
                date: woman,
                ageDifference: ageDifference
            }
            var dateForWoman = {
                date: man,
                ageDifference: ageDifference
            }
            if (areInEachOthersDatingRange(woman, man)) {
                woman.datesInAgeBothAgeRange.push(dateForWoman);
                man.datesInAgeBothAgeRange.push(dateForMan);
            } else {
                woman.datesNotInAgeRange.push(dateForWoman);
                man.datesNotInAgeRange.push(dateForMan);
            }
        });
        woman.datesInAgeBothAgeRange = _.orderBy(woman.datesInAgeBothAgeRange, "ageDifference", "desc");
        woman.datesNotInAgeRange = _.orderBy(woman.datesNotInAgeRange, "ageDifference", "desc");
    });

    men.forEach(man => {
        man.datesInAgeBothAgeRange = _.orderBy(man.datesInAgeBothAgeRange, "ageDifference", "desc");
        man.datesNotInAgeRange = _.orderBy(man.datesNotInAgeRange, "ageDifference", "desc");
    });
    users = women.concat(men);

    for (let timeSlot = 0; timeSlot < timeSlots; timeSlot++) {
        users = _.orderBy(users, "numberOfTotalDates", "asc");

        users.forEach(user => {

            var dateNotFound = user.dates[timeSlot] === undefined;
            var pairableParticipantsThatAlreadyHaveDates = [];
            while (dateNotFound && user.datesInAgeBothAgeRange.length > 0) { //peek
                var potentialDate = user.datesInAgeBothAgeRange.pop();//take off of queue

                const alreadyMatched = usersAlreadyMatched(user, potentialDate.date);

                if (alreadyMatched) {
                    continue;
                }

                if (potentialDate.date.dates[timeSlot]) {
                    pairableParticipantsThatAlreadyHaveDates.push(potentialDate);
                } else {
                    user.dates[timeSlot] = potentialDate.date;
                    potentialDate.date.dates[timeSlot] = user;
                    user.numberOfDatesInARow++;
                    user.numberOfTotalDates++;
                    potentialDate.date.numberOfTotalDates++;
                    dateNotFound = false;
                }
            }
            if (dateNotFound) {
                user.NumberOfDatesInARow = 0;
            }
            while (pairableParticipantsThatAlreadyHaveDates[pairableParticipantsThatAlreadyHaveDates.length - 1])//put the closer in age participants back
            {
                user.datesInAgeBothAgeRange.push(pairableParticipantsThatAlreadyHaveDates.pop());
            }
        });
    }
    // back fill dates with people outside date range
    for (let timeSlot = 0; timeSlot < timeSlots; timeSlot++) {
        users = _.orderBy(users, "numberOfTotalDates", "asc");

        users.forEach(user => {
            var dateNotFound = user.dates[timeSlot] === undefined;
            var pairableParticipantsThatAlreadyHaveDates = [];
            while (dateNotFound && user.datesNotInAgeRange.length > 0) { //peek
                var potentialDate = user.datesNotInAgeRange.pop();//take off of queue
                const alreadyMatched = usersAlreadyMatched(user, potentialDate.date);

                if (alreadyMatched) {
                    continue;
                }
                if (potentialDate.date.dates[timeSlot]) {
                    pairableParticipantsThatAlreadyHaveDates.push(potentialDate);
                } else {
                    user.dates[timeSlot] = potentialDate.date;
                    potentialDate.date.dates[timeSlot] = user;
                    user.numberOfDatesInARow++;
                    user.numberOfTotalDates++;
                    potentialDate.date.numberOfTotalDates++;
                    dateNotFound = false;
                }
            }
            if (dateNotFound) {
                user.NumberOfDatesInARow = 0;
            }
            while (pairableParticipantsThatAlreadyHaveDates[pairableParticipantsThatAlreadyHaveDates.length - 1])//put the closer in age participants back
            {
                user.datesNotInAgeRange.push(pairableParticipantsThatAlreadyHaveDates.pop());
            }
        });
    }

    users = _.orderBy(users, "numberOfTotalDates", "asc");

    users.forEach(u => {
        if (u.sex === 'male') {
            isMan = true;
        }

        var realDates = u.dates.filter(x => x);

        var unique = _.uniqBy(realDates, "Id");
        isUnique = unique.length === realDates.length;
        if (!isUnique) {
            var a = realDates.length;
        }
        console.log(realDates.length);

    });
    // todo backfill with dates outside range 
    for (let womanIndex = 0; womanIndex < women.length; womanIndex++) {
        var woman = women[womanIndex];
        for (let dateRound = 0; dateRound < woman.dates.length; dateRound++) {
            const date = woman.dates[dateRound];
            if (!date) {
                continue;
            }
            const inAgeRange = areInEachOthersDatingRange(woman, date);
            ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08' });

            var params = {
                TableName: datesTableName,
                Item: {
                    "Id": {
                        "S": uuidv1()
                    },
                    "eventId": {
                        "S": event.Id
                    },
                    "manId": {
                        "S": date.Id
                    },
                    "womanId": {
                        "S": woman.Id
                    },
                    "round": {
                        "N": `${dateRound}`
                    },
                    "areInEachOthersDatingRange": {
                        "BOOL": inAgeRange
                    },
                    "tableNumber": {
                        "N": `${womanIndex}`
                    }
                }
            };
            ddb.putItem(params, function (err, data) {
                if (err) {
                    res.send({
                        success: false,
                        message: 'Error: Could not create date',
                        error: err
                    });
                }
                else {

                }
            });
        }
    }
    res.status(200);
    res.send();
}

router.get('/:eventId', function (req, res, next) {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const eventId = req.params.eventId;
    const exclusiveStartKey = req.query.exclusiveStartKey;
    const params = {
        TableName: datesTableName,
        ExpressionAttributeValues: { ":eventId": `${eventId}` },
        FilterExpression: "eventId = :eventId"
    };
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
