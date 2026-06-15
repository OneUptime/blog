# Validation Summary: How to Configure Falco for Runtime Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco
- Falco Helm chart
- Falcosidekick
- Kubernetes
- Kubernetes audit logging
- Falco rules
- Prometheus metrics
- Elasticsearch
- Slack and PagerDuty alert routing

## Sources Consulted
- Falco Kubernetes Helm deployment documentation: https://falco.org/docs/setup/kubernetes/
- Falco Operator deployment documentation: https://falco.org/docs/setup/operator/
- Falco default and custom rules documentation: https://falco.org/docs/concepts/rules/default-custom/
- Falco Kubernetes audit events documentation: https://falco.org/docs/concepts/event-sources/plugins/kubernetes-audit/
- Falco metrics documentation: https://falco.org/docs/concepts/metrics/
- Falco daemon arguments documentation: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco alerts forwarding documentation: https://falco.org/docs/concepts/outputs/forwarding/
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falcosidekick configuration example: https://github.com/falcosecurity/falcosidekick/blob/master/config_example.yaml

## Issues Found
- The installation section described Helm as the recommended Kubernetes deployment path and used `driver.kind=ebpf`. Current Falco documentation recommends the Falco Operator as the Kubernetes-native path, with Helm still supported, and the chart uses `modern_ebpf` or `auto` rather than `ebpf`. Updated the prose and Helm commands to use `driver.kind=modern_ebpf`.
- The Falco log command selected pods by label but did not specify the `falco` container. Because the chart can run multiple containers in the Falco pod, updated the command to include `-c falco`.
- The custom rules deployment used a manually created ConfigMap and a `configmap://` value. The official chart uses the `customRules` Helm value to create/load custom rules. Replaced the ConfigMap flow with `--set-file 'customRules.custom-rules\.yaml=custom-rules.yaml'`.
- The Falcosidekick destination count and Elasticsearch example were stale. Updated the count to 60+ destinations and removed the obsolete Elasticsearch `_doc` type setting.
- The Kubernetes audit log section omitted the `k8saudit` plugin requirement and referenced an undefined `allowed_service_accounts` list. Added the list and included the official chart values file used to enable syscall plus Kubernetes audit sources.
- The tuning section used the removed or unsupported `--stats-interval` Falco flag. Replaced it with current `-o metrics.*` options.
- The Prometheus metrics example used incorrect chart nesting and outdated metric names. Updated the values snippet to use top-level `metrics`, `falco.webserver.prometheus_metrics_enabled`, and current `falcosecurity_*` metric names.

## Review Notes
Local `helm`, `falco`, `ruby`, and `yq` binaries were not available in the workspace, so command execution and Falco rule dry-run validation could not be performed locally. Verification was performed against the current official Falco documentation and upstream chart/configuration sources.
