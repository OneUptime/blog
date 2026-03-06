# How to Deploy VictoriaMetrics with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, victoriametrics, monitoring, metrics, gitops, kubernetes, observability

Description: A practical guide to deploying VictoriaMetrics on Kubernetes using Flux CD for GitOps-driven metrics collection and monitoring.

---

## Introduction

VictoriaMetrics is a high-performance, cost-effective time series database and monitoring solution. It serves as a drop-in replacement for Prometheus, offering better compression, faster queries, and lower resource consumption. Deploying VictoriaMetrics with Flux CD allows you to manage your monitoring infrastructure through GitOps, ensuring consistent and reproducible deployments.

In this guide, you will learn how to set up VictoriaMetrics on Kubernetes using Flux CD, including single-node and cluster modes, along with data retention and scrape configuration.

## Prerequisites

Before you begin, make sure you have the following in place:

- A running Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped on your cluster
- A Git repository connected to Flux CD
- kubectl configured to access your cluster

## Repository Structure

Organize your GitOps repository with the following structure for VictoriaMetrics:

```
clusters/
  my-cluster/
    victoriametrics/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      scrape-config.yaml
```

## Step 1: Create the Namespace

Create a dedicated namespace for VictoriaMetrics to isolate its resources.

```yaml
# clusters/my-cluster/victoriametrics/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: victoriametrics
  labels:
    # Label for easy identification of GitOps-managed resources
    toolkit.fluxcd.io/tenant: monitoring
```

## Step 2: Add the Helm Repository

Define the VictoriaMetrics Helm repository as a Flux source.

```yaml
# clusters/my-cluster/victoriametrics/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: victoriametrics
  namespace: victoriametrics
spec:
  interval: 1h
  url: https://victoriametrics.github.io/helm-charts/
```

## Step 3: Create the HelmRelease for Single-Node Mode

For smaller deployments, VictoriaMetrics single-node mode provides a simple setup.

```yaml
# clusters/my-cluster/victoriametrics/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: victoriametrics
  namespace: victoriametrics
spec:
  interval: 30m
  chart:
    spec:
      chart: victoria-metrics-single
      version: "0.12.x"
      sourceRef:
        kind: HelmRepository
        name: victoriametrics
      interval: 12h
  # Timeout for Helm operations
  timeout: 10m
  values:
    server:
      # Resource allocation for the VictoriaMetrics server
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: "2"
          memory: 2Gi
      # Data retention period
      retentionPeriod: 90d
      # Persistent storage for metrics data
      persistentVolume:
        enabled: true
        size: 50Gi
        storageClass: standard
      # Scrape configuration for Prometheus-compatible targets
      scrape:
        enabled: true
        configMap: victoriametrics-scrape-config
    # ServiceMonitor for self-monitoring
    serviceMonitor:
      enabled: false
```

## Step 4: Configure Scrape Targets

Define scrape targets so VictoriaMetrics knows which endpoints to collect metrics from.

```yaml
# clusters/my-cluster/victoriametrics/scrape-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: victoriametrics-scrape-config
  namespace: victoriametrics
data:
  scrape.yml: |
    scrape_configs:
      # Scrape Kubernetes API server metrics
      - job_name: kubernetes-apiservers
        kubernetes_sd_configs:
          - role: endpoints
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
        relabel_configs:
          - source_labels:
              [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
            action: keep
            regex: default;kubernetes;https

      # Scrape kubelet metrics from all nodes
      - job_name: kubernetes-nodes
        kubernetes_sd_configs:
          - role: node
        scheme: https
        tls_config:
          ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
          insecure_skip_verify: true
        bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

      # Scrape all pods that have prometheus.io annotations
      - job_name: kubernetes-pods
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
          - source_labels:
              [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
```

## Step 5: Deploy VictoriaMetrics Cluster Mode (Optional)

For larger deployments that require horizontal scaling, use VictoriaMetrics cluster mode.

