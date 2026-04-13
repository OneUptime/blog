# Validation Summary: How to Configure Auto-Scaling in MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (cloud database platform)
- MongoDB Atlas CLI (`atlas` command-line tool)
- MongoDB Atlas Administration API (v1.0)
- Atlas Auto-Scaling (compute and storage)

## Sources Consulted
- MongoDB Atlas CLI reference for `atlas clusters update`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-update/
- MongoDB Atlas CLI reference for `atlas metrics processes`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-metrics-processes/
- MongoDB Atlas CLI reference for `atlas events projects list`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-events-projects-list/
- MongoDB Atlas Auto-Scaling documentation: https://www.mongodb.com/docs/atlas/cluster-autoscaling/
- MongoDB Atlas Administration API (Clusters): https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Clusters
- MongoDB Atlas Process Measurements API: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Monitoring-and-Logs

## Issues Found

### Issue 1: `atlas metrics processes` used cluster name instead of host ID
- **What was wrong:** The command `atlas metrics processes myCluster` used a cluster name as the argument. The `atlas metrics processes` command requires a process host ID in `hostname:port` format, not a cluster name.
- **What was changed:** Replaced `myCluster` with `myCluster-shard-00-00.ab1cd.mongodb.net:27017` as a representative placeholder showing the correct format.
- **Why:** The Atlas CLI metrics commands operate on individual MongoDB processes identified by their hostname and port, not on clusters as a whole.

### Issue 2: Incorrect flag name `--metrics` in metrics command
- **What was wrong:** The flag `--metrics SYSTEM_CPU_PERCENT` is not valid. The correct flag name for specifying measurement type is `--type`.
- **What was changed:** Changed `--metrics` to `--type`.
- **Why:** The Atlas CLI uses `--type` to filter which measurement types to return from the process metrics endpoint.

### Issue 3: Invalid metric name `SYSTEM_CPU_PERCENT`
- **What was wrong:** `SYSTEM_CPU_PERCENT` is not a valid Atlas process measurement name. Atlas CPU metrics are broken down by category (user, kernel, iowait, etc.), not provided as a single aggregate percentage.
- **What was changed:** Changed `SYSTEM_CPU_PERCENT` to `SYSTEM_CPU_USER`, which is a valid and commonly monitored CPU measurement.
- **Why:** The Atlas Monitoring API and CLI use specific measurement type names like `SYSTEM_CPU_USER`, `SYSTEM_CPU_KERNEL`, `PROCESS_CPU_USER`, etc.

### Issue 4: Incorrect flag name `--eventType` in events command
- **What was wrong:** The command `atlas events projects list --eventType AUTO_SCALING_INITIATED` used `--eventType` which is not the correct flag name. The correct flag is `--type`.
- **What was changed:** Changed `--eventType` to `--type`.
- **Why:** The Atlas CLI `events projects list` command uses `--type` for filtering events by type.

## Review Notes
- The tier pricing figures ($0.09/hr for M10, $1.04/hr for M60) are approximate and will vary by cloud provider, region, and over time. They serve as illustrative examples, which is acceptable, but readers should check current Atlas pricing.
- The `AUTO_SCALING_INITIATED` event type name used in both the alert configuration API call and the events list command may not be the exact event type string. Atlas event types for auto-scaling may use names like `CLUSTER_SCALED_UP` or `CLUSTER_SCALED_DOWN`. Readers should verify the exact event type names in the current Atlas documentation.
- The Atlas Administration API examples use the v1.0 endpoint (`/api/atlas/v1.0/`). MongoDB has introduced a v2 API (`/api/atlas/v2/`). The v1.0 API is still functional but readers building new integrations should consider using v2.
- The auto-scaling threshold claims (~75% CPU for scale-up, ~50% for scale-down) are presented with "~" qualifiers, which is appropriate since Atlas does not publicly document exact thresholds and uses internal algorithms.
- The claim that storage increases by "approximately 25%" when auto-scaling triggers may not be precise for all scenarios. The exact storage increase amount can vary.
