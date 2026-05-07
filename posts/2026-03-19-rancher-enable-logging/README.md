# How to Enable Logging in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging

Description: A step-by-step guide to enabling the built-in logging stack in Rancher using the Logging Operator with Fluentd and Fluent Bit.

Centralized logging is essential for debugging applications, tracking security events, and maintaining compliance in Kubernetes clusters. Rancher provides a built-in logging solution based on the Logging Operator, which uses Fluent Bit for log collection and Fluentd for log routing and processing. This guide walks through enabling and configuring logging in Rancher.

## Prerequisites

- Rancher v2.6 or later.
- At least one managed Kubernetes cluster.
- Cluster admin permissions.
- Sufficient cluster resources (approximately 1 CPU core and 1 GB RAM for the logging stack).

## Step 1: Navigate to the Charts Page

1. Log in to the Rancher UI and select your cluster.
2. Go to **Apps > Charts** (called **Apps & Marketplace** in some older Rancher releases).
3. Search for **Logging** in the search bar.
4. Click on the **Logging** chart provided by Rancher.

## Step 2: Install the Logging Chart

1. Click **Install**.
2. Select the namespace (default is `cattle-logging-system`).
3. Click **Next** to proceed to configuration.

## Step 3: Configure Logging Resources

Set resource limits for the logging components:

```yaml
fluentbit:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi

fluentd:
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

Fluent Bit runs as a DaemonSet (one pod per node), while Fluentd runs as a StatefulSet for log aggregation and routing.

## Step 4: Configure Fluent Bit

Fluent Bit collects logs from all containers on each node. Key configuration options:

```yaml
fluentbit:
  tolerations:
    - operator: Exists
  inputTail:
    Buffer_Chunk_Size: 1MB
    Buffer_Max_Size: 5MB
    Mem_Buf_Limit: 5MB
    Skip_Long_Lines: "On"
```

The `inputTail` settings tune Fluent Bit buffering. Rancher already adds default tolerations for common control plane taints, so add extra tolerations only if your cluster uses additional taints.

## Step 5: Complete the Installation

Review the configuration and click **Install**. The installation deploys:

- **Logging Operator**: Manages the logging pipeline configuration.
- **Fluent Bit DaemonSet**: Collects logs from all nodes.
- **Fluentd**: Aggregates and routes logs to configured outputs.

Monitor the installation:

```bash
kubectl get pods -n cattle-logging-system
```

Expected output:

```plaintext
NAME                                           READY   STATUS    RESTARTS   AGE
rancher-logging-7f8d5c9b6-xxxxx                1/1     Running   0          2m
rancher-logging-root-fluentbit-xxxxx           1/1     Running   0          2m
rancher-logging-root-fluentbit-yyyyy           1/1     Running   0          2m
rancher-logging-root-fluentd-0                 2/2     Running   0          2m
```

## Step 6: Install via CLI

Alternatively, install logging via Helm. When installing outside the Rancher UI, use chart versions that are compatible with your Rancher release:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install rancher-logging-crd rancher-charts/rancher-logging-crd \
  --namespace cattle-logging-system \
  --create-namespace

helm install rancher-logging rancher-charts/rancher-logging \
  --namespace cattle-logging-system \
  --set fluentbit.resources.requests.cpu=100m \
  --set fluentbit.resources.requests.memory=128Mi \
  --set fluentd.resources.requests.cpu=200m \
  --set fluentd.resources.requests.memory=256Mi
```

## Step 7: Verify the Installation

Check that all components are running:

```bash
# Check pods

kubectl get pods -n cattle-logging-system

# Check the logging operator
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=rancher-logging

# Check Fluent Bit
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentbit

# Check Fluentd
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd
```

## Step 8: Understand the Logging CRDs

After installation, several Custom Resource Definitions are available:

- **ClusterOutput**: Defines cluster-wide log destinations (Elasticsearch, Splunk, etc.).
- **ClusterFlow**: Defines cluster-wide log routing rules.
- **Output**: Defines namespace-scoped log destinations.
- **Flow**: Defines namespace-scoped log routing rules.

View the available CRDs:

```bash
kubectl get crds | grep logging
```

## Step 9: Create a Basic ClusterOutput and ClusterFlow

To start routing logs, you need at least one output and one flow. Here is an example that prints matching logs to the Fluentd container stdout for testing:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: null-output
  namespace: cattle-logging-system
spec:
  nullout: {}
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  filters:
    - stdout:
        output_type: json
  match:
    - select: {}
  globalOutputRefs:
    - null-output
```

Apply:

```bash
kubectl apply -f basic-logging.yaml
```

## Step 10: Verify Logs Are Being Collected

Check the Fluentd logs to verify log processing:

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd
```

You should see log entries from your cluster workloads in the Fluentd container output.

## Upgrading the Logging Stack

To upgrade:

1. Go to **Apps > Installed Apps** (called **Apps & Marketplace** in some older Rancher releases).
2. Find `rancher-logging` and click the three-dot menu.
3. Select **Upgrade**.

Or via CLI:

```bash
helm upgrade rancher-logging-crd rancher-charts/rancher-logging-crd \
  --namespace cattle-logging-system

helm upgrade rancher-logging rancher-charts/rancher-logging \
  --namespace cattle-logging-system \
  --reuse-values
```

## Summary

Enabling logging in Rancher installs the Logging Operator with Fluent Bit and Fluentd. Fluent Bit collects logs from all nodes as a DaemonSet, and Fluentd handles routing and processing. After installation, configure ClusterOutputs and ClusterFlows to send logs to your preferred destinations such as Elasticsearch, Splunk, Loki, or CloudWatch.
