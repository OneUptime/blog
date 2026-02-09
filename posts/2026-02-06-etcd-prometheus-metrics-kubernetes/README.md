# How to Configure the OpenTelemetry Collector to Scrape etcd Prometheus Metrics Endpoint in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, etcd, Prometheus, Kubernetes, Metrics Scraping

Description: Configure the OpenTelemetry Collector to scrape the etcd Prometheus metrics endpoint in Kubernetes with proper TLS and RBAC setup.

Scraping etcd metrics in Kubernetes requires special attention to TLS certificates, network access, and RBAC permissions. etcd does not expose its metrics endpoint openly since it holds the entire cluster state. This post walks through the complete setup for getting the OpenTelemetry Collector to scrape etcd metrics in a Kubernetes environment.

## The Challenge

In most Kubernetes distributions, etcd runs on the control plane nodes with client TLS authentication enabled. To scrape metrics, the Collector needs:

1. Network access to the etcd endpoint (usually on the host network)
2. Valid TLS client certificates that etcd trusts
3. Proper deployment strategy to reach control plane nodes

## Deploying the Collector as a DaemonSet on Control Plane Nodes

The most reliable approach is to run the Collector as a DaemonSet that schedules onto control plane nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-etcd
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: otel-collector-etcd
  template:
    metadata:
      labels:
        app: otel-collector-etcd
    spec:
      # Schedule only on control plane nodes
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: "node-role.kubernetes.io/control-plane"
          operator: "Exists"
          effect: "NoSchedule"
      # Use host network to reach etcd on 127.0.0.1
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      serviceAccountName: otel-collector-etcd
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/config.yaml"]
          volumeMounts:
            - name: config
              mountPath: /etc/otel
            - name: etcd-certs
              mountPath: /etc/kubernetes/pki/etcd
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: otel-collector-etcd-config
        - name: etcd-certs
          hostPath:
            path: /etc/kubernetes/pki/etcd
            type: Directory
```

## Collector Configuration

```yaml
# ConfigMap: otel-collector-etcd-config
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-etcd-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      prometheus/etcd:
        config:
          scrape_configs:
            - job_name: "etcd"
              scrape_interval: 15s
              scheme: https
              tls_config:
                cert_file: /etc/kubernetes/pki/etcd/healthcheck-client.crt
                key_file: /etc/kubernetes/pki/etcd/healthcheck-client.key
                ca_file: /etc/kubernetes/pki/etcd/ca.crt
                insecure_skip_verify: false
              static_configs:
                - targets: ["127.0.0.1:2379"]

    processors:
      resource:
        attributes:
          - key: service.name
            value: "etcd"
            action: upsert
          - key: k8s.cluster.name
            value: "production"
            action: upsert

      filter/important:
        metrics:
          include:
            match_type: regexp
            metric_names:
              - "etcd_server_.*"
              - "etcd_mvcc_.*"
              - "etcd_network_.*"
              - "etcd_disk_.*"
              - "grpc_server_.*"
              - "process_.*"

      batch:
        timeout: 10s

    exporters:
      otlp:
        endpoint: "otel-collector.monitoring.svc.cluster.local:4317"
        tls:
          insecure: true

    service:
      pipelines:
        metrics:
          receivers: [prometheus/etcd]
          processors: [resource, filter/important, batch]
          exporters: [otlp]
```

## RBAC Configuration

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector-etcd
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector-etcd
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["nodes/metrics"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector-etcd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector-etcd
subjects:
  - kind: ServiceAccount
    name: otel-collector-etcd
    namespace: monitoring
```

## Handling Different Kubernetes Distributions

### kubeadm Clusters

Certificates are at `/etc/kubernetes/pki/etcd/`. The healthcheck client cert is provisioned by kubeadm:

```yaml
tls_config:
  cert_file: /etc/kubernetes/pki/etcd/healthcheck-client.crt
  key_file: /etc/kubernetes/pki/etcd/healthcheck-client.key
  ca_file: /etc/kubernetes/pki/etcd/ca.crt
```

### k3s

k3s embeds etcd and stores certs differently:

```yaml
tls_config:
  cert_file: /var/lib/rancher/k3s/server/tls/etcd/client.crt
  key_file: /var/lib/rancher/k3s/server/tls/etcd/client.key
  ca_file: /var/lib/rancher/k3s/server/tls/etcd/server-ca.crt
```

### Managed Kubernetes (EKS, GKE, AKS)

Most managed Kubernetes services do not expose etcd metrics directly. The control plane is managed by the cloud provider. Check your provider's documentation for control plane metric access. Some providers expose etcd metrics through their own monitoring APIs.

## Multi-Member etcd Cluster

For a 3-member etcd cluster where each member runs on a different control plane node, the DaemonSet approach automatically handles this. Each DaemonSet pod scrapes the local etcd instance on 127.0.0.1.

If etcd is external to Kubernetes, use explicit targets:

```yaml
static_configs:
  - targets:
      - "etcd-0.internal:2379"
      - "etcd-1.internal:2379"
      - "etcd-2.internal:2379"
```

## Verifying Metrics Collection

Check that the Collector is successfully scraping etcd:

```bash
# Port-forward to the Collector's metrics endpoint
kubectl port-forward -n monitoring ds/otel-collector-etcd 8888:8888

# Check scrape targets
curl http://localhost:8888/metrics | grep otelcol_receiver_accepted_metric_points
```

If the metric count is zero, check the Collector logs for TLS errors or connection refused messages. The most common issue is incorrect certificate paths or missing hostPath mounts.

## Sending to a Central Collector

The DaemonSet Collector on each control plane node forwards metrics to a central Collector service for final processing and export:

```
etcd (control plane node) -> DaemonSet Collector -> Central Collector Service -> Backend
```

This two-tier approach keeps the DaemonSet Collector simple (just scraping and forwarding) while the central Collector handles complex processing like metric renaming and aggregation.

Getting etcd metrics into your observability pipeline is one of the most important monitoring setups for any Kubernetes cluster. These metrics provide the earliest signal of control plane issues and help prevent cascading failures.
