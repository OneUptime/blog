# Validation Summary: How to Configure the replication Section in mongod.conf

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (replica sets, oplog, change streams)
- mongod.conf (YAML configuration)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: replication configuration options — https://www.mongodb.com/docs/manual/reference/configuration-options/#replication-options
- MongoDB Manual: enableMajorityReadConcern removal in 5.0 — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-replication.enableMajorityReadConcern
- MongoDB Manual: Change Streams with Document Pre- and Post-Images — https://www.mongodb.com/docs/manual/changeStreams/#change-streams-with-document-pre--and-post-images
- MongoDB Manual: rs.initiate() — https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB Manual: Oplog Size — https://www.mongodb.com/docs/manual/core/replica-set-oplog/#oplog-size

## Issues Found
1. **`enableMajorityReadConcern` presented as a current configuration option**: The post included `enableMajorityReadConcern: true` in the basic structure example and described it as configurable with a recommendation to keep it enabled. In reality, this option was removed in MongoDB 5.0. Starting in 5.0, majority read concern is always enabled and cannot be disabled. Including the option in `mongod.conf` on MongoDB 5.0+ produces a startup warning. Fixed by removing it from the basic structure example, rewriting the section to explain it was removed in 5.0, and updating the summary paragraph accordingly.

## Review Notes
- The oplog default size description ("5% of free disk space, capped at 50 GB") is accurate. The lower bound of 990 MB is not mentioned but is not required for the level of detail in this post.
- The `changeStreamPreAndPostImages` feature was introduced in MongoDB 6.0. The post does not specify a version, which could be noted in a future update.
- All `rs.*` shell commands and `rs.initiate()` usage are correct.
