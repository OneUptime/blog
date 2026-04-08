# Validation Summary: How to Configure Election Timeouts in MongoDB Replica Sets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- MongoDB shell (mongosh)
- MongoDB Node.js driver
- Replica set election configuration (`electionTimeoutMillis`, `heartbeatIntervalMillis`, `catchUpTimeoutMillis`)
- Replica set member priority and voting configuration

## Sources Consulted
- MongoDB Replica Set Configuration documentation: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Replica Set Elections documentation: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB `rs.reconfig()` reference: https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB Node.js Driver connection options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/

## Issues Found
1. **Incorrect claim about voting member count requirement**: The post stated "MongoDB requires that the number of voting members is odd." This is incorrect. MongoDB *recommends* an odd number of voting members to avoid tied elections but does not require it. The actual hard constraint is a maximum of 7 voting members per replica set. Changed to: "MongoDB allows up to 7 voting members in a replica set and recommends an odd number to avoid tied elections. If you add a non-voting member, it does not affect the quorum calculation."

## Review Notes
- All code examples use correct `rs.conf()` / `rs.reconfig()` patterns and are syntactically valid for mongosh.
- Default values cited for `electionTimeoutMillis` (10000), `heartbeatIntervalMillis` (2000), and `catchUpTimeoutMillis` (-1) are all accurate.
- The use of `console.log` is valid in mongosh (the current default MongoDB shell); legacy `mongo` shell users would need `printjson` instead, but this is not worth flagging since mongosh is the current standard.
- The section title "Verify Election Timeout via Connection String" is slightly misleading since the example sets `serverSelectionTimeoutMS` in client options rather than verifying the election timeout, but the content itself is accurate and useful.
