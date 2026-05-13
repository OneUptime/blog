# Validation Summary: How to Use CEL Expressions for Prometheus Operator Health in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux Kustomization
- Common Expression Language (CEL)
- Kubernetes
- Prometheus Operator
- Prometheus
- Alertmanager
- ThanosRuler
- ServiceMonitor
- PodMonitor
- PrometheusRule
- AlertmanagerConfig

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux v2.5 release announcement: https://fluxcd.io/blog/2025/02/flux-v2.5.0/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux `get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator compatibility documentation: https://prometheus-operator.dev/docs/getting-started/compatibility/
- Prometheus Operator troubleshooting documentation: https://prometheus-operator.dev/docs/platform/troubleshooting/

## Issues Found
- The post used a non-existent nested `healthChecks[].cel.healthyWhen` syntax. Flux documents CEL custom health checks under the top-level `.spec.healthCheckExprs` field with `current`, optional `failed`, and optional `inProgress` expressions. Updated all examples to use `healthChecks` for resource references and sibling `healthCheckExprs` entries for CEL logic.
- The prerequisites listed Flux v2.3 for CEL custom health checks, but Flux v2.5 introduced Kustomization CEL custom health checks. Updated the prerequisite to Flux v2.5 or later.
- The Kubernetes prerequisite was pinned to v1.25 even though current Flux support is version-specific and newer Flux releases document newer supported Kubernetes versions. Updated the prerequisite to require a Kubernetes version supported by the installed Flux release.
- The post stated that ServiceMonitor, PodMonitor, PrometheusRule, and AlertmanagerConfig have no status conditions at all. Current Prometheus Operator API documentation shows optional, feature-gated status reporting for configuration resources. Updated the wording to describe them as configuration resources with optional, feature-gated status.
- The post recommended `wait: true` for ServiceMonitors and PrometheusRules as API-server acceptance verification. Flux documents `wait: true` as health checking for all reconciled resources, not merely apply validation. Removed `wait: true` from configuration-only examples and described Flux's apply step as the API-server validation.
- The CEL failure checks only treated `Available=False` as failed. Prometheus Operator documents `Available` as also supporting `Degraded`, so the examples now fail fast on both `False` and `Degraded`.
- The debugging command used `flux get kustomization prometheus`; current Flux CLI documentation lists `flux get kustomizations`. Updated the command to `flux get kustomizations --namespace flux-system`.

## Review Notes
The Prometheus, Alertmanager, and ThanosRuler condition names and status fields were consistent with the current Prometheus Operator API reference. The local workspace did not have `flux`, `kubectl`, `ruby`, or `yq` installed, so CLI and YAML validation were performed against official documentation rather than local command output.
