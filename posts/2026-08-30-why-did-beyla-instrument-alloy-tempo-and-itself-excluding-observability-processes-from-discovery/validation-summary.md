# Validation Summary: Why Did Beyla Instrument Alloy, Tempo, and Itself? Excluding Observability Processes from Discovery

## Status
validated

## Post Type
Troubleshooting / Configuration Guide

## Technologies Covered
- Grafana Beyla
- eBPF application auto-instrumentation
- OpenTelemetry and the OpenTelemetry Collector
- Grafana Alloy and the `beyla.ebpf` component
- Grafana Tempo
- Prometheus
- Kubernetes service discovery and workload metadata
- `kubectl`

## Sources Consulted
- [Grafana Beyla service discovery documentation](https://grafana.com/docs/beyla/latest/configure/service-discovery/) - selector schema, glob matching, exclusion behavior, and documented defaults.
- [Grafana Beyla v3.33.0 default exclusion source](https://github.com/grafana/beyla/blob/v3.33.0/pkg/services/criteria.go#L10-L64) - exact executable, Kubernetes namespace, and Kubernetes container-name defaults.
- [Grafana Beyla v3.33.0 matcher source](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/appolly/discover/matcher.go#L128-L550) - OR behavior across entries, AND behavior within an entry, exclusion precedence, and resolved process executable paths.
- [Grafana Beyla v3.33.0 glob selector schema](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/appolly/services/attr_glob.go#L12-L151) - YAML field names, Pod label maps, and glob syntax.
- [Grafana Beyla Kubernetes quickstart](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/) - `attributes.kubernetes.enable`, DaemonSet configuration, ConfigMap mounting, and `BEYLA_CONFIG_PATH`.
- [Grafana Beyla global configuration options](https://grafana.com/docs/beyla/latest/configure/options/) - configuration-file loading and `BEYLA_CONFIG_PATH` behavior.
- [Grafana Alloy `beyla.ebpf` reference](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#discovery) - Alloy discovery and exclusion configuration.
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) - resource log syntax, `--since`, and `--all-pods` behavior.
- [Kubernetes `kubectl rollout` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/) - DaemonSet restart and rollout-status commands.
- [Kubernetes StatefulSet identity documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id) - stable `<statefulset-name>-<ordinal>` Pod naming.
- [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) - `app.kubernetes.io/part-of` and the other standard application labels.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/) and [storage documentation](https://prometheus.io/docs/prometheus/latest/storage/) - stale-series behavior and retained historical samples.
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs) - metric relabeling occurs immediately before ingestion.
- [Grafana Tempo configuration reference](https://grafana.com/docs/tempo/latest/configuration/) - trace block-retention behavior.
- [OpenTelemetry Collector telemetry transformation documentation](https://opentelemetry.io/docs/collector/transforming-telemetry/) - downstream filter-processor behavior.

## Issues Found
1. **Incomplete and imprecise description of the defaults** - The post mentioned only executable and namespace defaults and suggested that a custom image or directory path could evade them. Current Beyla also excludes exact standard Kubernetes container names, does not select by image identity, and uses suffix globs that are unaffected by merely moving a binary to another directory. Added the container-name guard and changed the failure cases to renamed or multi-call executables, custom container names, and non-default namespaces.
2. **Incorrectly quoted built-in executable globs** - The post called `*/beyla`, `*/alloy`, and `*/otelcol` the built-ins. The actual defaults are `*beyla`, `*alloy`, and `*otelcol` within Beyla's braced default glob. Replaced the literals with the exact patterns and clarified when an actual executable-path exclusion is needed.
3. **StatefulSet Pod identity and controller glob mismatch** - The statement that all Pod names change during rollouts was inaccurate for StatefulSets, whose Pod identities are stable. In addition, `tempo-0` implies a StatefulSet named `tempo`, but `k8s_statefulset_name: "tempo-*"` does not match `tempo`; the analogous Alloy rule also missed a DaemonSet named exactly `alloy`. Qualified the rollout statement and changed the controller patterns to `{tempo,tempo-*}` and `{alloy,alloy-*}`.
4. **DaemonSet log command inspected only one Pod** - `kubectl logs daemonset/beyla` selects one Pod unless all Pods are requested, which can miss discovery activity on other nodes. Added `--all-pods=true`.
5. **Prometheus staleness and retention were conflated** - The post told readers to wait for Prometheus series and Tempo traces to age out. Prometheus marks a no-longer-returned series stale while retaining its historical samples, whereas existing Tempo traces remain queryable until trace retention expires. Replaced this with a post-rollout query window and accurate staleness/retention wording.
6. **Post-exclusion telemetry claim was too broad** - Excluding Tempo or Alloy stops server-side Beyla telemetry attributed to that process, but another instrumented process can still emit a client span for a request to it. Limited the expected result to server-side spans and RED metric updates attributed to the excluded service, and noted the client-span case.
7. **Executable-path diagnostic overemphasized wrapper and image names** - Beyla matches the service process's resolved executable path, not the container image or entrypoint name. Clarified that readers should inspect the service PID's executable path and that a shell or init process may merely launch a separately named service binary.

## Review Notes
- The review targets current Grafana Beyla v3.33.0. The current Alloy `beyla.ebpf` reference documents its separately embedded Beyla version, so operators should check that page when configuring the Alloy component rather than copying standalone Beyla YAML into Alloy's HCL syntax.
- In survey mode, untouched defaults use a survey-specific namespace list that does not exclude `monitoring` or `grafana-alloy`; executable and container-name exclusions remain. The post discusses instrumentation, so this does not affect its examples.
- The JSONPath expression `.spec.template.spec.containers[0].args` is valid and matches the official single-container manifest, but a customized Pod template with sidecars may need to select the Beyla container by name.
- All three YAML snippets and all three Bash snippets were syntax-checked after correction. All four documentation links in the post resolved successfully during review.
