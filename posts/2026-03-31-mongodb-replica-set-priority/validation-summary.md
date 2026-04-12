# Validation Summary: How to Configure Priority in MongoDB Replica Set Members

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB shell methods (`rs.conf()`, `rs.reconfig()`, `rs.initiate()`, `rs.status()`, `rs.stepDown()`)
- MongoDB replica set elections and priority configuration
- MongoDB write concern

## Sources Consulted
- MongoDB official documentation: Replica Set Configuration Reference (`members[n].priority`, `members[n].votes`, `members[n].hidden`, `members[n].secondaryDelaySecs`) — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB official documentation: Replica Set Elections — https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB official documentation: Priority 0 Replica Set Members — https://www.mongodb.com/docs/manual/core/replica-set-priority-0-member/
- MongoDB official documentation: Hidden Replica Set Members — https://www.mongodb.com/docs/manual/core/replica-set-hidden-member/
- MongoDB official documentation: Delayed Replica Set Members — https://www.mongodb.com/docs/manual/core/replica-set-delayed-member/
- MongoDB official documentation: `rs.stepDown()` — https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB official documentation: `rs.reconfig()` — https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB official documentation: `rs.conf()` — https://www.mongodb.com/docs/manual/reference/method/rs.conf/

## Issues Found
No technical issues found.

## Review Notes
- The post states that the highest-priority caught-up member "wins" the election. Official MongoDB documentation describes this as a best-effort convergence — higher-priority secondaries call elections sooner and are more likely to win, but a lower-priority member can briefly become primary before the system converges. The blog's wording is a reasonable and common simplification for a tutorial context.
- All shell methods (`rs.conf()`, `rs.reconfig()`, `rs.initiate()`, `rs.status()`, `rs.stepDown()`) are correct and current.
- The field name `secondaryDelaySecs` is the correct modern name (renamed from `slaveDelay` in MongoDB 5.0).
- Priority range (0–1000), default value (1), and all constraint rules (hidden → priority 0, delayed → priority 0, non-voting → priority 0) are accurate per official documentation.
