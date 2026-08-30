# How to Add Kubernetes Metadata to Beyla Metrics and Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Kubernetes, Metadata, OpenTelemetry

Description: Enrich Beyla metrics and traces with standard Kubernetes resource attributes by enabling the metadata decorator and granting its informers precise RBAC access.

---

Beyla can observe a request without knowing whether its process belongs to `checkout-7d9f...` in `retail-prod` on `node-12`. That telemetry is technically valid but difficult to route, aggregate, or investigate. The Kubernetes decorator joins process and network information with Kubernetes API metadata and adds standard OpenTelemetry resource attributes.

Configuration alone is not enough. Beyla also needs a ServiceAccount with permission to watch the resources used by its metadata cache.

## Grant read-only informer permissions

Grafana's Kubernetes setup uses `list` and `watch` for ReplicaSets, Pods, Services, and Nodes:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: beyla
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: beyla-metadata-reader
rules:
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "services", "nodes"]
    verbs: ["list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: beyla-metadata-reader
subjects:
  - kind: ServiceAccount
    name: beyla
    namespace: observability
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: beyla-metadata-reader
```

ReplicaSet ownership lets Beyla derive a Deployment identity for normal Deployment Pods. Services and Nodes support network endpoint decoration, and Nodes can also support cluster-name detection. No create, update, patch, or delete permission is required.

Use a ClusterRole because a node-level DaemonSet can observe workloads from every namespace. A namespace-scoped Role would produce partial metadata for Pods outside that namespace.

## Enable the decorator

Mount a Beyla configuration containing:

```yaml
attributes:
  kubernetes:
    enable: true

discovery:
  instrument:
    - k8s_namespace: "production-*"
```

Then reference the ServiceAccount from the DaemonSet:

```yaml
spec:
  template:
    spec:
      serviceAccountName: beyla
      hostPID: true
      containers:
        - name: beyla
          image: grafana/beyla:latest # pin an approved release
          env:
            - name: BEYLA_CONFIG_PATH
              value: /etc/beyla/config.yml
            - name: BEYLA_KUBE_CLUSTER_NAME
              value: prod-eu-1
```

Cloud environments may allow automatic cluster-name detection. Set a stable explicit name when detection is unavailable or when telemetry from multiple clusters shares a backend.

With decoration enabled, Beyla can add attributes including:

- `k8s.namespace.name`
- `k8s.deployment.name`, `k8s.statefulset.name`, `k8s.daemonset.name`, and `k8s.replicaset.name`, as applicable
- `k8s.node.name`
- `k8s.pod.name`, `k8s.pod.uid`, and `k8s.pod.start_time`
- `k8s.container.name`
- `k8s.cluster.name`

Not every workload has every owner attribute. A standalone Pod has no Deployment name, while a StatefulSet Pod has `k8s.statefulset.name` instead.

## Account for metric attribute selection

OTLP spans and metrics carry Kubernetes metadata as resource attributes. With Beyla's native Prometheus exporter, application metrics expose Kubernetes metadata as labels, and `attributes.select` can restrict the per-metric label set. The exported-metrics reference marks which attributes are shown or hidden for each instrument.

For Prometheus metrics, use `attributes.select` only for labels needed by a concrete query. For example, a deployment-level HTTP view might include namespace, deployment, and node while deliberately excluding Pod UID:

```yaml
attributes:
  kubernetes:
    enable: true
  select:
    http_server_*:
      include:
        - service.name
        - service.namespace
        - http.request.method
        - http.response.status_code
        - http.route
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name
```

An `include` list replaces the default set for matching Prometheus metrics, so preserve every dimension your dashboards require. Attribute names can appear in OpenTelemetry dotted form or Prometheus underscore form depending on the exporter and query layer.

Pod name and UID multiply series by replica and rollout. With Prometheus metrics, omit them from the metric selector while retaining them on traces, and prefer Deployment, namespace, and cluster labels for long-lived metrics. For OTLP metrics, per-metric selectors do not remove Kubernetes resource attributes. `attributes.select.resource` can filter them, but it applies to both OTLP metrics and traces; use a metrics-only downstream pipeline when you need to retain Pod details on traces but remove them from OTLP metrics. Add node only when node-level skew is an actual investigation need.

## Control informer cost in large clusters

Every DaemonSet replica can maintain informer caches. Beyla provides two relevant controls:

```yaml
attributes:
  kubernetes:
    enable: true
    meta_restrict_local_node: true
    disable_informers: ["service"]
```

`meta_restrict_local_node` reduces memory by retaining local Pod and Node metadata, but cross-node destination metadata in network and service-graph metrics can become incomplete. Disabling the Service or Node informer further reduces API activity but can leave related metadata incomplete. Apply these only after deciding which attributes the use case requires.

## Verify RBAC and enrichment

Check access as the deployed ServiceAccount:

```bash
kubectl auth can-i list pods --all-namespaces \
  --as=system:serviceaccount:observability:beyla
kubectl auth can-i watch replicasets.apps --all-namespaces \
  --as=system:serviceaccount:observability:beyla
kubectl auth can-i watch nodes \
  --as=system:serviceaccount:observability:beyla
```

Generate new traffic, then inspect one Tempo span's Resource section and one fresh metric label set. If attributes appear after a delay, the informer may have reached its synchronization timeout and completed its cache in the background. Look for RBAC or informer errors in Beyla logs before increasing the timeout.

## Conclusion

Kubernetes enrichment is a join between process telemetry and read-only API metadata. Grant informer RBAC, enable `attributes.kubernetes`, and set a stable cluster identity. For native Prometheus metrics, expose only the labels needed for aggregation. For OTLP, use metrics-only downstream filtering when you want to retain high-cardinality Pod details on traces without carrying them on metrics.

## Official Documentation

- [Deploy Beyla in Kubernetes: metadata decoration and RBAC](https://grafana.com/docs/beyla/latest/setup/kubernetes/#configuring-kubernetes-metadata-decoration)
- [Configure Beyla Kubernetes attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/#kubernetes-decorator)
- [Beyla exported metrics and attributes](https://grafana.com/docs/beyla/latest/metrics/)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [OpenTelemetry Kubernetes resource conventions](https://opentelemetry.io/docs/specs/semconv/resource/k8s/)
