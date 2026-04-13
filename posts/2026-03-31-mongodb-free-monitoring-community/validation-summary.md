# Validation Summary: How to Use Free Monitoring in MongoDB Community

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Community Edition (versions 4.0–5.x)
- MongoDB Free Monitoring (deprecated feature)
- MongoDB Shell (mongosh)
- mongod.conf configuration

## Sources Consulted
- MongoDB Manual v5.2 — Free Monitoring: https://www.mongodb.com/docs/v5.2/administration/free-monitoring/
- MongoDB Manual — db.enableFreeMonitoring(): https://www.mongodb.com/docs/v5.2/reference/method/db.enableFreeMonitoring/
- MongoDB Manual — db.getFreeMonitoringStatus(): https://www.mongodb.com/docs/v5.2/reference/method/db.getFreeMonitoringStatus/
- MongoDB Manual — setFreeMonitoring command: https://www.mongodb.com/docs/manual/reference/command/setFreeMonitoring/
- MongoDB Blog — Introducing Free Cloud-based Monitoring: https://www.mongodb.com/blog/post/introducing-free-cloud-monitoring-for-mongodb

## Issues Found

### 1. Feature deprecated and decommissioned (Critical)
- **What was wrong:** The post presented MongoDB free monitoring as a currently available feature. MongoDB free monitoring was deprecated in April 2023 and the hosted dashboard was fully decommissioned in August 2023. The feature no longer functions in any MongoDB version.
- **What was changed:** Added a prominent deprecation notice at the top of the post explaining the timeline and recommending alternatives (Prometheus mongodb_exporter or MongoDB Atlas). Changed the introductory paragraph and summary from present tense to past tense to reflect that the feature is no longer available.
- **Why:** A blog post dated March 2026 cannot present a feature removed in 2023 as currently functional without misleading readers.

## Review Notes
- All shell commands (`db.enableFreeMonitoring()`, `db.getFreeMonitoringStatus()`, `db.disableFreeMonitoring()`) are technically correct for MongoDB 4.0–5.x.
- The `mongod.conf` configuration format and valid state values (`on`, `off`, `runtime`) are accurate.
- The listed metrics (operation execution time, memory, CPU, oplog window, network I/O) and their characteristics (1-minute updates, 24-hour retention) are accurate for when the feature was operational.
- The comparison table between free monitoring and Atlas/Prometheus is reasonable.
- The post correctly notes that free monitoring works for standalone and replica set deployments. It does not mention sharded clusters, which is appropriate since free monitoring only worked on individual shards (as replica sets), not at the unified cluster level.
