# How to View Container Logs in the Rancher UI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging

Description: A guide to viewing and navigating container logs directly in the Rancher web interface for quick debugging.

The Rancher UI provides built-in log viewing capabilities that allow you to inspect container logs without using kubectl or connecting to the cluster directly. This is useful for quick debugging, checking application startup, and monitoring container behavior. This guide covers all the log viewing features available in the Rancher UI.

## Prerequisites

- Rancher v2.6 or later.
- Access to at least one managed cluster.
- Permission to view workloads and pods in the target project or cluster.

## Step 1: Access Container Logs from the Workload View

1. Log in to the Rancher UI and select your cluster.
2. Navigate to **Workloads > Deployments** (or StatefulSets, DaemonSets, etc.).
3. Click on the deployment name to view its details.
4. In the pod list, click the three-dot menu next to a pod.
5. Select **View Logs**.

The log viewer opens showing real-time log output from the selected pod and container.

## Step 2: Access Logs from the Pod View

1. Navigate to **Workloads > Pods**.
2. Find the pod you want to inspect.
3. Use the three-dot menu on the pod row and select **View Logs**.

Alternatively, open the pod details page and use the row actions for the container you want, then select **View Logs**.

## Step 3: Navigate the Log Viewer Interface

The Rancher log viewer provides several controls:

### Container Selection

If a pod has multiple containers (including init containers and sidecars), use the container dropdown at the top of the log viewer to switch between containers.

### Timestamp Display

Toggle timestamp display to show or hide the timestamp prefix on each log line. This is useful for correlating events across multiple containers.

### Word Wrap

Toggle word wrap to handle long log lines. When disabled, you can scroll horizontally to see the full line.

### Follow Mode

The log viewer follows new log entries by default. If you scroll up to inspect older output, Rancher pauses following. Click **Follow** to jump back to the bottom and resume live output.

## Step 4: Follow Live Logs

The Rancher log viewer supports real-time log streaming:

1. Open the log viewer for a running container.
2. By default, the viewer follows new output. If you have scrolled up, click **Follow**.
3. New log entries appear as they are generated.

This is equivalent to running `kubectl logs -f <pod> -c <container>`.

## Step 5: View Previous Container Logs

When a container has restarted, you can view logs from the previous instance:

1. Open the log viewer for the container.
2. Enable the **Use Previous Container** option.
3. Rancher shows logs from the last terminated container instance.

This is equivalent to `kubectl logs <pod> -c <container> --previous` and is essential for debugging crash loops.

## Step 6: Download Logs

The Rancher UI allows you to download container logs:

1. Open the log viewer.
2. Click the download button (usually an arrow-down icon).
3. The logs are downloaded as a text file.

This is useful when you need to share logs with team members or attach them to incident reports.

## Step 7: Search and Filter Logs

Use the filter field in the log viewer to find specific log entries:

1. Enter a search term.
2. Matching log lines remain visible and matching text is highlighted.

For more advanced filtering, use kubectl or download the logs and use local text search tools.

## Step 8: View Logs via kubectl

For more advanced log viewing, use kubectl commands from the Rancher UI's built-in kubectl shell:

1. Open **☰ > Cluster Management**.
2. Find your cluster and click **Explore**.
3. In the top navigation, click **Kubectl Shell**.
4. Use kubectl commands:

```bash
# View current logs

kubectl logs <pod-name> -n <namespace>

# Follow logs in real-time
kubectl logs -f <pod-name> -n <namespace>

# View logs from a specific container
kubectl logs <pod-name> -c <container-name> -n <namespace>

# View previous container logs
kubectl logs <pod-name> -c <container-name> -n <namespace> --previous

# View logs with timestamps
kubectl logs <pod-name> -n <namespace> --timestamps

# View last 100 lines
kubectl logs <pod-name> -n <namespace> --tail=100

# View logs from the last hour
kubectl logs <pod-name> -n <namespace> --since=1h

# View logs from all pods in a deployment
kubectl logs deployment/my-app -n <namespace> --all-pods=true

# View logs from all containers in pods with a specific label
kubectl logs -l tier=frontend -n <namespace> --all-containers=true --prefix
```

## Step 9: View Logs for Jobs and CronJobs

For batch workloads:

1. Navigate to **Workloads > Jobs** or **Workloads > CronJobs**.
2. Click on the job name.
3. In the pod list, find the pod associated with the job run.
4. Click the three-dot menu and select **View Logs**.

For CronJobs, you can see logs from each job run to track the history of execution results.

## Step 10: View Events for Additional Context

Container events provide additional context alongside logs:

1. Open the pod details page.
2. Click the **Events** tab.
3. Events show scheduling decisions, image pulls, container starts and stops, health check failures, and resource constraints.

Common events that complement log analysis:
- **Pulling image**: Container image is being downloaded.
- **Started**: Container has started.
- **Killing**: Container is being terminated.
- **BackOff**: Container is in a restart backoff delay.
- **Unhealthy**: Liveness or readiness probe failed.
- **FailedScheduling**: Pod cannot be scheduled to a node.

## Tips for Effective Log Analysis

### Correlate Logs with Events

When debugging a container issue:
1. Check the container logs for error messages.
2. Check pod events for scheduling or probe failures.
3. Check node events for resource pressure.

### Use Labels to Find Related Pods

When debugging a service with multiple replicas:
1. Navigate to **Workloads > Pods**.
2. Use the namespace and label filters to find all pods for a service.
3. Check logs across multiple pods to identify if the issue is isolated or widespread.

### Check Init Container Logs

If a pod is stuck in `Init:Error` or `Init:CrashLoopBackOff`:
1. Open the pod details.
2. In the log viewer, switch to the init container using the container dropdown.
3. Review init container logs for initialization failures.

### Monitor Startup Logs

For applications with long startup times:
1. Open the log viewer immediately after deploying.
2. Watch for startup messages, configuration loading, and health check readiness.
3. Compare startup times across deployments to identify regressions.

## Summary

The Rancher UI provides convenient log viewing capabilities for quick container debugging. Use the built-in log viewer to follow live logs, view previous container instances, download logs, filter for specific entries, and adjust range, wrapping, and timestamp options. For more advanced log analysis, use the kubectl shell with log commands. Always correlate container logs with pod events for a complete picture of container behavior.
