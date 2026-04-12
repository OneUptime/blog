# Validation Summary: How to Monitor MongoDB Lock Percentage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (serverStatus, locks, currentOp, killOp, globalLock)
- Python with PyMongo driver
- WiredTiger storage engine concurrency configuration

## Sources Consulted
- MongoDB documentation on serverStatus locks output: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#locks
- MongoDB documentation on lock modes (IS, IX, S, X): https://www.mongodb.com/docs/manual/reference/command/serverStatus/#std-label-server-status-locks
- MongoDB documentation on currentOp command: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB documentation on killOp command: https://www.mongodb.com/docs/manual/reference/command/killOp/
- MongoDB documentation on globalLock metrics: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#globallock
- MongoDB documentation on WiredTiger concurrency parameters (wiredTigerConcurrentReadTransactions, wiredTigerConcurrentWriteTransactions): https://www.mongodb.com/docs/manual/reference/parameters/#wiredtiger-parameters
- PyMongo documentation for MongoClient and admin command usage: https://pymongo.readthedocs.io/en/stable/

## Issues Found
- **Lock mode abbreviations were inaccurate**: The post described `r` as "shared read intent lock" and `w` as "exclusive write intent lock". The correct MongoDB terminology is "intent shared (IS)" and "intent exclusive (IX)" respectively. Intent locks signal the intention to acquire a finer-grained lock — they are not themselves shared/exclusive locks with read/write qualifiers. Additionally, `R` was described as "global shared lock" and `W` as "global exclusive lock", but these lock modes (Shared and Exclusive) exist at all resource levels (Global, Database, Collection), not just the global level. Fixed to use standard MongoDB lock mode names: intent shared (IS), intent exclusive (IX), shared (S), and exclusive (X).

## Review Notes
- The WiredTiger concurrency ticket example sets `wiredTigerConcurrentWriteTransactions` to 128, which is the default value. As a syntax example it works, but readers may want to adjust to a value different from the default when actually tuning.
- All code examples (JavaScript shell commands and Python script) are syntactically correct and use current, non-deprecated APIs.
- The Python lock percentage calculation correctly handles the edge case of zero wait counts with `max(waited, 1)`.
- The `currentOp` filtering syntax and `waitingForLock` field usage are correct.
