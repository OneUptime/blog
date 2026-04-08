# Validation Summary: How to Create and Manage Clusters with the Atlas CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- Atlas CLI (`atlas` command)
- AWS (as cloud provider example)
- Bash scripting
- jq (JSON processing)

## Sources Consulted
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/
- `atlas clusters create` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-create/
- `atlas clusters update` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-update/
- `atlas clusters watch` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-watch/
- `atlas clusters delete` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-delete/
- `atlas clusters connectionStrings describe` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-connectionstrings-describe/
- Atlas Admin API v2 Cluster resource documentation: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas free tier limitations: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/

## Issues Found

1. **Removed `--members 3` flag from dedicated cluster creation command (line 46).** The `--members` flag does not exist in the current Atlas CLI. Atlas creates a 3-member replica set by default for dedicated clusters, so this flag was both invalid and unnecessary.

2. **Fixed pause/resume example using M0 cluster name (lines 105-107).** The original example used `myFreeCluster` (an M0 free-tier cluster), but M0 clusters cannot be paused or resumed manually. Changed the example to use `myDevCluster` and added a note clarifying that pausing is only available for M10+ dedicated clusters.

3. **Updated JSON cluster configuration file to use current API format (lines 56-69).** The original config used deprecated fields `replicationFactor`, `numShards`, and the legacy `providerSettings` structure. Replaced with the current `replicationSpecs` array with `regionConfigs` and `electableSpecs`, which aligns with Atlas Admin API v2.

## Review Notes
- The automation script at the end uses M10 tier, which is a valid paid tier for CI testing scenarios.
- The `--force` flag on `atlas clusters delete` correctly bypasses interactive confirmation.
- The `atlas clusters watch` command correctly blocks until the cluster reaches IDLE state.
- The connection string retrieval using `jq -r '.standardSrv'` is correct for extracting the SRV URI from JSON output.
