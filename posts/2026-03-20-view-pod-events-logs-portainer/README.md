# How to View Pod Events and Logs in Portainer - View Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Pod, Logging, Observability, Troubleshooting

Description: Use Portainer's Kubernetes pod interface to view container logs, pod events, and previous container output for effective troubleshooting of running and failed workloads.

---

Kubernetes pod logs and events are your primary diagnostic tools. Portainer surfaces both through its web interface, eliminating the need to run kubectl commands for routine log inspection and event monitoring.

## Difference Between Logs and Events

- **Container Logs**: stdout/stderr output from your application code. Updated in real time as the application runs.
- **Pod Events**: Kubernetes control plane messages about pod lifecycle - scheduling decisions, image pulls, container starts/stops, health check failures.

## Viewing Container Logs in Portainer

Navigate to **Kubernetes > Namespaces > [namespace] > Pods > [pod name] > Logs**.

Available options:

```sql
Container selector: Select which container (for multi-container pods or init containers)
Follow logs: Enable real-time log streaming
Wrap lines: Toggle line wrapping for long log lines
Previous container: Show logs from the last (crashed) container instance
Lines: Specify how many log lines to retrieve (default: 100)
```

## Viewing Previous Container Logs

When a container crashes and restarts, the current logs show the new instance. To see why it crashed, use the **Previous** toggle:

```bash
# kubectl equivalent

kubectl logs <pod-name> -c <container-name> --previous -n <namespace>
```

This is the most important log view when diagnosing CrashLoopBackOff errors.

## Viewing Pod Events

Open the pod detail view in Portainer and scroll to the **Events** section. Events appear in chronological order with timestamps:

```text
REASON              MESSAGE
Scheduled           Successfully assigned production/api-v2 to node-worker-2
Pulling             Pulling image "my-registry/api:1.5.0"
Pulled              Successfully pulled image in 3.2s
Created             Created container api
Started             Started container api
Unhealthy           Liveness probe failed: HTTP probe failed with status code 500
Killing             Container api failed liveness probe, will be restarted
```

## Multi-Container Log Access

For pods with sidecars (service mesh, log forwarder, etc.), Portainer's container selector dropdown lets you switch between containers:

- `api` - main application container
- `istio-proxy` - Envoy sidecar
- `filebeat` - log shipper sidecar

## Log Filtering and Search

Portainer's log viewer supports basic text search within the displayed output. For more advanced filtering, use Portainer's terminal to pipe logs through grep:

```bash
# Search for ERROR level messages
kubectl logs -n production deployment/api-server | grep -i error

# Follow logs from all pods in a deployment
kubectl logs -n production deployment/api-server -f
```

## Namespace-Wide Event Monitoring

To monitor events across an entire namespace (useful during deployments):

```bash
kubectl get events -n production --sort-by='.lastTimestamp' -w
```

Run this in Portainer's terminal during deployments to catch scheduling issues in real time.

## Summary

Portainer's log viewer and pod event display cover the most common troubleshooting workflows without requiring kubectl. The previous-container log view is particularly valuable for diagnosing crash causes, and the events section reveals infrastructure-level issues like scheduling failures, image pull errors, and health check results.
