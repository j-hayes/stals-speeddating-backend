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
    var timeSlots = 100;

    users.forEach(user => {
        const userId = this.event.users.find(x => x === user.Id);
        if (userId) {
            user.datesInAgeBothAgeRange = [];
            user.datesNotInAgeRange = [];
            user.numberOfDatesInARow = 0;
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
        _.orderBy(woman.datesInAgeBothAgeRange, "ageDifference", "desc");
        _.orderBy(woman.datesNotInAgeRange, "ageDifference", "desc");
    });

    men.forEach(man => {
        _.orderBy(man.datesInAgeBothAgeRange, "ageDifference", "desc");
        _.orderBy(man.datesNotInAgeRange, "ageDifference", "desc");
    });

    for (let timeSlot = 0; timeSlot < timeSlots; timeSlot++) {
        women = _.shuffle(women); //makes sure the bias in the algorithm that favors being at the front of the list is randomized

        women.forEach(woman => {
            var dateNotFound = true;
            var pairableParticipantsThatAlreadyHaveDates = [];
            while (dateNotFound && woman.datesInAgeBothAgeRange.length > 0) { //peek
                if (woman.numberOfDatesInARow >= 10)//give the lady a break!
                {
                    break;
                }
                var potentialDate = woman.datesInAgeBothAgeRange.pop();//take off of queue
                if (potentialDate.date.dates[timeSlot]) {
                    pairableParticipantsThatAlreadyHaveDates.push(potentialDate);
                } else {
                    woman.dates[timeSlot] = potentialDate.date;
                    potentialDate.date.dates[timeSlot] = woman;
                    woman.numberOfDatesInARow++;
                }
            }
            if (dateNotFound) {
                woman.NumberOfDatesInARow = 0;
            }
            while (pairableParticipantsThatAlreadyHaveDates[pairableParticipantsThatAlreadyHaveDates.length - 1])//put the closer in age participants back
            {
                woman.datesInAgeBothAgeRange.push(pairableParticipantsThatAlreadyHaveDates.pop());
            }
        });
    }
    // todo save date schedule in database 

    // todo backfill with dates outside range 
    for(var woman of women){
        for (let dateRound = 0; dateRound < woman.dates.length; dateRound++) {
            const date = woman.dates[dateRound];
            if(!date){
                continue;
            }
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
                    }
                }
            };
            ddb.putItem(params, function (err, data) {
                if(err){
                    var a = dateRound;
                }
                else{
                    var aa = '';
                }
            });
        }
    }
    res.status(200);
    res.send();
}

router.get('/:eventId', function (req, res, next) {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: datesTableName
    };

    docClient.scan(params, function(err, data){
        if(err){

        }
        else{
            res.status(200);
            res.send(data.Items.filter(x=>x.eventId === req.params.eventId));
        }
    });

});

function areInEachOthersDatingRange(woman, man) {
    return man.age >= woman.minDateAge && man.age <= woman.maxDateAge &&
        woman.age >= man.minDateAge && woman.age <= man.maxDateAge;
}

module.exports = router;
