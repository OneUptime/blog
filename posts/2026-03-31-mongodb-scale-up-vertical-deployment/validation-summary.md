# Validation Summary: How to Scale Up (Vertical) a MongoDB Deployment

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MongoDB (replica sets, WiredTiger storage engine)
- mongosh (MongoDB Shell)
- AWS EC2 (instance resizing via CLI)
- systemd (service management)

## Sources Consulted
- MongoDB `serverStatus` command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB `rs.status()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB `rs.stepDown()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB `rs.printSecondaryReplicationInfo()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/
- MongoDB WiredTiger storage engine configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB
- MongoDB production notes on WiredTiger cache sizing: https://www.mongodb.com/docs/manual/administration/production-notes/#allocate-sufficient-ram-and-cpu
- AWS CLI `ec2 modify-instance-attribute` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html

## Issues Found
No technical issues found.

## Review Notes
- The WiredTiger cache sizing guideline states "roughly 50% of available RAM." The official MongoDB default formula is `50% of (RAM - 1 GB)` or 256 MB, whichever is larger. The post's phrasing is acceptable since it says "roughly" and frames it as a guideline, but readers configuring large servers should consult the official docs for the precise formula.
- The post uses `rs.printSecondaryReplicationInfo()`, which is the modern mongosh method name. Users on the legacy `mongo` shell (pre-mongosh) would need to use `rs.printSlaveReplicationInfo()` instead.
- All AWS CLI commands are syntactically correct. The example correctly stops the instance before modifying the instance type, which is required by AWS.
