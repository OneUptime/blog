# How to Troubleshoot AKS etcd Latency Issues Affecting API Server Responsiveness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, etcd, Latency, Troubleshooting, API Server, Kubernetes, Performance

Description: Learn how to diagnose and resolve etcd latency issues in AKS that cause slow API server responses, failed deployments, and degraded cluster performance.

---

When your `kubectl` commands take 10 seconds instead of 1, or deployments fail with timeout errors, or the API server becomes intermittently unreachable, the root cause is often etcd latency. etcd is the backing store for all Kubernetes data - every pod, service, secret, and ConfigMap lives in etcd. When etcd is slow, everything in the cluster feels slow.

In AKS, etcd is managed by Microsoft as part of the control plane. You do not have direct access to etcd metrics or configuration. But you can still diagnose etcd-related issues through symptoms, API server behavior, and Azure diagnostics. This guide covers how to identify etcd latency problems and the actions you can take to resolve them.

## Understanding etcd's Role

etcd is a distributed key-value store that serves as Kubernetes' system of record. Kubernetes API requests are served by the API server's storage layer, which is backed by etcd:

- `kubectl get pods` reads cluster state through the API server
- `kubectl create deployment` writes cluster state through the API server
- The controller manager reads and writes to etcd continuously
- The scheduler reads pod and node data from etcd

When etcd latency increases, operations that depend on fresh cluster state can slow down. A healthy etcd cluster should usually handle read operations in milliseconds and apply write requests in under 50ms. When these numbers climb to hundreds of milliseconds or seconds, the cluster becomes visibly degraded.

```mermaid
graph LR
    A[kubectl] --> B[API Server]
    B --> C[etcd]
    C --> B
    B --> A
    D[Controller Manager] --> B
    E[Scheduler] --> B
    F[Watch Streams] --> B
```

## Symptoms of etcd Latency

Before diving into diagnostics, here is what etcd latency looks like from the user perspective:

- `kubectl` commands are slow (multiple seconds for simple operations)
- Deployments and scaling operations time out
- Pod scheduling is delayed
- Events and status updates are stale
- Watch connections drop and reconnect frequently
- The Azure portal shows the cluster as degraded
- Errors like `etcdserver: request timed out` or `context deadline exceeded` in API server logs

## Step 1: Confirm It Is an etcd Issue

First, rule out other causes of slow API responses. Check if the issue is network-related or specific to etcd.

```bash
# Time a simple API call to measure latency

time kubectl get namespaces

# Compare with a more complex query
time kubectl get pods --all-namespaces

# Check API server liveness and readiness endpoints
kubectl get --raw /livez
kubectl get --raw /readyz

# Check the API server response time for different resource types
kubectl get --raw /api/v1/namespaces?limit=1 -v=6 2>&1 | grep "Response Status"
```

If simple queries (like listing namespaces) are slow, the issue is likely at the etcd or API server level rather than in your workloads.

## Step 2: Check Control Plane Diagnostic Logs

If you have diagnostic logging enabled (you should), query the API server logs for etcd-related errors. AKS can send logs to the resource-specific `AKSControlPlane` table or, in Azure diagnostics mode, to `AzureDiagnostics`.

```text
// KQL query: Find etcd timeout errors in API server logs
let ApiServerLogs = union isfuzzy=true
  (AKSControlPlane | where Category == "kube-apiserver" | project TimeGenerated, Message),
  (AzureDiagnostics | where Category == "kube-apiserver" | project TimeGenerated, Message = log_s);
ApiServerLogs
| where Message contains "etcd" and (Message contains "timeout" or Message contains "slow" or Message contains "deadline")
| project TimeGenerated, Message
| order by TimeGenerated desc
| take 50
```

```text
// KQL query: Find slow API requests that indicate etcd latency
let ApiServerLogs = union isfuzzy=true
  (AKSControlPlane | where Category == "kube-apiserver" | project TimeGenerated, Message),
  (AzureDiagnostics | where Category == "kube-apiserver" | project TimeGenerated, Message = log_s);
ApiServerLogs
| where Message contains "response" and Message contains "latency"
| extend latencyValue = todouble(extract(@"latency=""?([0-9.]+)", 1, Message))
| extend latencyUnit = extract(@"latency=""?[0-9.]+(ms|s)", 1, Message)
| extend latencySeconds = case(latencyUnit == "ms", latencyValue / 1000.0, latencyValue)
| where latencySeconds > 1
| project TimeGenerated, Message, latencySeconds
| order by latencySeconds desc
| take 20
```

## Step 3: Check API Server Metrics

AKS exposes some control plane platform metrics through Azure Monitor that can indicate API server or etcd pressure. Request latency histograms are available through managed Prometheus, not as standard Azure Monitor platform metrics.

```bash
# Check API server inflight requests
az monitor metrics list \
  --resource $(az aks show -g myResourceGroup -n myAKSCluster --query id -o tsv) \
  --metric "apiserver_current_inflight_requests" \
  --interval PT5M \
  --aggregation Average \
  --output table

# Check etcd database usage
az monitor metrics list \
  --resource $(az aks show -g myResourceGroup -n myAKSCluster --query id -o tsv) \
  --metric "etcd_database_usage_percentage" \
  --interval PT5M \
  --aggregation Average \
  --output table
```

If you have Prometheus monitoring set up (via Azure Monitor managed Prometheus or your own), query these metrics:

