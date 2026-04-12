# Validation Summary: How to Configure WiredTiger Storage Engine in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger cache, journaling, and checkpoint mechanisms
- YAML configuration for `mongod.conf`
- mongosh (MongoDB Shell) for runtime diagnostics

## Sources Consulted
- MongoDB official documentation: WiredTiger Storage Engine (https://www.mongodb.com/docs/manual/core/wiredtiger/)
- MongoDB official documentation: `storage` configuration options (https://www.mongodb.com/docs/manual/reference/configuration-options/#storage-options)
- MongoDB official documentation: `db.serverStatus()` WiredTiger stats (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger)
- MongoDB official documentation: `setParameter` (https://www.mongodb.com/docs/manual/reference/parameters/)
- MongoDB official documentation: WiredTiger concurrency configuration (https://www.mongodb.com/docs/manual/reference/parameters/#wiredtiger-parameters)

## Issues Found
No technical issues found.

## Review Notes
- The `storage.journal.enabled` setting shown in the complete configuration example was removed in MongoDB 6.1. In MongoDB 5.0+, journaling is always enabled for replica set members and cannot be disabled. The post does not target a specific MongoDB version, so this is not an error, but readers using MongoDB 6.1+ should omit this setting to avoid configuration warnings.
- Starting in MongoDB 7.0, the ticket-based admission control system was replaced with a throughput-probing mechanism. The `wiredTigerConcurrentReadTransactions` and `wiredTigerConcurrentWriteTransactions` parameters still exist but may behave differently. Readers on MongoDB 7.0+ should consult the updated documentation on admission control.
- The checkpoint interval (default 60 seconds) can actually be adjusted via the `syncdelay` server parameter (e.g., `setParameter.syncdelay` in the config file), though the post's claim that it is "not directly configurable in `mongod.conf` for WiredTiger" is reasonable since it is not in the `storage.wiredTiger` section.
- The cache hit ratio calculation using `(pagesRequested - pagesRead) / pagesRequested` is a commonly used approximation but is not an official MongoDB metric. The approach is sound for monitoring purposes.
