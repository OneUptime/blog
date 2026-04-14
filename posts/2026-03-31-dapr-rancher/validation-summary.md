# Validation Summary: How to Use Dapr with Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Rancher (Kubernetes management platform)
- Kubernetes
- Helm
- Prometheus / Grafana (via Rancher Monitoring)
- ServiceMonitor (Prometheus Operator CRD)

## Sources Consulted
- Dapr Helm chart repository index: https://dapr.github.io/helm-charts/index.yaml
- Dapr Helm chart source (values.yaml, operator service template): https://github.com/dapr/helm-charts
- Dapr sidecar annotations source: https://github.com/dapr/dapr/blob/master/pkg/injector/annotations/annotations.go
- Rancher CLI source code (login.go, app.go, cluster.go, project.go, namespace.go, catalog.go): https://github.com/rancher/cli
- Rancher monitoring documentation: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher ServiceMonitor configuration docs: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors

## Issues Found

1. **Incomplete Deployment YAML (critical):** The Deployment manifest was missing required `spec.selector`, `spec.template.metadata.labels`, and `spec.template.spec.containers` fields. An `apps/v1` Deployment requires all of these — Kubernetes would reject the manifest with validation errors. Added `selector.matchLabels`, pod template `labels`, and a minimal `containers` spec with name, image, and port.

2. **`rancher app install` missing app name argument:** The `rancher app install` command requires two positional arguments: `[TEMPLATE_NAME] [APP_NAME]`. The post only provided the template name (`dapr`). Fixed to `rancher app install dapr dapr`.

3. **`rancher login --context <cluster-name>` incorrect format:** The `--context` flag for `rancher login` accepts a project context ID in the format `c-xxxxx:p-xxxxx`, not a cluster name. Since the blog post used `<cluster-name>` which is misleading, removed the `--context` flag (users are prompted to select a context after login).

## Review Notes
- The `rancher catalog add` command still exists in the Rancher CLI but the underlying catalog system was replaced in Rancher 2.5+ with "Apps & Marketplace" repositories. The command may not work as expected on newer Rancher installations. A future update could replace the CLI catalog section with `helm repo add` plus `kubectl` commands, which is the more universal approach.
- The ServiceMonitor example targets only the `dapr-operator` service. For comprehensive Dapr monitoring, additional ServiceMonitors for `dapr-sentry`, `dapr-placement-server`, and `dapr-sidecar-injector` would be needed. The example is correct but limited in scope.
- Dapr version 1.14.0 referenced in the multi-cluster script is a valid release but not the latest (1.17.4 as of April 2026). This is acceptable since the script uses a variable for the version.
- The Rancher CLI commands use plural forms (`clusters`, `projects`, `namespaces`) which are the canonical names; singular forms also work as aliases.
