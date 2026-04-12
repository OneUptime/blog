# Validation Summary: How to Respond to MongoDB Memory Pressure Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Atlas (managed service and CLI)
- MongoDB shell (mongosh / mongo)
- YAML configuration for mongod.conf

## Sources Consulted
- MongoDB WiredTiger Storage Engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB FAQ Storage: https://www.mongodb.com/docs/manual/faq/storage/
- MongoDB serverStatus command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB $indexStats aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB db.collection.stats() reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- Atlas CLI atlas clusters update: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-update/
- Atlas Cluster Sizing and Tier Selection: https://www.mongodb.com/docs/atlas/sizing-tier-selection/
- Atlas AWS Instance Sizes: https://www.mongodb.com/docs/atlas/reference/amazon-aws/

## Issues Found
1. **Ambiguous WiredTiger cache size formula**: The post said "default: 50% of RAM minus 1 GB" which could be misread as `(50% of RAM) - 1 GB`. The correct formula is `50% of (RAM - 1 GB)`, i.e., `0.5 * (RAM - 1GB)`. Added parentheses to clarify: "50% of (RAM minus 1 GB)".

2. **Incorrect Atlas M50 RAM**: The post stated "M50 gives 16 GB" but Atlas M50 instances provide 32 GB of RAM. Corrected to "M50 gives 32 GB".

## Review Notes
- The `$indexStats` comment says "MongoDB 3.2+" which is correct but very old context. MongoDB 3.2 reached end-of-life long ago. This is minor and not worth changing since the comment just indicates minimum version support.
- All WiredTiger cache field names in `serverStatus` output were verified as correct.
- The cache hit rate calculation formula is a well-established approximation used by MongoDB performance experts.
- The `atlas clusters update --tier` CLI syntax is current and correct for the modern Atlas CLI.
