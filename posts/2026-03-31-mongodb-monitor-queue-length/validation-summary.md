# Validation Summary: How to Monitor MongoDB Queue Length

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (serverStatus command, globalLock, WiredTiger concurrency tickets)
- MongoDB Shell (mongosh / legacy mongo shell)
- Python (pymongo driver)

## Sources Consulted
- MongoDB `serverStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `currentOp` command reference: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB FAQ on Concurrency: https://www.mongodb.com/docs/manual/faq/concurrency/
- MongoDB WiredTiger Storage Engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB 6.0 Compatibility Changes: https://www.mongodb.com/docs/manual/release-notes/6.0-compatibility/

## Issues Found
- **Hard-coded ticket count in utilization calculation**: The `get_ticket_metrics()` function hard-coded `128` in the write utilization formula (`tickets["write"]["out"] / 128 * 100`) and in the print output (`{metrics['write_out']}/128 in use`). This is incorrect when the ticket count has been changed from the default — something the post itself demonstrates how to do. Fixed to use `totalTickets` from the `serverStatus` response, which always reflects the actual configured value.

## Review Notes
- The `wiredTigerConcurrentReadTransactions` and `wiredTigerConcurrentWriteTransactions` parameters shown in the "Adjusting WiredTiger Concurrency Tickets" section were deprecated in MongoDB 6.0 in favor of `storageEngineConcurrentReadTransactions` and `storageEngineConcurrentWriteTransactions`. The deprecated names still function but may be removed in a future release. A future update to this post could mention the newer parameter names.
- Starting in MongoDB 7.0, a dynamic concurrency control algorithm was introduced that automatically adjusts the number of available tickets rather than using a static default of 128. The 128 figure cited in the post is accurate as the maximum/ceiling, but the effective number of available tickets on MongoDB 7.0+ may be lower at any given time due to dynamic adjustment.
- All `serverStatus` field paths (`globalLock.currentQueue`, `globalLock.activeClients`, `wiredTiger.concurrentTransactions`) and `currentOp` usage (`inprog`, `waitingForLock`, `secs_running`) were verified as correct against official documentation.
