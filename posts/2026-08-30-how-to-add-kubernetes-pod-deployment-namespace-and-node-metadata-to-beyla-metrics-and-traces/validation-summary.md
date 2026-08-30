# Validation Summary: How to Add Kubernetes Metadata to Beyla Metrics and Traces

## Status
validated

## Post Type
Technical tutorial / Kubernetes observability configuration guide

## Technologies Covered
- Grafana Beyla v3.33.x
- eBPF application and network auto-instrumentation
- Kubernetes ServiceAccounts, RBAC, ClusterRoles, and DaemonSets
- Kubernetes informer caches and workload metadata
- OpenTelemetry metrics, traces, and Resource attributes
- Prometheus metrics and labels
- Grafana Tempo
- `kubectl`

## Sources Consulted
- [Deploy Beyla in Kubernetes: metadata decoration, RBAC, DaemonSet, and external configuration](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Configure Beyla metrics and traces attributes: selectors and Kubernetes decorator controls](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Beyla exported metrics and attribute defaults](https://grafana.com/docs/beyla/latest/metrics/)
- [Beyla service discovery and Kubernetes namespace selectors](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Beyla global configuration properties and `BEYLA_CONFIG_PATH`](https://grafana.com/docs/beyla/latest/configure/options/)
- [Beyla network attributes and cluster-name detection](https://grafana.com/docs/beyla/latest/network/)
- [Beyla metric cardinality guidance](https://grafana.com/docs/beyla/latest/cardinality/)
- [Beyla v3.33.0 attribute-selection implementation](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/export/attributes/attr_select.go)
- [Beyla v3.33.0 OTLP Resource filtering implementation](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/export/otel/otelcfg/common.go)
- [Beyla v3.33.0 OTLP metric Resource handling](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/export/otel/metrics.go)
- [Beyla v3.33.0 OTLP trace Resource handling](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/export/otel/tracesgen/tracesgen.go)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [`kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [OpenTelemetry Kubernetes Resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/k8s/)
- [OpenTelemetry metrics data model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)

## Issues Found
1. **Per-metric selector was incorrectly presented as exporter-neutral** - The post said the `http_server_*` selector could omit Pod attributes from metrics while keeping them on traces. That is true for labels emitted by Beyla's native Prometheus exporter, but not for OTLP application metrics: Kubernetes metadata is attached to the OTLP metric Resource, and the per-metric selector does not remove those Resource attributes. Scoped the example and default-set explanation to Prometheus. Added that `attributes.select.resource` filters OTLP Resource attributes from both metrics and traces, so a metrics-only downstream pipeline is required when Pod details must remain on traces but not OTLP metrics. Updated the conclusion to preserve the same distinction.
2. **Node informer purpose was overstated** - The post said Nodes provide node identity. Beyla obtains `k8s.node.name` from the Pod's `spec.nodeName`; the Node informer instead supports Node endpoint metadata and can assist cluster-name detection. Reworded the explanation accordingly.
3. **Owner attributes were phrased as mutually exclusive** - A normal Deployment Pod can carry both `k8s.replicaset.name` and the derived `k8s.deployment.name`. Changed the attribute list from an exclusive “or” to “and, as applicable.”
4. **Disabled informer effect was too absolute** - Disabling the Service or Node informer makes related metadata incomplete; it does not necessarily remove every related attribute. Changed “removes related metadata” to “can leave related metadata incomplete.”

## Review Notes
- The RBAC manifests use current `rbac.authorization.k8s.io/v1` APIs and the documented read-only `list`/`watch` permissions for ReplicaSets, Pods, Services, and Nodes. No mutation permissions are needed.
- The `attributes.kubernetes.enable`, `meta_restrict_local_node`, `disable_informers`, `discovery.instrument.k8s_namespace`, `BEYLA_CONFIG_PATH`, and `BEYLA_KUBE_CLUSTER_NAME` settings are valid for Beyla v3.33.x. The namespace selector value is a glob.
- `http_server_*` wildcard selection, include-list replacement, and dotted or underscore attribute spelling are supported. All attributes used in the selector are valid for Beyla HTTP application metrics.
- The three `kubectl auth can-i` commands are current and correctly handle namespaced resources versus cluster-scoped Nodes. The identity running them must itself be allowed to impersonate the specified ServiceAccount.
- The DaemonSet YAML is a fragment focused on metadata. A complete deployment still needs the stated configuration mount and either privileged mode or Beyla's documented Linux capabilities.
- `grafana/beyla:latest` works as written, and the inline comment correctly advises pinning an approved release for production.
- All five links in the post's Official Documentation section resolve to the intended current official pages.
