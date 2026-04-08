# Validation Summary: How to Set Up MongoDB Cross-Region Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, write concerns, read preferences)
- AWS EC2 VPC Peering
- mongosh (MongoDB Shell)
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB Replica Set Configuration documentation: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Custom Write Concern (`getLastErrorModes`): https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/#configure-custom-write-concern
- MongoDB `rs.reconfig()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- AWS CLI `create-vpc-peering-connection` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html

## Issues Found

1. **Incorrect mongosh syntax (`db.collection()`)**: The write concern code example used `db.collection("orders").insertOne(...)`, which is Node.js driver syntax, not mongosh. The rest of the post uses mongosh commands (`rs.initiate`, `rs.reconfig`), so this was inconsistent. Changed to `db.orders.insertOne(...)`.

2. **Incorrect claim that `w: "majority"` guarantees cross-region durability**: The post stated that majority write concern "waits for at least two members (including the DR secondary) to confirm the write." With 2 members in us-east-1 and 1 in eu-west-1, majority (2 of 3) can be satisfied by the primary and the co-located secondary alone — the DR region member is not required. This is a significant error because it gives a false sense of cross-region durability. Rewrote the section to use a custom write concern via `getLastErrorModes` with region tags, which is the correct way to enforce cross-region acknowledgment. Added a note clarifying that `w: "majority"` does not guarantee cross-region writes with this topology.

## Review Notes
- The `settings.catchUpTimeoutMillis` in the `rs.initiate()` example is a valid but rarely used setting. Its default changed across MongoDB versions (infinite catchup in 3.6+). It is not incorrect but readers should consult the docs for their specific MongoDB version.
- The `rs.reconfig()` call that adds tags passes a full configuration document directly. In practice, it is safer to use `cfg = rs.conf()`, modify the object, then call `rs.reconfig(cfg)` to avoid resetting other settings. This is a best-practice concern rather than a correctness issue.
- The post uses a 3-member replica set. For production cross-region deployments, MongoDB recommends considering 5 members or using an arbiter to avoid split-brain scenarios when regions have equal vote counts, though the 3-member topology shown is valid.
