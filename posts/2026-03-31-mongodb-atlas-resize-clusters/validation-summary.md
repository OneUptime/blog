# Validation Summary: How to Resize Atlas Clusters Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (managed cluster service)
- MongoDB Atlas CLI (`atlas clusters update`, `atlas clusters describe`)
- MongoDB Atlas Admin API v2 (cluster PATCH endpoint)
- MongoDB replica set rolling restart process
- MongoDB driver connection options (`retryWrites`, `retryReads`)
- Bash scripting (polling script with `jq`)

## Sources Consulted
- MongoDB Atlas CLI `clusters update` documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-update/
- MongoDB Atlas CLI `clusters describe` documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-describe/
- MongoDB Atlas Admin API v2 — Update One Cluster: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Clusters/operation/updateCluster
- MongoDB Atlas API Authentication: https://www.mongodb.com/docs/atlas/api/api-authentication/
- MongoDB Atlas Cluster Auto-Scaling: https://www.mongodb.com/docs/atlas/cluster-autoscaling/
- MongoDB Atlas Customize Cluster Storage: https://www.mongodb.com/docs/atlas/customize-storage/
- MongoDB Atlas Scale a Cluster: https://www.mongodb.com/docs/atlas/scale-cluster/
- MongoDB Replica Set Elections: https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB Retryable Writes: https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Retryable Reads: https://www.mongodb.com/docs/manual/core/retryable-reads/

## Issues Found
1. **Incorrect claim that storage can only be increased** (line 76): The post stated "Storage can only be increased, not decreased." This is factually incorrect. Atlas does support decreasing storage, but unlike increases (which are done in place with zero downtime), decreases require Atlas to provision new volumes and sync data, causing downtime on each node during the process. Fixed the note to accurately describe the difference between storage increases and decreases.

## Review Notes
- The Atlas Admin API examples use HTTP Digest authentication with API keys, which is correct but now considered legacy by MongoDB. OAuth2 Service Accounts are the newer recommended authentication method. This is not an error but worth noting for future updates.
- The `providerSettings` JSON body structure used in the API examples works but is the older pattern. Newer API versions also support configuring instance sizes via `replicationSpecs[n].regionConfigs[m].{type}Specs.instanceSize`. The current approach remains functional.
- The "under 30 seconds" claim for PRIMARY switchover is conservative but reasonable. MongoDB documentation indicates the median election time is typically around 12 seconds with default settings.
- Modern MongoDB drivers enable `retryWrites` and `retryReads` by default, so explicitly setting them is only necessary if they were previously disabled. The recommendation is still good practice for clarity.
