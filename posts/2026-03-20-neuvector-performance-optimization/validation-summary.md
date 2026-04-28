# Validation Summary: How to Optimize NeuVector Performance in Large Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NeuVector (controller, enforcer, scanner)
- Kubernetes (DaemonSet, Deployment, HPA, node affinity, tolerations, PVC)
- Helm (neuvector/core chart)
- NeuVector REST API (v1)
- kubectl
- jq

## Sources Consulted
- NeuVector Helm chart values.yaml: https://github.com/neuvector/neuvector-helm/blob/master/charts/core/values.yaml
- NeuVector Modes (Discover/Monitor/Protect): https://open-docs.neuvector.com/policy/modes/
- NeuVector Environment Variables documentation: https://open-docs.neuvector.com/5.2/deploying/production/details/
- NeuVector DLP & WAF Sensors: https://open-docs.neuvector.com/policy/dlp/
- NeuVector Production Deployment: https://open-docs.neuvector.com/deploying/production/
- Kubernetes HorizontalPodAutoscaler v2 API documentation
- Kubernetes node-role labels documentation

## Issues Found
1. **Incorrect Helm PVC field name**: The post used `storageAccessModes` under `controller.pvc`, but the official NeuVector Helm chart uses `accessModes`. Changed to `accessModes`.
2. **Incorrect PVC access mode for HA controller**: The post specified `ReadWriteOnce`, which would prevent multiple controller replicas (replicas: 3) from sharing the volume across nodes. The NeuVector Helm chart default is `ReadWriteMany`, which is what's actually needed for the HA setup. Changed to `ReadWriteMany`.
3. **Misleading "JVM" comment on a Go application**: The post said "Tune controller JVM if applicable" — NeuVector's controller is written in Go, not Java. Removed the misleading comment.
4. **Fabricated environment variables**: `CTRL_MAX_GOROUTINES` and `CTRL_SCAN_WORKERS` are not documented NeuVector controller environment variables (verified against NeuVector official docs and Helm chart). Replaced with the real, documented `CTRL_PERSIST_CONFIG` env var, which is the relevant one when enabling PVC persistence.
5. **Non-portable node label**: The post used `node-role.kubernetes.io/worker`, which is not a standard Kubernetes label and is not auto-applied by Kubernetes. Replaced with the portable approach: `node-role.kubernetes.io/control-plane` with `DoesNotExist` operator, which works on any standard Kubernetes distribution.
6. **Mode/comment mismatch in Step 4**: The comment said "Put batch processing services in Discover mode" but the API call set the mode to "Monitor". These are distinct modes (Discover learns rules, Monitor alerts only). Updated the comment to match the API call ("Monitor mode (alerts only, no blocking)") since Monitor is the appropriate mode for not-yet-trusted services that should only alert.

## Review Notes
- The HPA manifest uses `autoscaling/v2`, which is correct (stable since Kubernetes 1.23).
- The NeuVector REST API endpoints referenced (`/v1/group`, `/v1/policy/rule`, `/v1/scan/registry`, `/v1/scan/scanner`, `/v1/system/summary`) exist in the NeuVector API. The exact response field names in the `jq` examples for `/v1/system/summary` (e.g., `policy_groups`, `total_enforcers`) may vary by NeuVector version; readers should verify against their deployed version's API response. Left as-is since the queries are illustrative.
- Scaling rule of thumb (1 scanner per 500 images per hour) is a reasonable approximation but actual throughput depends heavily on image size and registry latency.
- The federation guidance (200-300 nodes per cluster) is reasonable general advice; NeuVector itself supports up to ~1000 nodes per cluster, but operational best practice favors smaller cluster sizes.
- DPI is not actually disabled by switching from Protect to Monitor mode — DPI inspection still occurs but enforcement actions become alerts only. To fully disable WAF/DLP overhead per group, the post correctly shows clearing `waf_sensors` and `dlp_sensors` on the group.
