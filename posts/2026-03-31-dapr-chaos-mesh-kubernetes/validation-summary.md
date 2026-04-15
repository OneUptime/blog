# Validation Summary: How to Use Chaos Mesh with Dapr on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Chaos Mesh (CNCF chaos engineering platform)
- Dapr (Distributed Application Runtime)
- Kubernetes
- Helm

## Sources Consulted
- Chaos Mesh official documentation (https://chaos-mesh.org/docs/)
- Chaos Mesh Helm chart values.yaml (https://github.com/chaos-mesh/chaos-mesh/blob/master/helm/chaos-mesh/values.yaml)
- Chaos Mesh Go source types: `networkchaos_types.go`, `podchaos_types.go`, `stresschaos_types.go`, `common_types.go`
- Chaos Mesh Schedule CRD documentation (https://chaos-mesh.org/docs/define-scheduling-rules/)
- Chaos Mesh pause/resume documentation (https://chaos-mesh.org/docs/pause-experiment/)

## Issues Found

1. **`scheduler` field in PodChaos spec (was lines 89-90)**: The `scheduler` field with `cron: "@every 5m"` was removed from all chaos experiment CRDs in Chaos Mesh 2.0. Applying a manifest with this field on Chaos Mesh 2.x produces a validation error (`unknown field "scheduler"`). Scheduling is now done exclusively via the `Schedule` CRD. **Fix**: Removed the `scheduler` block from the PodChaos manifest, making it a one-shot experiment consistent with the other examples in the post.

2. **`--overwrite` flag on resume annotation command (was line 132)**: The command used `experiment.chaos-mesh.org/pause- --overwrite` to resume an experiment. The `--overwrite` flag is unnecessary when removing an annotation (trailing `-` syntax). While it does not cause an error, it is misleading and not present in the official documentation. **Fix**: Removed `--overwrite` from the resume command.

## Review Notes
- The post uses the `chaos-testing` namespace, whereas current official Chaos Mesh docs (v2.8.x) recommend `chaos-mesh` as the namespace. Both work — namespace choice is arbitrary — but readers following official docs may notice the difference. This is not an error.
- All CRD API versions (`chaos-mesh.org/v1alpha1`), field names, and value types were verified against the Chaos Mesh source code and are correct.
- The NetworkChaos `correlation: "25"` is correctly specified as a string (the field type is `string` in the Go source with a `FloatStr` webhook validator).
- The Helm repo URL, chart name, daemon runtime/socket path values, and dashboard service name/port are all correct per current documentation.