```text
# PromQL: API server request duration by verb (shows read vs write latency)
histogram_quantile(0.99,
  sum(rate(apiserver_request_duration_seconds_bucket{job="apiserver"}[5m])) by (le, verb)
)

# PromQL: etcd request duration (if exposed)
histogram_quantile(0.99,
  sum(rate(etcd_request_duration_seconds_bucket[5m])) by (le, operation)
)
```

## Step 4: Identify Common Causes

### Too Many Objects in the Cluster

etcd performance degrades as the amount of stored data grows. Clusters with tens of thousands of ConfigMaps, Secrets, or completed Jobs accumulate data that slows down etcd.

```bash
# Count objects by type to identify bloat
echo "Pods: $(kubectl get pods -A --no-headers | wc -l)"
echo "Services: $(kubectl get svc -A --no-headers | wc -l)"
echo "ConfigMaps: $(kubectl get configmaps -A --no-headers | wc -l)"
echo "Secrets: $(kubectl get secrets -A --no-headers | wc -l)"
echo "Events: $(kubectl get events -A --no-headers | wc -l)"
echo "Jobs: $(kubectl get jobs -A --no-headers | wc -l)"

# Check for completed Jobs that should be cleaned up
kubectl get jobs -A --field-selector status.successful=1 --no-headers | wc -l
```

If you have thousands of completed Jobs or Events, clean them up:

```bash
# Delete completed Jobs older than 1 hour
kubectl get jobs -A -o json | \
  jq -r '.items[] | select(.status.succeeded==1 and .status.completionTime != null and (.status.completionTime | fromdateiso8601) < (now - 3600)) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read NS NAME; do
    kubectl delete job $NAME -n $NS
  done

# Set TTL on Jobs to auto-cleanup
# Add this to your Job specs
```

```yaml
# job-with-ttl.yaml
# Job that auto-deletes 1 hour after completion
apiVersion: batch/v1
kind: Job
metadata:
  name: cleanup-job
spec:
  # Automatically delete the Job 3600 seconds after completion
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
      - name: worker
        image: busybox
        command: ["echo", "done"]
      restartPolicy: Never
```

### Too Many Watches

Kubernetes controllers, operators, and your applications use watch streams to monitor changes. Each watch creates load on etcd. Too many watches, especially broad watches on large collections, can overwhelm etcd.

```bash
# Check the number of active watch streams (requires API server metrics)
# If using Prometheus:
# sum(apiserver_longrunning_requests{verb="WATCH"}) by (resource, scope)

# Check which controllers might be creating excessive watches
kubectl get pods -n kube-system -o name | while read POD; do
  echo "$POD:"
  kubectl top pod ${POD#pod/} -n kube-system 2>/dev/null
done
```

### Large Objects in etcd

Secrets and ConfigMaps are limited to 1MiB of data per object, but even objects below this limit can cause latency if there are many large ones. Secrets and ConfigMaps with large data blobs are common culprits.

```bash
# Find the largest Secrets
kubectl get secrets -A -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name) \(.data | to_entries | map(.value | length) | add // 0)"' | \
  sort -k2 -n -r | head -20

# Find large ConfigMaps
kubectl get configmaps -A -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name) \(.data | to_entries | map(.value | length) | add // 0)"' | \
  sort -k2 -n -r | head -20
```

### Cluster Size Relative to Control Plane Tier

AKS cluster management tiers affect the API server SLA and supported scale targets. The Free tier is recommended for development, testing, and clusters with fewer than 10 nodes, while Standard and Premium are intended for production and larger clusters.

```bash
# Check your cluster's SKU tier
az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "sku" -o json
```

If you are running a production or larger cluster on the Free tier, upgrading to Standard or Premium gives you the supported production tier, API server uptime SLA, and higher documented scale targets.

```bash
# Upgrade to Standard tier
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --tier standard
```

## Step 5: Reduce etcd Load

### Clean Up Stale Resources

```bash
# Delete scaled-down ReplicaSets after confirming you do not need rollback history
kubectl get replicasets -A -o json | \
  jq -r '.items[] | select(.spec.replicas==0) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read NS NAME; do
    kubectl delete replicaset $NAME -n $NS
  done
```

### Check Event TTL

Events accumulate quickly and add load to etcd, but Kubernetes retains events only for the API server's configured `--event-ttl` duration, which defaults to 1 hour. In AKS you cannot configure the API server event TTL directly. If events are accumulating far beyond the expected retention period, include that evidence in your Microsoft support ticket rather than running an ad hoc cleanup controller.

```bash
# Check whether old events are still present
kubectl get events -A --sort-by='.lastTimestamp' | tail -20
```

### Reduce Watch Cardinality

If you have custom controllers or operators that watch all resources cluster-wide, add label selectors or namespace filters to reduce the watch scope.

## Step 6: Request Microsoft Support

If you have done everything you can on your end and etcd latency persists, open a support ticket with Microsoft. Since etcd is managed by Azure, Microsoft can:

- Check etcd cluster health metrics that are not exposed to customers
- Identify if the etcd cluster is experiencing compaction issues
- Move your control plane to a different infrastructure node if there is a noisy neighbor issue
- Resize the etcd instance if needed

When filing the ticket, include:

- Timestamps of when the latency occurs
- API server diagnostic log queries showing the slow requests
- The number of objects in your cluster
- Your cluster tier (Free, Standard, Premium)

etcd latency is one of the harder issues to debug in AKS because the root cause is in managed infrastructure you cannot directly access. But by systematically reducing the load on etcd, cleaning up stale resources, and using the right cluster tier, you can resolve most performance issues without needing Microsoft support.
