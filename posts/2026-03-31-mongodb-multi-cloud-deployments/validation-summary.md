# Validation Summary: How to Set Up Multi-Cloud MongoDB Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB Node.js driver (MongoClient, ReadPreference)
- WireGuard VPN
- MongoDB Atlas Multi-Cloud Clusters
- Cross-cloud networking (AWS, GCP, Azure)

## Sources Consulted
- MongoDB documentation on replica set configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB documentation on rs.initiate(): https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB documentation on rs.reconfig(): https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB documentation on replica set tag sets: https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/
- MongoDB documentation on read preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB documentation on replica set arbiter: https://www.mongodb.com/docs/manual/core/replica-set-arbiter/
- MongoDB documentation on hidden replica set members: https://www.mongodb.com/docs/manual/core/replica-set-hidden-member/
- MongoDB Node.js driver ReadPreference API: https://mongodb.github.io/node-mongodb-native/6.0/classes/ReadPreference.html
- MongoDB documentation on rs.printSecondaryReplicationInfo(): https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- WireGuard documentation: https://www.wireguard.com/quickstart/

## Issues Found
1. **"hidden arbiter" terminology (Architecture Overview section)**: The post referred to a "hidden arbiter." In MongoDB, `hidden: true` is a property exclusive to data-bearing replica set members — it makes a member invisible to client applications. Arbiters are a separate member type that participate in elections but hold no data, and cannot be configured as hidden. The phrase conflated two distinct concepts. Fixed by removing "hidden" to read "with an arbiter or a majority of voting members."

2. **`ReadPreference.nearest` should be `ReadPreference.NEAREST` (Read Routing section)**: The MongoDB Node.js driver exposes read preference modes as uppercase static constants (`ReadPreference.PRIMARY`, `ReadPreference.NEAREST`, etc.). Using `ReadPreference.nearest` (lowercase) would resolve to `undefined` at runtime. Fixed to `ReadPreference.NEAREST`.

## Review Notes
- The `rs.reconfig()` example passes a full configuration object directly rather than the recommended pattern of fetching the current config with `rs.conf()`, modifying it, then passing it back. This works but is not the recommended practice from the MongoDB docs. It could fail in edge cases where the version field or other auto-managed fields are needed. This is acceptable for a blog tutorial but worth noting.
- `rs.printSecondaryReplicationInfo()` is the correct modern method name (renamed from `rs.printSlaveReplicationInfo()` in MongoDB 4.4.1).
- The write concern explanation is accurate — with `w: "majority"` in a 3-member set, the primary must wait for at least one secondary's acknowledgment, which in a multi-cloud setup means cross-cloud latency on the write path.