```yaml
# clusters/my-cluster/victoriametrics/helmrelease-cluster.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: victoriametrics-cluster
  namespace: victoriametrics
spec:
  interval: 30m
  chart:
    spec:
      chart: victoria-metrics-cluster
      version: "0.14.x"
      sourceRef:
        kind: HelmRepository
        name: victoriametrics
      interval: 12h
  timeout: 15m
  values:
    # vmselect handles read queries
    vmselect:
      replicaCount: 2
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: "1"
          memory: 1Gi

    # vminsert handles incoming data writes
    vminsert:
      replicaCount: 2
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: "1"
          memory: 1Gi

    # vmstorage persists the time series data
    vmstorage:
      replicaCount: 3
      retentionPeriod: 90d
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: "2"
          memory: 2Gi
      persistentVolume:
        enabled: true
        size: 100Gi
        storageClass: standard
```

## Step 6: Add a Kustomization

Create a Flux Kustomization to manage all VictoriaMetrics resources together.

```yaml
# clusters/my-cluster/victoriametrics/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - scrape-config.yaml
```

## Step 7: Create the Flux Kustomization Resource

Point Flux to the VictoriaMetrics directory in your repository.

```yaml
# clusters/my-cluster/victoriametrics-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: victoriametrics
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: victoriametrics
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/victoriametrics
  prune: true
  wait: true
  timeout: 10m
  # Health checks to verify deployment succeeded
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: victoriametrics
      namespace: victoriametrics
```

## Verifying the Deployment

After pushing the manifests to your Git repository, verify that Flux has reconciled the resources.

```bash
# Check that Flux has picked up the Kustomization
flux get kustomizations victoriametrics

# Check the HelmRelease status
flux get helmreleases -n victoriametrics

# Verify the VictoriaMetrics pods are running
kubectl get pods -n victoriametrics

# Check VictoriaMetrics logs for any issues
kubectl logs -n victoriametrics -l app=victoria-metrics-single-server --tail=50
```

## Accessing VictoriaMetrics

You can port-forward to access the VictoriaMetrics UI locally.

```bash
# Port-forward to the VictoriaMetrics server
kubectl port-forward -n victoriametrics svc/victoriametrics-victoria-metrics-single-server 8428:8428

# Query metrics using the VictoriaMetrics API
curl http://localhost:8428/api/v1/query?query=up
```

## Integrating with Grafana

To visualize metrics from VictoriaMetrics in Grafana, add it as a Prometheus data source since VictoriaMetrics supports the Prometheus query API.

```yaml
# clusters/my-cluster/victoriametrics/grafana-datasource.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: victoriametrics-grafana-datasource
  namespace: monitoring
  labels:
    # This label tells Grafana to auto-discover and load this datasource
    grafana_datasource: "true"
data:
  victoriametrics.yaml: |
    apiVersion: 1
    datasources:
      - name: VictoriaMetrics
        type: prometheus
        access: proxy
        url: http://victoriametrics-victoria-metrics-single-server.victoriametrics.svc:8428
        isDefault: true
        editable: false
```

## Troubleshooting

Common issues and their resolutions:

- **Pod stuck in Pending**: Check if the PersistentVolumeClaim is bound. Verify the storage class exists.
- **Out of memory**: Increase memory limits in the HelmRelease values. VictoriaMetrics memory usage grows with the number of active time series.
- **Scrape targets not appearing**: Verify the scrape config ConfigMap is mounted correctly and the pod annotations match the relabel rules.
- **Slow queries**: Consider switching to cluster mode for better query parallelism, or increase the vmselect replica count.

## Conclusion

You have successfully deployed VictoriaMetrics on Kubernetes using Flux CD. This GitOps approach ensures that your monitoring infrastructure is version-controlled, auditable, and reproducible. VictoriaMetrics provides an efficient alternative to Prometheus with lower resource consumption and better long-term storage capabilities. You can extend this setup by adding alerting rules, additional scrape targets, or migrating to cluster mode as your needs grow.
