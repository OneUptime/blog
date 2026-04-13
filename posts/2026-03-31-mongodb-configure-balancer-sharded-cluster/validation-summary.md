# Validation Summary: How to Configure the Balancer in a MongoDB Sharded Cluster

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (sharded clusters)
- MongoDB Shell (mongosh) balancer helpers
- MongoDB config database (`config.settings`, `config.collections`, `config.changelog`)

## Sources Consulted
- MongoDB official documentation: `sh.stopBalancer()` / `sh.startBalancer()` shell helpers (https://www.mongodb.com/docs/manual/reference/method/sh.stopBalancer/)
- MongoDB official documentation: Manage the Balancer (https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/)
- MongoDB official documentation: Balancer internals and migration thresholds (https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/)
- MongoDB official documentation: `config.settings` collection and `activeWindow` configuration (https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.settings)
- MongoDB official documentation: Chunk size configuration (https://www.mongodb.com/docs/manual/tutorial/modify-chunk-size-in-sharded-cluster/)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly reflects MongoDB 6.0+ defaults (128 MB chunk size) and the 6.0.3+ data-size-based balancing thresholds.
- The `sh.stopBalancer(30000)` timeout example is valid for both the legacy `mongo` shell and modern `mongosh`.
- The `noBalance` field in `config.collections` is the correct low-level mechanism for per-collection balancer control, though using the `sh.disableBalancing()` helper is the recommended approach (the post shows both, which is appropriate).
- The pre-6.0.3 chunk-count migration threshold table (2/4/8) is accurate.
- None.
