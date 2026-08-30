# Validation Summary: How to Discover Beyla Services by Kubernetes Namespace, Pod Label, Executable Path, or Open Port

## Status
validated

## Post Type
Technical configuration guide / Kubernetes observability tutorial

## Technologies Covered
- Grafana Beyla v3.33.x
- eBPF application auto-instrumentation and process discovery
- Kubernetes metadata, RBAC, ServiceAccounts, Pods, and DaemonSets
- YAML discovery selectors and glob matching
- Prometheus metrics, `survey_info`, and `target_info`
- OpenTelemetry metrics and traces
- `kubectl`

## Sources Consulted
- [Grafana Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Grafana Beyla Kubernetes quickstart](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/)
- [Deploy Beyla in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Grafana Beyla Kubernetes metadata and informer configuration](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Grafana Beyla Prometheus and OpenTelemetry export configuration](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Grafana Beyla global configuration and debug logging](https://grafana.com/docs/beyla/latest/configure/options/)
- [Grafana Beyla exported metrics](https://grafana.com/docs/beyla/latest/metrics/)
- [Grafana Beyla v3.33.0 generated configuration schema](https://github.com/grafana/beyla/blob/v3.33.0/docs/config-schema.json)
- [Grafana Beyla v3.33.0 discovery matcher implementation](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/appolly/discover/matcher.go)
- [Grafana Beyla v3.33.0 glob selector implementation](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/appolly/services/attr_glob.go)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found
1. **The environment-variable selectors were described as selecting only a single process** - Both `BEYLA_OPEN_PORT` and `BEYLA_AUTO_TARGET_EXE` can match one process or a group of related processes. Updated the opening description to reflect that behavior.
2. **The AND/OR rule was stated for every field rather than selector fields** - Settings such as `exports` are per-service overrides, not matching conditions. Scoped AND semantics to selector fields, clarified that matching any entry selects a process, and documented that a later matching entry overrides earlier `exports` settings.
3. **The Kubernetes RBAC guidance omitted resources used by the default informers** - The official role grants `list` and `watch` for ReplicaSets and for Pods, Services, and Nodes. Updated the permission list to match the documented role.
4. **The Kubernetes matching explanation was overly broad** - Beyla instruments matching processes inside Pods rather than Pods themselves, and not every discovery field is a glob. Updated the text to refer to processes and specifically to namespace and label-value glob matching.
5. **The `containers_only` permission behavior was missing** - Beyla ignores this selector when it cannot inspect process network namespaces. Added the documented permission caveat.
6. **The `exports` example implied that the list enables exporters** - `exports` only chooses among telemetry signals whose corresponding exporters are already configured. Qualified the example accordingly.
7. **Configurable defaults were called built-in exclusions** - Replaced “built-in exclusions” with “default exclusions” to match the configurable `default_exclude_instrument` behavior.
8. **The DaemonSet log command could inspect the wrong single Pod** - `kubectl logs daemonset/beyla` resolves to one Pod unless all Pods are requested. Added `--all-pods=true` so discovery can be checked on the node running the known target.
9. **Prometheus instance-label verification omitted label-collision behavior** - Prometheus replaces Beyla's per-process `instance` label with the scrape target by default. Added the documented `honor_labels: true` requirement for direct Prometheus scraping.

## Review Notes
- Reviewed against the current Grafana Beyla v3.33.x documentation and the v3.33.0 source. The post does not pin a Beyla version, so future changes to `latest` may require another review.
- All revised YAML examples were loaded and validated successfully with Beyla v3.33.0's own `LoadConfig` and `Validate` methods.
- `cmd_args` is a valid glob selector in the v3.33.0 generated schema and implementation. It is currently omitted from the standalone service-discovery page's selector table, so the source schema was used to verify the Java example.
- The quoted comma-separated `open_ports` values, inclusive ranges, `containers_only`, Kubernetes label maps, `exports`, `exclude_instrument`, `survey`, and `prometheus_export` structures are current and valid.
- Survey mode correctly discovers and reports targets through `survey_info` without attaching instrumentation. A configured metrics exporter is required; the example correctly enables the Prometheus exporter.
- All four links in the post's Official Documentation section resolve to the intended current Grafana documentation pages.
