# How to Configure Prometheus Service Discovery for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Service Discovery, Kubernetes, Monitoring

Description: How to configure Prometheus service discovery to automatically find and scrape Istio control plane components, Envoy sidecars, and gateways in Kubernetes.

---

Prometheus needs to know where to find the metric endpoints in your cluster. With Istio, there are several targets to discover: the istiod control plane, Envoy sidecar proxies on every pod, ingress and egress gateways, and potentially the Istio CNI plugin. Kubernetes service discovery in Prometheus handles most of this automatically, but getting the configuration right requires understanding how Istio exposes metrics.

## Istio Metric Endpoints

Before configuring service discovery, it helps to know what endpoints exist:

- **istiod**: Exposes metrics on port 15014 at `/metrics`
- **Envoy sidecars**: Expose metrics on port 15090 at `/stats/prometheus`
- **Istio gateways**: Same as sidecars, port 15090 at `/stats/prometheus`
- **Istio agent (pilot-agent)**: Shares the sidecar pod, metrics on port 15020 at `/stats/prometheus`

## Kubernetes Service Discovery Basics

Prometheus supports several Kubernetes SD roles:

- `node`: Discovers Kubernetes nodes
- `pod`: Discovers all pods
- `service`: Discovers services
- `endpoints`: Discovers endpoints from services
- `endpointslice`: Discovers endpoint slices

For Istio metrics, you primarily use `pod` and `endpoints` roles.

## Scraping istiod

The simplest way to scrape istiod is through its Kubernetes service. Using the `endpoints` role:

```yaml
scrape_configs:
- job_name: 'istiod'
  kubernetes_sd_configs:
  - role: endpoints
    namespaces:
      names:
      - istio-system
  relabel_configs:
  - source_labels: [__meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
    action: keep
    regex: istiod;http-monitoring
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod
```

If you use the Prometheus Operator, create a ServiceMonitor instead:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istiod
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: istiod
  endpoints:
  - port: http-monitoring
    interval: 15s
```

## Scraping Envoy Sidecars

Envoy sidecars are trickier because they are not exposed through a service. You need to use the `pod` role and filter for pods that have the sidecar:

```yaml
scrape_configs:
- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  # Only scrape pods with the Istio sidecar
  - source_labels: [__meta_kubernetes_pod_container_name]
    action: keep
    regex: istio-proxy
  # Set the scrape port to the Envoy stats port
  - source_labels: [__address__]
    action: replace
    regex: ([^:]+)(?::\d+)?
    replacement: ${1}:15090
    target_label: __address__
  # Add useful labels
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod
  - source_labels: [__meta_kubernetes_pod_label_app]
    target_label: app
```

With the Prometheus Operator, use a PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats
  namespace: istio-system
spec:
  selector:
    matchExpressions:
    - key: security.istio.io/tlsMode
      operator: Exists
  namespaceSelector:
    any: true
  podMetricsEndpoints:
  - port: http-envoy-prom
    path: /stats/prometheus
    interval: 15s
    relabelings:
    - sourceLabels: [__meta_kubernetes_pod_label_app]
      targetLabel: app
```

The label `security.istio.io/tlsMode` is added by Istio to all pods with sidecars, so it works as a reliable selector.

## Scraping Istio Gateways

Istio gateways (ingress and egress) are standalone Envoy instances. They expose metrics the same way as sidecars. You can scrape them through their service:

```yaml
scrape_configs:
- job_name: 'istio-ingressgateway'
  kubernetes_sd_configs:
  - role: endpoints
    namespaces:
      names:
      - istio-system
  relabel_configs:
  - source_labels: [__meta_kubernetes_service_name]
    action: keep
    regex: istio-ingressgateway
  - source_labels: [__address__]
    action: replace
    regex: ([^:]+)(?::\d+)?
    replacement: ${1}:15090
    target_label: __address__
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: pod
```

## Using Prometheus Annotations

An alternative approach is to use Prometheus annotations on pods. Istio can add scrape annotations automatically if you configure it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
```

When `enablePrometheusMerge` is true, Istio configures the sidecar to merge application metrics with Envoy metrics on a single endpoint. It also adds the standard Prometheus annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "15020"
  prometheus.io/path: "/stats/prometheus"
```

Then your Prometheus scrape config can use annotation-based discovery:

```yaml
scrape_configs:
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: ${1}:${2}
    target_label: __address__
```

## Handling Mesh-Wide vs. Per-Pod Metrics

Istio generates two categories of metrics:

1. **Standard Istio metrics** (istio_requests_total, etc.): Generated by the Envoy proxy and available on port 15090
2. **Application metrics**: Your application's own Prometheus metrics, available on whatever port your app uses

With `enablePrometheusMerge`, both are available on port 15020 through the Istio agent. Without it, you need separate scrape configs for each.

## Filtering Targets by Namespace

In large clusters, you might want to limit which namespaces are scraped. Use the `namespaces` field in Kubernetes SD:

```yaml
kubernetes_sd_configs:
- role: pod
  namespaces:
    names:
    - production
    - staging
```

Or use relabel_configs to filter by namespace:

```yaml
relabel_configs:
- source_labels: [__meta_kubernetes_namespace]
  action: keep
  regex: 'production|staging'
```

## Verifying Discovery

After configuring service discovery, check that Prometheus is finding the right targets. Open the Prometheus web UI and go to Status > Targets, or query the API:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090 &
curl -s localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
```

Check for targets in the "down" state:

```bash
curl -s localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health=="down") | .labels'
```

## Troubleshooting Common Issues

**Targets showing as "down"**: Check that the port is correct and the pod is actually exposing metrics. Test with:

```bash
kubectl exec -it my-pod -c istio-proxy -- curl localhost:15090/stats/prometheus | head -20
```

**Too many targets**: If you are scraping thousands of sidecars, Prometheus might struggle. Consider using recording rules to pre-aggregate metrics and reduce the scrape interval.

**Missing labels**: If expected labels are not showing up, check your relabel_configs. A misconfigured regex can silently drop labels.

Service discovery is the foundation of your Istio monitoring setup. Get it right once and Prometheus will automatically discover new services as they join the mesh, without any manual configuration changes.
