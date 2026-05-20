# Validation Summary: How to Integrate ArgoCD with Falco for Security

## Status
validated

## Post Type
Tutorial / technical integration guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Falco
- Falcosidekick
- Argo Events
- Argo Workflows
- Prometheus Operator ServiceMonitor
- PromQL

## Sources Consulted
- Falco Helm chart values and templates: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falco Helm chart package metadata: https://raw.githubusercontent.com/falcosecurity/charts/master/charts/falco/Chart.yaml
- Falco condition syntax: https://falco.org/docs/concepts/rules/conditions/
- Falco supported fields: https://falco.org/docs/reference/rules/supported-fields/
- Falco metrics documentation: https://falco.org/docs/concepts/metrics/
- Falco output channels and JSON alert format: https://falco.org/docs/concepts/outputs/channels/
- Falcosidekick Helm values: https://github.com/falcosecurity/charts/tree/master/charts/falcosidekick
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD resource health customizations: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo Events data filters: https://argoproj.github.io/argo-events/sensors/filters/data/
- Argo Events Argo Workflow trigger: https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/
- Prometheus Operator ServiceMonitor design/API documentation: https://prometheus-operator.dev/docs/getting-started/design/

## Issues Found
- Updated the Falco Helm chart `targetRevision` from `4.0.0` to current chart version `8.0.5` from the official chart metadata.
- Removed deprecated Falco `grpc` and `grpc_output` settings from the Helm values. Falco's current configuration marks gRPC output/server as deprecated.
- Added `metrics.enabled: true` and `serviceMonitor.create: true` to the Falco Helm values because Falco chart metrics are disabled by default.
- Added Helm `mounts.volumes` and `mounts.volumeMounts` entries so the GitOps-managed `falco-custom-rules` ConfigMap is actually mounted into `/etc/falco/rules.d/custom-rules.yaml`, which is part of Falco's default `rules_files`.
- Changed the custom rules Argo CD sync wave to `-1` so the ConfigMap is applied before Falco mounts it. Argo CD applies lower sync waves first and supports negative waves.
- Fixed the sensitive file rule condition. The original `fd.directory in (/root/.ssh, /home/*/.ssh)` used exact-list matching with a wildcard-like string; it now uses Falco path/string operators.
- Quoted CIDR values in the outbound connection rule to match Falco rule syntax examples for network strings.
- Corrected the automated response comment from applying a NetworkPolicy to labeling the pod for a quarantine NetworkPolicy selector; the command only applies a label.
- Corrected the ServiceMonitor guidance to account for the Falco chart's metrics service label `type: falco-metrics`.
- Replaced non-existent/old Prometheus metric examples using `falco_events_total` with current Falco metric `falcosecurity_falco_rules_matches_total`, using `rule_name` and numeric priority labels.

## Review Notes
- YAML parsing was verified locally for all YAML snippets, including embedded Helm values and embedded Falco rule YAML.
- The quarantine workflow assumes a separate NetworkPolicy exists that selects pods labeled `quarantine=true`; the workflow label alone does not isolate traffic.
