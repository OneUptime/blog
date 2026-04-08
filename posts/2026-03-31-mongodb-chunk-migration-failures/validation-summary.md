# Validation Summary: How to Troubleshoot Chunk Migration Failures in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (sharded clusters)
- MongoDB Balancer
- Chunk migration (moveChunk)
- mongos routing configuration

## Sources Consulted
- MongoDB Manual: Sharding — Chunk Migration: https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
- MongoDB Manual: moveChunk command: https://www.mongodb.com/docs/manual/reference/command/moveChunk/
- MongoDB Manual: Balancer configuration (config.settings): https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.settings
- MongoDB Manual: currentOp: https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB Manual: flushRouterConfig: https://www.mongodb.com/docs/manual/reference/command/flushRouterConfig/
- MongoDB Manual: sh.getBalancerState() and sh.isBalancerRunning(): https://www.mongodb.com/docs/manual/reference/method/sh.getBalancerState/

## Issues Found
- **Misleading description of migration settings**: The text introduced the `_secondaryThrottle` and `waitForDelete` settings with "If migrations are timing out, increase the migration timeout:" — but neither setting controls a timeout. `_secondaryThrottle: true` makes the balancer wait for replication to secondaries during migration, and `waitForDelete: false` tells the balancer not to wait for orphaned documents to be cleaned up before starting the next migration. Changed the lead-in to "Adjust throttle and cleanup settings to reduce migration pressure:" which accurately describes what the settings do.

## Review Notes
- All shell helper methods (`sh.getBalancerState()`, `sh.isBalancerRunning()`) are current and correct.
- The `moveChunk` command syntax with `find` and `to` parameters is correct.
- The `config.actionlog` query filtering on `what: "moveChunk.from"` is a valid way to inspect balancer migration activity.
- The `flushRouterConfig` command is the correct approach for clearing stale routing metadata on mongos instances.
- The `activeWindow` balancer configuration with `start`/`stop` time format is correct.
