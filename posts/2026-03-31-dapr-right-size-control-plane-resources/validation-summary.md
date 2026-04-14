# Validation Summary: How to Right-Size Dapr Control Plane Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Helm
- Prometheus (PromQL)
- kubectl

## Sources Consulted
- Dapr Helm chart source code: https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr Helm chart subcharts: https://github.com/dapr/dapr/tree/master/charts/dapr/charts
- Dapr Helm chart README (values reference): https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Dashboard repository: https://github.com/dapr/dashboard
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml

## Issues Found

### 1. Dashboard incorrectly shown as part of main Dapr Helm chart
**What was wrong:** Step 4 used `dapr_dashboard.enabled: false` and `--set dapr_dashboard.enabled=false` with `helm upgrade dapr dapr/dapr`, implying the dashboard is a subchart of the main Dapr chart. The dashboard is actually a separate Helm chart (`dapr/dapr-dashboard`) and has no `dapr_dashboard` key in the main chart's values.
**What was changed:** Replaced the incorrect YAML snippet and Helm command with the correct `helm uninstall dapr-dashboard -n dapr-system` command and a note about skipping installation in production.
**Why:** Using the incorrect Helm values would silently have no effect, giving users a false sense that the dashboard was disabled.

### 2. Missing control plane components
**What was wrong:** The component list said "The Dapr control plane consists of" but only listed operator, sentry, placement, and dashboard. It omitted `dapr-sidecar-injector` and `dapr-scheduler`, which are actual control plane subcharts. The dashboard was listed as a control plane component but is a separate optional addon.
**What was changed:** Added `dapr-sidecar-injector` and `dapr-scheduler` to the component list. Moved the dashboard mention to a separate note clarifying it is a separate Helm chart.
**Why:** Readers might not right-size the sidecar-injector and scheduler resources if they are unaware these components exist.

### 3. HA replicaCount does not affect placement service
**What was wrong:** Step 5 suggested setting `global.ha.replicaCount: 2` as a general cost-saving measure. The Dapr documentation states that Placement service always runs 3 replicas in HA mode regardless of this setting.
**What was changed:** Added a note after the HA YAML snippet clarifying that placement always runs 3 replicas in HA mode, and the custom count only applies to operator, sentry, and sidecar-injector.
**Why:** Users could be confused when placement still runs 3 pods after setting replicaCount to 2.

## Review Notes
- The Prometheus queries use valid PromQL syntax including subquery notation (`[7d:]`), which requires Prometheus 2.7+. This version constraint is not mentioned but is unlikely to be an issue for most users.
- The blog does not include resource configuration examples for `dapr-sidecar-injector` or `dapr-scheduler` in the small/large cluster YAML snippets. These could be added in a future update.
- The `kubectl top` command requires the Kubernetes Metrics Server to be installed, which is not mentioned. Most managed Kubernetes clusters have it by default.
- The Helm value keys (`dapr_operator`, `dapr_sentry`, `dapr_placement`) and their resource configuration structure were verified as correct against the official chart.
