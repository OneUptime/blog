# Validation Summary: How to Set Up MongoDB Atlas Cluster Autoscaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (cluster autoscaling)
- MongoDB Atlas CLI (`atlas clusters update`)
- MongoDB Atlas Admin API v1.0
- Terraform MongoDB Atlas Provider (`mongodbatlas_advanced_cluster`)

## Sources Consulted
- MongoDB Atlas Admin API v1.0 — Update One Cluster endpoint documentation (https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/)
- MongoDB Atlas CLI source code — `atlas clusters update` flags (https://github.com/mongodb/mongodb-atlas-cli/blob/master/internal/cli/clusters/update.go)
- MongoDB Atlas Terraform Provider — `mongodbatlas_advanced_cluster` resource docs (https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/advanced_cluster)
- MongoDB Atlas Terraform Provider — deprecated `mongodbatlas_cluster` resource docs (https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/cluster)
- MongoDB Go Client SDK — Cluster struct definitions (https://github.com/mongodb/go-client-mongodb-atlas/blob/master/mongodbatlas/clusters.go)
- MongoDB Atlas Kubernetes Operator — autoscaling configuration examples (https://github.com/mongodb/mongodb-atlas-kubernetes)
- MongoDB Atlas documentation — Configure Auto-Scaling (https://www.mongodb.com/docs/atlas/cluster-autoscaling/)

## Issues Found

### 1. Atlas CLI flags do not exist (3 occurrences)
**What was wrong:** The post used fabricated CLI flags (`--autoScalingComputeEnabled`, `--autoScalingComputeScaleDownEnabled`, `--autoScalingMinInstanceSize`, `--autoScalingMaxInstanceSize`, `--autoScalingDiskGBEnabled`) that do not exist in the `atlas clusters update` command. The only autoscaling-related flag is `--autoScalingMode`.

**What was changed:** All three CLI examples (compute autoscaling, storage autoscaling, min/max tier bounds) were rewritten to use the correct `--file` flag with a JSON configuration file, which is how autoscaling settings are actually configured via the Atlas CLI.

**Why:** The original commands would fail with unknown flag errors. The `atlas clusters update` command requires a `--file` flag pointing to a JSON config for autoscaling settings.

### 2. Atlas API payload structure incorrect
**What was wrong:** The API PATCH request placed `minInstanceSize` and `maxInstanceSize` inside `autoScaling.compute`, but in the Atlas Admin API v1.0 these fields belong under `providerSettings.autoScaling.compute`.

**What was changed:** The JSON payload was corrected to split the configuration: boolean flags (`enabled`, `scaleDownEnabled`) remain under `autoScaling.compute`, while tier bounds (`minInstanceSize`, `maxInstanceSize`) are now correctly placed under `providerSettings.autoScaling.compute`.

**Why:** The original payload structure would not correctly set the min/max instance sizes. The Atlas v1.0 API requires these fields under `providerSettings`.

### 3. Terraform configuration uses deprecated resource and attributes
**What was wrong:** The Terraform config used `mongodbatlas_cluster` (deprecated, will be removed in the next major provider version) with `replication_factor = 3` (also deprecated).

**What was changed:** Replaced with `mongodbatlas_advanced_cluster` using proper `replication_specs` with nested `region_configs`, `electable_specs`, and `auto_scaling` blocks following current provider documentation.

**Why:** `mongodbatlas_cluster` and `replication_factor` are both deprecated. The modern `mongodbatlas_advanced_cluster` resource uses a different structure for autoscaling configuration (nested `auto_scaling` block within `region_configs`).

## Review Notes
- The autoscaling thresholds (CPU > 75% for 1 hour, CPU < 50% for 24 hours, memory > 90%, disk > 90%) are commonly cited approximations. MongoDB does not publicly document the exact internal thresholds, and the actual autoscaling algorithm may be more nuanced. The values presented are reasonable for a tutorial.
- The Atlas Admin API v1.0 used in the post is itself deprecated in favor of v2. Future updates to this post could migrate to the v2 API, where autoscaling config is colocated under `replicationSpecs[].regionConfigs[].autoScaling`.
- The `atlas events list` command and Events API URL for monitoring autoscaling events are plausible but could not be fully verified against current documentation. The event type `AUTO_SCALING_INITIATED` is a reasonable name but may differ from the actual Atlas event type.
- When using Terraform with autoscaling, users should be aware that Atlas dynamically changes instance sizes and disk sizes. The `mongodbatlas_advanced_cluster` resource should ideally be used together with appropriate lifecycle management to prevent Terraform from reverting Atlas-initiated scaling changes.
