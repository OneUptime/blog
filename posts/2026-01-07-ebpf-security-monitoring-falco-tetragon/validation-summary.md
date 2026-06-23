# Validation Summary: How to Implement Security Monitoring with eBPF (Falco, Tetragon)

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- eBPF
- Falco
- Falcosidekick
- Tetragon
- Kubernetes
- Helm
- Prometheus and Alertmanager
- Grafana and Loki

## Sources Consulted
- Falco host package installation: https://falco.org/docs/setup/packages/
- Falco Kubernetes quickstart and Helm examples: https://falco.org/docs/getting-started/falco-kubernetes-quickstart/
- Falco daemon CLI arguments: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco rules and supported fields: https://falco.org/docs/reference/rules/supported-fields/
- Falco chart values: https://raw.githubusercontent.com/falcosecurity/charts/master/charts/falco/values.yaml
- Falcosidekick Prometheus metrics documentation and source: https://github.com/falcosecurity/falcosidekick
- Tetragon TracingPolicy concepts: https://tetragon.io/docs/concepts/tracing-policy/
- Tetragon TracingPolicy selectors: https://tetragon.io/docs/concepts/tracing-policy/selectors/
- Tetragon Helm chart reference: https://tetragon.io/docs/reference/helm-chart/
- Tetragon metrics reference: https://tetragon.io/docs/reference/metrics/
- Tetragon chart values: https://raw.githubusercontent.com/cilium/tetragon/main/install/kubernetes/tetragon/values.yaml
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- Falco Helm examples used `driver.kind=modern_bpf`, but the current Falco chart documents `modern_ebpf`. Updated Helm install, deployment script, and tuning values.
- Falco Helm examples set `json_output` at the chart root. Updated to `falco.json_output=true`, which maps to the Falco configuration.
- The rule validation section used a non-existent `falco --validate` flag. Replaced it with `falco --dry-run` and included the default rules file so custom rules can reference default macros.
- The dangerous capabilities Falco rule had ambiguous boolean precedence. Added parentheses so `spawned_process` applies to all capability checks.
- Tetragon Helm commands used `tetragon.export.stdout.enabled`, which is not a current chart value. Updated to `export.mode=stdout`.
- Falcosidekick Prometheus `extralabels` used `source:falco`, but the setting expects a comma-separated list of event fields. Updated it to valid field labels.
- The Tetragon ServiceMonitor example hand-authored selectors instead of using current chart values. Replaced it with `tetragon.prometheus.serviceMonitor` Helm values.
- Prometheus alerting and Grafana examples used the wrong Tetragon metric `tetragon_policy_event_total` and an unsupported `action` label. Updated to `tetragon_policy_events_total` and policy-based queries.
- Tetragon event queries used lowercase `process_exec`; current documented metric label values use `PROCESS_EXEC`. Updated the Grafana query.
- Falco dashboard queries used `falco_events_total`; Falcosidekick currently exposes `falcosecurity_falcosidekick_falco_events_total`. Updated the dashboard queries.
- Alertmanager routes used deprecated `match` and `match_re` keys. Updated them to current `matchers` syntax.
- The performance tuning snippet placed Falco chart values under the wrong nesting and used obsolete buffer keys. Updated the Falco and Tetragon Helm values to match current chart structures.

## Review Notes
The remaining Falco and Tetragon rules are illustrative security policies that still require environment-specific tuning before production use. The post now uses current documented chart keys and metric names, but users should still pin chart and tool versions in real deployments.
