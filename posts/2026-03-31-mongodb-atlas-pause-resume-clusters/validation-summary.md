# Validation Summary: How to Pause and Resume Atlas Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (cluster management, pause/resume)
- Atlas CLI (`atlas clusters pause`, `atlas clusters start`, `atlas clusters describe`)
- Atlas Admin API v2 (PATCH endpoint for cluster updates)
- GitHub Actions (scheduled workflows with cron, workflow_dispatch)
- Bash scripting (polling loop with jq)

## Sources Consulted
- [Pause, Resume, or Terminate a Cluster - MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/pause-terminate-cluster/)
- [atlas clusters pause - Atlas CLI Docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-pause/)
- [atlas clusters start - Atlas CLI Docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-start/)
- [Update One Cluster in One Project - Atlas Admin API v2](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/2025-03-12/operation/operation-updategroupcluster)
- [How to Easily Pause and Resume Atlas Clusters - MongoDB Developer](https://www.mongodb.com/developer/how-to/pause-resume-atlas-clusters/)
- [MongoDB Community Forums - Disable auto resume of M10+ cluster](https://www.mongodb.com/community/forums/t/disable-auto-resume-of-m10-cluster-in-mongodb-atlas/150358)

## Issues Found
1. **Incorrect tier range**: The post stated pausing is available on "M10 through M40" tiers. In reality, pausing is available on M10+ dedicated clusters (no upper limit at M40). M50, M60, and higher tiers can also be paused. Also added NVMe exclusion. Changed "M10-M40 tiers only" to "M10+ dedicated tiers only (not M0/Flex/Serverless/NVMe)".

2. **Incorrect 30-day behavior**: The post stated "Clusters paused for more than 30 days are automatically terminated by Atlas." This is wrong. Atlas automatically **resumes** (not terminates) clusters paused for more than 30 days. This is a significant error as it could mislead readers about data safety. Changed "terminated" to "resumed".

3. **Incorrect Atlas Search limitation**: The post stated "A cluster cannot be paused if it has active Atlas Search nodes." This is inaccurate. You can pause a cluster with Search Nodes, but Atlas deletes the Search Node data on pause and automatically rebuilds the indexes on resume. Rewrote to reflect actual behavior.

4. **Invalid cluster state name**: The post referenced `RESTARTING` as a transitional state when resuming a cluster. This is not a valid Atlas `stateName` enum value. The correct transitional state is `REPAIRING`. Changed `RESTARTING` to `REPAIRING`.

## Review Notes
- The Atlas CLI commands (`atlas clusters pause` and `atlas clusters start`) are correct. The resume command is `start`, not `resume`.
- The Admin API v2 endpoint, HTTP method (PATCH), and payload format (`{"paused": true/false}`) are all correct.
- The GitHub Actions workflow is well-structured and functional. The cron expressions and workflow_dispatch configuration are valid YAML.
- The "60% or more" cost savings claim is reasonable and likely conservative — paused clusters only incur storage charges, and compute is typically the dominant cost component.
- The polling script correctly uses `jq` to extract `stateName` and checks for `IDLE` state, which is the correct ready state.
