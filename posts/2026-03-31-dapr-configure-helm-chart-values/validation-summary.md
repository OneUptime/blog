# Validation Summary: How to Configure Dapr Helm Chart Values on Kubernetes

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Helm (Kubernetes package manager)
- Kubernetes

## Sources Consulted
- Dapr Helm chart repository: https://github.com/dapr/helm-charts
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart `values.yaml` (v1.17.4) from the official repository
- Dapr Helm chart `Chart.yaml` for subchart dependency verification

## Issues Found

1. **`global.logLevel` does not exist** — The post listed `global.logLevel: info` under Core Global Values. The Dapr Helm chart has no `global.logLevel` field; log level is configured per-component (e.g., `dapr_operator.logLevel`, `dapr_sentry.logLevel`). Removed this incorrect entry from the global values section. The per-component `logLevel` fields shown in the Component-Specific Values section were already correct.

2. **Wrong default image registry** — The post listed `global.registry: docker.io/daprio`. The actual default registry for Dapr images is `ghcr.io/dapr` (GitHub Container Registry). Changed to `ghcr.io/dapr`.

3. **`dapr_dashboard` is not part of the main chart** — The post listed `dapr_dashboard` as a component in the `dapr/dapr` Helm chart values. The Dapr Dashboard is actually a separate Helm chart (`dapr/dapr-dashboard`) and is not a subchart dependency of `dapr/dapr`. Replaced the `dapr_dashboard` values block with a note explaining it is a separate chart and showing the correct install command.

4. **`--reuse-values` recommendation is problematic** — The post recommended `helm upgrade --reuse-values` for upgrades. The official Dapr upgrade docs deliberately avoid this flag because it does not pick up new default values introduced in newer chart versions, which can cause unexpected behavior. Removed `--reuse-values` from the upgrade command and added an explicit warning note. Also updated the Summary section to recommend passing the values file explicitly with `-f` instead.

## Review Notes
- The post targets Dapr version 1.13.0 for installation and 1.14.0 for upgrade examples. These are older versions (current is 1.17.x), but the Helm value structure and commands remain accurate.
- The Dapr Helm chart also includes `dapr_scheduler` and `dapr_config` as subcharts in current versions, which the post does not mention. This is not an error since the post targets 1.13.x, but readers using newer versions should be aware of additional components.
- The official Dapr upgrade docs recommend manually updating CRDs before running `helm upgrade`. The post does not cover CRD updates, which is a common omission but not strictly a technical error in the Helm values context of this post.
- The mTLS default values (`workloadCertTTL: "24h"`, `allowedClockSkew: "15m"`) and HA settings (`replicaCount: 3`) were verified as accurate.
