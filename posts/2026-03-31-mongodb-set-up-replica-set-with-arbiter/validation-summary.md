# Validation Summary: How to Set Up a Replica Set with Arbiter in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, arbiter nodes)
- mongod configuration (YAML format)
- mongosh / mongo shell (`rs.initiate()`, `rs.addArb()`, `rs.add()`, `rs.status()`)
- Linux system administration (scp, ssh, chmod, chown)

## Sources Consulted
- MongoDB official documentation: Replica Set Arbiter — https://www.mongodb.com/docs/manual/core/replica-set-arbiter/
- MongoDB official documentation: rs.addArb() — https://www.mongodb.com/docs/manual/reference/method/rs.addArb/
- MongoDB official documentation: rs.add() — https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB official documentation: rs.initiate() — https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB official documentation: Write Concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB official documentation: Configuration File Options — https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found
1. **Mixed shell and JavaScript in one code block**: The "Arbiter Limitations" section had a single `javascript`-tagged code block that contained both a bash shell command (`mongosh --host ...`) and JavaScript code (`db.collection.insertOne(...)`). This would not work if copy-pasted into either a shell or a mongosh session. Split into separate `bash` and `javascript` code blocks.
2. **Inaccurate error message**: The error shown for querying an arbiter was "not allowed to read from arbiter", which is not the actual MongoDB error. Changed to "not primary or secondary; cannot currently read from this replSet member", which reflects the real error message MongoDB returns when attempting to read from an arbiter.

## Review Notes
- MongoDB's official documentation now discourages using arbiters in production for new deployments, recommending three data-bearing members instead. The post correctly notes the trade-offs but could mention this updated guidance in the future.
- The `bindIp: 0.0.0.0` in the arbiter config binds to all interfaces. In production, this should be restricted to specific IPs for security. The post could note this in a future update.
- All `rs.*` methods, YAML config fields, and replica set concepts are accurate for MongoDB 5.0+ through current versions.
