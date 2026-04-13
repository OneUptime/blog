# Validation Summary: How to Automate MongoDB Atlas with the Atlas Admin API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Admin API v2
- HTTP Digest Authentication
- curl CLI
- jq CLI
- Python `requests` library
- Bash scripting
- AWS (as cloud provider example)

## Sources Consulted
- MongoDB Atlas Admin API v2 documentation: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas API Authentication: https://www.mongodb.com/docs/atlas/configure-api-access/
- MongoDB Atlas Alert Configurations API: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Alert-Configurations
- MongoDB Atlas Clusters API: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Clusters
- MongoDB Atlas Database Users API: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Database-Users
- MongoDB Atlas Project IP Access List API: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Project-IP-Access-List
- Python `requests` library HTTPDigestAuth: https://docs.python-requests.org/en/latest/user/authentication/#digest-authentication

## Issues Found
1. **Alert configuration payload was incorrect** (Configuring Alerts section):
   - **What was wrong**: The `eventTypeName` was set to `"NORMALIZED_SYSTEM_CPU_USER"`, which is a metric name, not an event type. The alert used a `threshold` object instead of `metricThreshold`.
   - **What was changed**: Changed `eventTypeName` to `"OUTSIDE_METRIC_THRESHOLD"` (the correct event type for metric-based alerts). Replaced `threshold` with `metricThreshold` and added the `metricName: "NORMALIZED_SYSTEM_CPU_USER"` field inside it, along with `mode: "AVERAGE"`.
   - **Why**: In Atlas Admin API v2, metric-based alerts require `eventTypeName` to be `"OUTSIDE_METRIC_THRESHOLD"` and the specific metric to be specified inside a `metricThreshold` object with a `metricName` field. The original payload would have been rejected by the API.

## Review Notes
- The base URL `https://cloud.mongodb.com/api/atlas/v2` is correct for the Atlas Admin API v2.
- All API endpoints (`/groups/{groupId}/clusters`, `/groups/{groupId}/databaseUsers`, `/groups/{groupId}/accessList`, `/groups/{groupId}/alertConfigs`) are correct for v2.
- The Digest Authentication approach using `--digest` with curl and `HTTPDigestAuth` in Python is correct.
- The date-based API versioning header format `application/vnd.atlas.2023-01-01+json` is accurate.
- The cluster creation payload uses the correct v2 format with `replicationSpecs[].regionConfigs[]` containing `providerName`, `regionName`, `priority`, and `electableSpecs`.
- The database user CRUD operations use correct HTTP methods (POST create, PATCH update, DELETE remove) and URL patterns.
- The Python wrapper example correctly uses `HTTPDigestAuth` from the `requests` library and follows good practices (environment variables for credentials, `raise_for_status()` for error handling).
