# How to Configure the OpenTelemetry Collector to Scrape CoreDNS Prometheus Metrics in Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CoreDNS, Prometheus, Kubernetes, Metrics Scraping

Description: Step-by-step configuration of the OpenTelemetry Collector to scrape CoreDNS Prometheus metrics in Kubernetes with RBAC and service discovery.

CoreDNS exposes Prometheus metrics on port 9153 by default in Kubernetes. Setting up the OpenTelemetry Collector to scrape these metrics requires Kubernetes service discovery configuration, proper RBAC permissions, and the right relabeling rules. This post walks through the complete setup.

## Prerequisites

Verify that CoreDNS is exposing metrics:

```bash
# Find CoreDNS pod IPs
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide

# Test the metrics endpoint
kubectl run curl-test --rm -it --image=curlimages/curl -- \
  curl http://<coredns-pod-ip>:9153/metrics
```

You should see Prometheus-formatted metrics output.

## Collector Deployment

Deploy the Collector as a Deployment (not DaemonSet) since CoreDNS metrics can be scraped from any node:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 8888
              name: metrics
          volumeMounts:
            - name: config
              mountPath: /etc/otel
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## RBAC Permissions

The Collector needs permission to discover CoreDNS pods through the Kubernetes API:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "endpoints", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: monitoring
```

## Collector Configuration with Kubernetes Service Discovery

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      prometheus/coredns:
        config:
          scrape_configs:
            - job_name: "coredns"
              scrape_interval: 15s
              kubernetes_sd_configs:
                - role: pod
                  namespaces:
                    names: ["kube-system"]
              relabel_configs:
                # Keep only pods with the kube-dns label
                - source_labels: [__meta_kubernetes_pod_label_k8s_app]
                  action: keep
                  regex: "kube-dns"
                # Set the scrape target to the pod IP on the metrics port
                - source_labels: [__meta_kubernetes_pod_ip]
                  target_label: __address__
                  replacement: "$1:9153"
                # Add metadata labels
                - source_labels: [__meta_kubernetes_pod_name]
                  target_label: pod_name
                - source_labels: [__meta_kubernetes_pod_node_name]
                  target_label: node_name
                - source_labels: [__meta_kubernetes_namespace]
                  target_label: namespace

    processors:
      resource:
        attributes:
          - key: service.name
            value: "coredns"
            action: upsert
          - key: k8s.cluster.name
            value: "production"
            action: upsert

      # Rename Prometheus metric labels to OTel semantic conventions
      metricstransform:
        transforms:
          - include: coredns_dns_requests_total
            match_type: strict
            action: update
            operations:
              - action: update_label
                label: server
                new_label: dns.server
              - action: update_label
                label: type
                new_label: dns.query.type
              - action: update_label
                label: proto
                new_label: network.protocol

      batch:
        timeout: 10s

    exporters:
      otlp:
        endpoint: "backend.internal:4317"

    service:
      pipelines:
        metrics:
          receivers: [prometheus/coredns]
          processors: [resource, metricstransform, batch]
          exporters: [otlp]
```

## Using the Service Endpoint Instead

An alternative to pod-level discovery is to scrape through the CoreDNS Service. This requires the Service to expose the metrics port:

```yaml
# Check if the kube-dns Service exposes the metrics port
# kubectl get svc kube-dns -n kube-system -o yaml

# If it does, you can use endpoint discovery:
scrape_configs:
  - job_name: "coredns-endpoints"
    scrape_interval: 15s
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: ["kube-system"]
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: "kube-dns"
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: "metrics"
```

## Handling CoreDNS Scaling

If CoreDNS is scaled using the dns-autoscaler, pods come and go. Kubernetes service discovery handles this automatically. New pods are discovered and scraped within one scrape interval.

Monitor the number of CoreDNS pods alongside the per-pod metrics to understand scaling behavior:

```yaml
processors:
  transform/pod-count:
    metric_statements:
      - context: datapoint
        statements:
          - set(attributes["coredns.pod"], attributes["pod_name"]) where attributes["pod_name"] != nil
```

## Validating the Scrape Configuration

After deploying, verify that the Collector is scraping CoreDNS successfully:

```bash
# Check Collector logs for scrape errors
kubectl logs -n monitoring deployment/otel-collector | grep -i "coredns\|scrape"

# Check the Collector's own metrics
kubectl port-forward -n monitoring deployment/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep scrape
```

You should see `scrape_samples_scraped` with non-zero values for the coredns job.

## Common Issues

1. **No metrics scraped**: Check that the RBAC ClusterRoleBinding is in place and the ServiceAccount is correctly referenced
2. **Connection refused**: Verify CoreDNS pods are exposing port 9153 and there are no NetworkPolicies blocking traffic
3. **Empty responses**: Ensure the CoreDNS Corefile includes the `prometheus` plugin (it does by default in most distributions)

This setup gives you production-ready CoreDNS monitoring through the OpenTelemetry Collector. The Kubernetes service discovery ensures that as CoreDNS pods scale up or get rescheduled, the Collector automatically adjusts its scrape targets.
