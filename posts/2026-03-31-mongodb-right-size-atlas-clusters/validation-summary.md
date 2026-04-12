# Validation Summary: How to Right-Size MongoDB Atlas Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (cluster management, tier sizing)
- MongoDB Atlas Admin API v1.0 (measurements, cluster modification)
- WiredTiger storage engine (cache metrics via serverStatus)
- Python 3 (metrics processing scripts)
- mongosh / MongoDB Shell (JavaScript cache analysis)
- curl (API interaction)

## Sources Consulted
- MongoDB Atlas Admin API v1.0 documentation: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/
- MongoDB Atlas Admin API v2 documentation: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/
- MongoDB Atlas API v1 "Update One Cluster" endpoint: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/operation/operation-updatecluster
- MongoDB Atlas API v2 "Update One Cluster" endpoint: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/2025-03-12/operation/operation-updategroupcluster
- MongoDB Atlas Performance Advisor documentation: https://www.mongodb.com/docs/atlas/performance-advisor/
- MongoDB serverStatus command documentation (WiredTiger cache fields): https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Community Forum on cluster tier PATCH requests: https://www.mongodb.com/community/forums/t/change-the-cluster-tier-patch-request/246597

## Issues Found

1. **Step 6 PATCH body used v2 API format with v1.0 URL (incompatible)**
   - **What was wrong:** The curl command used the v1.0 API URL (`/api/atlas/v1.0/...`) but the request body used the v2 API structure (`replicationSpecs[].regionConfigs[].electableSpecs.instanceSize`). These are incompatible — the v1.0 API does not recognize `regionConfigs` or `electableSpecs`.
   - **What was changed:** Replaced the v2-style body with the correct v1.0 format using `providerSettings.instanceSizeName`.
   - **Why:** In the Atlas v1.0 API, instance size is set via `providerSettings.instanceSizeName` at the top level. The `replicationSpecs[].regionConfigs[].electableSpecs` structure is exclusive to the v2 API.

2. **Step 4 incorrectly referenced "Atlas Performance Advisor"**
   - **What was wrong:** The section said "Key charts to review in the Atlas Performance Advisor" but listed operational metrics (Opcounters, Connections, Network, WiredTiger Cache, System CPU, Disk IOPS). The Performance Advisor is specifically for slow query analysis and index recommendations — it does not display these metrics.
   - **What was changed:** Changed "Atlas Performance Advisor" to "Atlas Metrics dashboard".
   - **Why:** These metrics are found in the Atlas Metrics tab of the cluster view, not the Performance Advisor.

## Review Notes
- The Atlas Admin API v1.0 used throughout the post is deprecated. MongoDB recommends migrating to the v2 API (`/api/atlas/v2/`), which requires a versioned `Accept: application/vnd.atlas.2023-02-01+json` header. The v1.0 endpoints still function but may be removed in the future. A future update to use v2 throughout would be beneficial.
- The tier specifications in the Python simulation script (Step 5) use approximate/illustrative values for storage and IOPS. In practice, Atlas storage is independently configurable and IOPS vary by cloud provider and storage type. The CPU and RAM values are approximately correct. The script is clearly illustrative, so this is acceptable.
- The monitoring one-liner in Step 7 filters with `if p["value"]` which would also exclude `0.0` values (since 0 is falsy in Python). The first script correctly uses `if p['value'] is not None`. This is a minor inconsistency unlikely to matter in practice (0% CPU is rare) but worth noting.
- The WiredTiger cache JavaScript uses the `**` exponentiation operator, which requires mongosh (the modern MongoDB Shell). It will not work in the legacy `mongo` shell. This is fine for current MongoDB versions.
