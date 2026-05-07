# How to View Workload Logs in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Workload

Description: Learn how to view and manage workload logs in Rancher using the UI, kubectl, and log aggregation tools for effective debugging.

Viewing logs is essential for debugging application issues, monitoring behavior, and understanding errors in your Kubernetes workloads. Rancher provides a built-in log viewer in its UI, and you can also use kubectl and log aggregation tools for more advanced needs. This guide covers all methods for accessing workload logs in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with running workloads
- Access to the namespace containing the workloads you want to inspect

## Method 1: View Logs via the Rancher UI

### View Pod Logs

1. In the Rancher dashboard, select your cluster
2. Navigate to **Workloads > Pods** (or find the pod through **Workloads > Deployments** and clicking on the deployment name)
3. Find the pod you want to inspect
4. Click the three-dot menu next to the pod and select **View Logs**

The log viewer opens in a panel at the bottom of the screen showing real-time log output from the container.

### Log Viewer Features

The Rancher log viewer includes several helpful features:

- **Follow**: Toggle auto-scrolling to see new log entries in real time
- **Timestamps**: Show or hide timestamps for each log line
- **Wrap Lines**: Toggle line wrapping for long log entries
- **Download**: Download the current log output as a text file
- **Previous Container**: View logs from a previous (crashed) container instance

### View Logs for Multi-Container Pods

If your pod has multiple containers (sidecars, init containers):

1. Open the log viewer for the pod
2. Use the container dropdown at the top to switch between containers
3. Select the specific container whose logs you want to see

### View Logs from the Workload Level

Instead of navigating to individual pods:

1. Go to **Workloads > Deployments**
2. Click on the deployment name
3. In the **Pods** tab, each pod has a log icon you can click
4. This opens logs for that specific pod

## Method 2: View Logs via kubectl

### Basic Log Commands

Open the kubectl shell from the Rancher UI (click the **Kubectl Shell** button in the top navigation menu), or use your local kubectl configured with Rancher credentials.

View logs for a specific pod:

```bash
kubectl logs my-app-pod-abc123 -n default
```

View logs for a specific container in a multi-container pod:

```bash
kubectl logs my-app-pod-abc123 -c my-container -n default
```

### Follow Logs in Real Time

Stream logs as they are generated:

```bash
kubectl logs -f my-app-pod-abc123 -n default
```

### View Previous Container Logs

When a container crashes and restarts, view logs from the previous instance:

```bash
kubectl logs my-app-pod-abc123 --previous -n default
```

### View Logs by Label Selector

View logs from all pods matching a label:

```bash
kubectl logs -l app=my-app -n default
```

Add `--all-containers` for multi-container pods:

```bash
kubectl logs -l app=my-app --all-containers -n default
```

### Tail and Limit Logs

Show only the last N lines:

```bash
kubectl logs my-app-pod-abc123 --tail=100 -n default
```

Show logs from the last hour:

```bash
kubectl logs my-app-pod-abc123 --since=1h -n default
```

Show logs since a specific time:

```bash
kubectl logs my-app-pod-abc123 --since-time="2026-03-19T10:00:00Z" -n default
```

### View Logs for Jobs and CronJobs

For Jobs:

```bash
kubectl logs job/my-job -n default
```

For CronJobs, find the latest job created by the CronJob first:

```bash
latest_job=$(kubectl get jobs -n default --sort-by=.metadata.creationTimestamp -o custom-columns=NAME:.metadata.name --no-headers | grep '^my-cronjob-' | tail -n 1)
kubectl logs job/"$latest_job" -n default
```

## Method 3: View Logs via Rancher Logging

Rancher Logging is a separate app for cluster-level log aggregation and persistence.

### Install the Logging Chart

1. Go to **Apps > Charts** in the Rancher dashboard
2. Search for **Logging** (Rancher Logging, powered by the Logging operator)
3. Click **Install** and configure the output destination

### Configure a ClusterOutput

Set up where logs should be sent. For Elasticsearch:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: elasticsearch-output
  namespace: cattle-logging-system
spec:
  elasticsearch:
    host: elasticsearch.logging.svc.cluster.local
    port: 9200
    index_name: cluster-logs
    scheme: http
```

### Configure a ClusterFlow

Define which logs to collect:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-logs
  namespace: cattle-logging-system
spec:
  filters:
    - tag_normaliser: {}
  match:
    - select: {}
  globalOutputRefs:
    - elasticsearch-output
```

## Debugging Common Log Issues

### No Logs Appearing

If logs are empty for a running pod:

1. Verify the application writes to stdout/stderr (not to files)
2. Check if the container is actually running:

```bash
kubectl get pod my-app-pod -n default -o jsonpath='{.status.phase}'
```

3. Check container events for startup errors:

```bash
kubectl describe pod my-app-pod -n default
```

### CrashLoopBackOff Logs

When a pod is in CrashLoopBackOff, use `--previous` to see why it crashed:

```bash
kubectl logs my-app-pod --previous -n default
```

### Init Container Logs

View logs from init containers:

```bash
kubectl logs my-app-pod -c init-container-name -n default
```

In Rancher, init containers appear in the container dropdown of the log viewer.

### Logs from Terminated Pods

Once a pod is deleted, its logs are lost unless you have log aggregation configured. Use the Rancher Logging chart or a solution like Fluentd, Loki, or the ELK stack to persist logs beyond pod lifetimes.

## Best Practices

1. Always log to stdout/stderr so Kubernetes can capture the output
2. Use structured logging (JSON) for easier parsing and searching
3. Include request IDs and correlation IDs for tracing requests across services
4. Set up log aggregation for production clusters to retain logs after pod termination
5. Use log levels (DEBUG, INFO, WARN, ERROR) and filter appropriately
6. Avoid excessive logging that can fill up node disk space

## Summary

Rancher provides convenient log access through its built-in log viewer, supporting real-time streaming, container selection, and log downloads. For more advanced needs, kubectl offers flexible options for filtering, tailing, and time-based log queries. For production environments, install the Rancher Logging chart to aggregate and persist logs beyond the lifetime of individual pods.
