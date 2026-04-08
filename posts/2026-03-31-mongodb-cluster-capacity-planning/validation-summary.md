# Validation Summary: How to Plan MongoDB Cluster Capacity

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Node.js driver
- Python (for growth projection example)

## Sources Consulted
- MongoDB official documentation: `serverStatus` command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation: `dbStats` command — https://www.mongodb.com/docs/manual/reference/command/dbStats/
- MongoDB official documentation: Connection Pool options (Node.js driver) — https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB FAQ: Diagnostics (WiredTiger cache metrics) — https://www.mongodb.com/docs/manual/faq/diagnostics/

## Issues Found
- **Failure overhead formula used insufficient multiplier**: The formula `per_node_capacity_target = peak_load * 1.5 / num_nodes` provides zero headroom during an N-1 failure at peak load. With 3 nodes and a 1.5x multiplier, each node is provisioned for `peak_load * 0.5`. When one node fails, 2 remaining nodes provide exactly `peak_load * 1.0` — no margin at all, contradicting the post's claim of serving peak traffic "comfortably." Changed the multiplier from 1.5 to 2.0, so each node is provisioned for `peak_load * 0.667`, and two surviving nodes provide `peak_load * 1.33` (33% headroom during failure).

## Review Notes
- All MongoDB commands (`serverStatus`, `dbStats`, `opcounters`) use correct syntax and return the documented field names.
- WiredTiger cache metric field names (with spaces) are accurate: `bytes currently in the cache`, `maximum bytes configured`, `pages read into cache`.
- The ~1 MB per connection estimate is a widely accepted planning figure, though actual usage varies by workload.
- Node.js driver options `maxPoolSize`, `minPoolSize`, and `waitQueueTimeoutMS` are all valid current options.
- The Python growth projection math is correct.
- The alerting thresholds table contains reasonable, commonly recommended values.
