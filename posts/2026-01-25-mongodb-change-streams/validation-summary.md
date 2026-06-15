# Validation Summary: How to Build Real-Time Sync with MongoDB Change Streams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Change Streams
- MongoDB replica sets and sharded clusters
- MongoDB Node.js driver
- JavaScript / Node.js
- WebSocket
- Redis
- RabbitMQ / AMQP

## Sources Consulted
- MongoDB Manual: Change Streams - https://www.mongodb.com/docs/manual/changestreams/
- MongoDB Manual: Change Events - https://www.mongodb.com/docs/manual/reference/change-events/
- MongoDB Manual: db.collection.watch() - https://www.mongodb.com/docs/manual/reference/method/db.collection.watch/
- MongoDB Node.js Driver: Monitor Data with Change Streams - https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/change-streams/
- MongoDB Node.js Driver API: BSON Timestamp - https://mongodb.github.io/node-mongodb-native/7.0/classes/BSON.Timestamp.html
- MongoDB Kafka Connector: Invalid Resume Token / ChangeStreamHistoryLost - https://www.mongodb.com/docs/kafka-connector/current/troubleshooting/recover-from-invalid-resume-token/

## Issues Found
- The change event section said every change event contains the listed fields. Changed it to say events can contain those fields depending on operation type, because fields such as `updateDescription` and `fullDocument` are operation- and option-dependent.
- The change event example used `Timestamp(...)` without `new`. Updated it to `new Timestamp(...)`, matching the Node driver BSON API.
- The filtering examples reused `const changeStream` three times in one JavaScript block. Renamed the variables so the block is syntactically valid when read as a single snippet.
- The document-field filtering example matched `fullDocument` on updates without enabling full-document lookup. Added `fullDocument: 'updateLookup'` and clarified the comment.
- The resume/start option comments described `resumeAfter` as an exact position and `startAfter` only as the next event. Adjusted the `startAfter` comment to match MongoDB's documented use for starting a new stream after a token, especially after invalidate events.
- The resilience example checked error code `40573` for expired resume tokens. Changed it to `286`, the documented `ChangeStreamHistoryLost` error code used when the resume point is no longer in the oplog.
- The oplog window example called `.getTime()` on BSON `Timestamp` values. Replaced it with subtraction of the timestamp seconds accessor (`.t`) and conversion to milliseconds.

## Review Notes
The examples remain illustrative and assume surrounding setup such as `uri`, `client`, `collection`, `processChange`, and package installation. I could not execute the MongoDB snippets locally because the workspace does not have the `mongodb` package installed, so API-specific fixes were verified against official MongoDB documentation.
