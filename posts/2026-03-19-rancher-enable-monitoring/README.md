# How to Enable Monitoring in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, Grafana

Description: A step-by-step guide to enabling the built-in monitoring stack in Rancher using Prometheus and Grafana.

Rancher ships with an integrated monitoring solution built on the Prometheus Operator and Grafana. Enabling it gives you immediate visibility into cluster health, workload performance, and resource consumption. This guide walks you through the entire process from prerequisites to verification.

## Prerequisites

Before you begin, make sure you have:

- A running Rancher management server (v2.6 or later).
- A Kubernetes cluster managed by Rancher.
- Administrator or cluster owner permissions.
- Network access that allows Prometheus to scrape port `9796` on each node.
- Sufficient cluster resources (at least `2700m` CPU, `1950Mi` of memory, and `50Gi` of storage available for the monitoring stack).

## Step 1: Navigate to the Cluster Dashboard

Log in to the Rancher UI and select the cluster where you want to enable monitoring. Click on the cluster name to open the Cluster Dashboard.

From the left-hand navigation menu, click **Cluster Tools**.

## Step 2: Find the Monitoring Chart

In Cluster Tools, locate **Monitoring**. Rancher provides this as the built-in `rancher-monitoring` application, which bundles Prometheus, Grafana, Alertmanager, and several default exporters.

## Step 3: Install the Monitoring Chart

Click **Install** on the Monitoring card. Rancher deploys Monitoring into the `cattle-monitoring-system` namespace. Before you complete the installation, you can optionally customize the Helm values.

## Step 4: Configure Resource Limits

On the configuration page, you can adjust resource requests and limits for each component. Here are recommended starting values for a small to medium cluster:

```yaml
prometheus:
  prometheusSpec:
    resources:
      requests:
        cpu: 750m
        memory: 750Mi
      limits:
        cpu: 1000m
        memory: 2000Mi

grafana:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi

alertmanager:
  alertmanagerSpec:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

For larger clusters with many nodes and workloads, increase these values accordingly.

## Step 5: Configure Persistent Storage (Recommended)

By default, Prometheus data is stored ephemerally. To retain metrics across restarts, enable persistent storage:

```yaml
prometheus:
  prometheusSpec:
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
```

Make sure your cluster has a default StorageClass configured, or specify one explicitly in the configuration.

## Step 6: Complete the Installation

Review your configuration and click **Install**. Rancher will deploy the monitoring stack using Helm. The installation typically takes two to five minutes depending on your cluster resources and network speed.

You can monitor the installation progress by navigating to **Apps > Installed Apps** and watching the status of the `rancher-monitoring` release.

## Step 7: Verify the Installation

Once the installation completes, verify that all monitoring pods are running:

```bash
kubectl get pods -n cattle-monitoring-system
```

You should see pods for Prometheus, Grafana, Alertmanager, node-exporter, and kube-state-metrics, all in the `Running` state.

Expected output:

```plaintext
NAME                                                     READY   STATUS    RESTARTS   AGE
alertmanager-rancher-monitoring-alertmanager-0            2/2     Running   0          3m
prometheus-rancher-monitoring-prometheus-0                3/3     Running   0          3m
rancher-monitoring-grafana-7d9b5d4c8f-xk2lp              4/4     Running   0          3m
rancher-monitoring-kube-state-metrics-5c8b7d6f9-abc12     1/1     Running   0          3m
rancher-monitoring-prometheus-node-exporter-xxxxx          1/1     Running   0          3m
```

## Step 8: Access the Monitoring Dashboards

After installation, you can access monitoring tools directly from the Rancher UI:

1. Navigate to your cluster in the Rancher UI.
2. Click on **Monitoring** in the left-hand navigation menu.
3. You will see links to **Grafana**, **Prometheus**, and **Alertmanager**.

Click on **Grafana** to open the Grafana dashboard. Rancher pre-configures several dashboards for cluster metrics, node metrics, and workload metrics.

## Step 9: Verify Metrics Collection

In the Prometheus UI, go to **Status > Targets** to confirm that all scrape targets are healthy. You should see entries for:

- kubelet
- kube-state-metrics
- node-exporter
- apiserver
- etcd (if accessible)

All targets should show a **State** of `UP`.

## Enabling Monitoring via the CLI

If you prefer to install monitoring via the command line, you can use Helm:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install rancher-monitoring-crd rancher-charts/rancher-monitoring-crd \
  --namespace cattle-monitoring-system \
  --create-namespace

helm install rancher-monitoring rancher-charts/rancher-monitoring \
  --namespace cattle-monitoring-system \
  --set prometheus.prometheusSpec.resources.requests.cpu=750m \
  --set prometheus.prometheusSpec.resources.requests.memory=750Mi \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

## Upgrading the Monitoring Stack

To upgrade an existing monitoring installation when a new chart version is available:

1. Go to **Apps > Installed Apps**.
2. Find `rancher-monitoring` and click the three-dot menu.
3. Select **Upgrade** and follow the prompts.

Or via CLI:

```bash
helm upgrade rancher-monitoring-crd rancher-charts/rancher-monitoring-crd \
  --namespace cattle-monitoring-system

helm upgrade rancher-monitoring rancher-charts/rancher-monitoring \
  --namespace cattle-monitoring-system \
  --reuse-values
```

## Troubleshooting Common Issues

If pods fail to start, check the events and logs:

```bash
kubectl describe pod <pod-name> -n cattle-monitoring-system
kubectl logs <pod-name> -n cattle-monitoring-system --all-containers
```

Common issues include insufficient resources, missing StorageClass, or RBAC permission errors. Ensure your cluster has enough available CPU and memory before installing.

## Summary

Enabling monitoring in Rancher is straightforward using the built-in Monitoring application. Once installed, you get a complete observability stack with Prometheus for metrics collection, Grafana for visualization, and Alertmanager for alert routing. From here, you can configure custom dashboards, alerts, and scrape targets to match your operational needs.
