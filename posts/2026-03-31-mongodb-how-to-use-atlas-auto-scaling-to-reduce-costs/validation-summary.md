# Validation Summary: How to Use Atlas Auto-Scaling to Reduce Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- Atlas Auto-Scaling (Cluster Tier and Storage)
- Atlas Admin API v1.0
- Atlas Online Archive (mentioned)

## Sources Consulted
- MongoDB Atlas Auto-Scaling documentation: https://www.mongodb.com/docs/atlas/cluster-autoscaling/
- MongoDB Atlas Admin API v1.0 — Clusters endpoint: https://www.mongodb.com/docs/atlas/reference/api/clusters-modify-one/
- MongoDB Atlas Admin API v1.0 — Events endpoint: https://www.mongodb.com/docs/atlas/reference/api/events-projects-get-all/
- MongoDB Atlas cluster configuration reference: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Clusters

## Issues Found
1. **`diskSizeGB` incorrectly nested under `providerSettings`**: In the "Enabling Storage Auto-Scaling" section, the JSON snippet placed `diskSizeGB` under `providerSettings`. In the Atlas Admin API v1.0, `diskSizeGB` is a top-level field in the cluster configuration request body, not a child of `providerSettings`. The `providerSettings` object contains provider-specific fields like `providerName`, `instanceSizeName`, and `regionName`. Fixed by moving `diskSizeGB` to the root level of the JSON object and removing the unnecessary `providerSettings` wrapper.

## Review Notes
- The post uses the Atlas Admin API v1.0. MongoDB has introduced a v2 API with slightly different field structures (e.g., the v2 API nests some fields differently). The v1.0 API still works but authors may want to update to v2 in the future.
- The scaling trigger thresholds (75% CPU for 1 hour to scale up, below 50% CPU for 24 hours to scale down, 90% disk to trigger storage scaling) are consistent with documented Atlas behavior, though exact thresholds can vary and MongoDB may adjust them over time.
- The event type name `AUTO_SCALING_INITIATED` used in the monitoring section is plausible but readers should consult the Atlas event types documentation for the exact event type names available in their API version.
- The `jq '.providerSettings.instanceSizeName'` path for checking the current tier is correct for the v1.0 API response format.
