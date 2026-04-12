# Validation Summary: How to Set Up a 5-Node Replica Set in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, WiredTiger storage engine)
- MongoDB Shell (`mongosh` / `mongo` shell commands: `rs.initiate()`, `rs.conf()`, `rs.reconfig()`, `rs.status()`)
- MongoDB Node.js Driver (`mongodb` npm package, `MongoClient`, `ReadPreference`)
- OpenSSL (keyfile generation)
- systemd (`systemctl` for service management)

## Sources Consulted
- MongoDB Manual: Replica Set Configuration — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual: rs.initiate() — https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB Manual: Hidden Replica Set Members — https://www.mongodb.com/docs/manual/core/replica-set-hidden-member/
- MongoDB Manual: Delayed Replica Set Members — https://www.mongodb.com/docs/manual/core/replica-set-delayed-member/
- MongoDB Manual: Read Preference — https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Manual: Deploy Replica Set With Keyfile Authentication — https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/
- MongoDB Manual: Write Concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Node.js Driver: Connection String — https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/

## Issues Found
1. **Misleading `w: majority` latency claim**: The original bullet point stated "No additional cost in terms of write acknowledgment latency with `w: majority`", which is inaccurate. With a 5-node replica set, `w: majority` requires acknowledgment from 3 members (the majority of 5), compared to only 2 members for a 3-node set. This means write latency is higher than a 3-node set, not equivalent. The bullet was rewritten to accurately describe the benefit: the two extra nodes add read capacity without the majority threshold scaling linearly (3 of 5, not 5 of 5).

## Review Notes
- The `secondaryDelaySecs` field is the modern name (MongoDB 5.0+). In MongoDB 4.x and earlier, this field was called `slaveDelay`. The post does not specify a MongoDB version; this is fine for modern deployments but readers on older versions should be aware.
- The `cfg.members[4]` array index reference for the hidden node configuration is correct given the initial 5-member setup, but in production the array index may not match `_id` if members have been added/removed. A more robust approach would be to find the member by `_id` or `host`, but this is acceptable for a tutorial.
- The connection string in the read preference section includes node5 (which is later configured as hidden). This is functionally correct — the driver will discover but not route reads to hidden members — though it could be noted for clarity.
- The `tee` command for keyfile generation outputs the key to stdout, which is a minor security consideration in production environments. Using `sudo tee` with output redirection (`> /dev/null`) would be more secure.
