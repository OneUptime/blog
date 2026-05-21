# Validation Summary: How to Set Up Runtime Security Monitoring for Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Falco
- Falcosidekick
- Kubernetes audit policies
- Prometheus Operator PrometheusRule resources
- Kubernetes CronJobs
- Bash and jq

## Sources Consulted
- Falco rules supported fields: https://falco.org/docs/reference/rules/supported-fields/
- Falco rules basic elements: https://falco.org/docs/concepts/rules/basic-elements/
- Falco official rules repository: https://github.com/falcosecurity/rules
- Falco Helm chart README and values: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/tree/master/charts/falcosidekick
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio access logging with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio pilot-discovery exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio MeshConfig outbound traffic policy reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Kubernetes audit policy reference: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The Falco rule referenced `k8s.pod.label.security.istio.io/tlsMode`, which is not the correct syntax for labels containing dots and slashes. Changed it to `k8s.pod.label[security.istio.io/tlsMode]`, which Falco documents as valid bracket notation.
- The Falco Helm upgrade command used `extraVolumes` and `extraVolumeMounts`, which are not current values in the official Falco chart. Changed the example to use the chart-supported `customRules` value with `--set-file`.
- The Istio config rejection Prometheus alert used `rate()` on `pilot_xds_*_reject` metrics. Istio documents these as LastValue metrics, so the alert now checks the current summed values directly.
- The Telemetry access logging example specified a provider name and used an unsafe header comparison. Updated it to use the default provider and `has(request.headers["x-forwarded-for"])`, matching Istio's CEL filter pattern for optional fields.
- The drift detection script described an ALLOW policy with no rules as open access. Istio documents that missing rules never match; an empty rule (`- {}`) is what allows all. Updated the check to detect empty ALLOW rules and account for the default ALLOW action.

## Review Notes
The examples are now aligned with current Istio 1.30 and current Falco chart/rule documentation. Some operational assumptions remain environment-specific, such as the exact expected sidecar injector webhook count and whether the selected CronJob image includes every helper used by the drift-check script.
