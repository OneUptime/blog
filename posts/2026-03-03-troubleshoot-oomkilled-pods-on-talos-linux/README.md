# How to Troubleshoot OOMKilled Pods on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, OOMKilled, Memory Management, Troubleshooting

Description: Practical guide to diagnosing and preventing OOMKilled pod terminations on Talos Linux, including memory profiling, limit tuning, and node-level analysis.

---

OOMKilled is one of the clearest error states in Kubernetes - it means a container was terminated because it used more memory than its configured limit. On Talos Linux, OOM kills can affect both your application pods and system-level components. While the fix seems obvious (give it more memory), the real challenge is understanding why the container is using too much memory and finding the right balance between resource limits and application needs.

## Identifying OOMKilled Pods

Check for OOMKilled containers:

```bash
# Find pods with OOMKilled status
kubectl get pods -A -o json | jq -r '.items[] | select(.status.containerStatuses[]?.lastState.terminated.reason == "OOMKilled") | "\(.metadata.namespace)/\(.metadata.name)"'

# Describe a specific pod to see OOM details
kubectl describe pod <pod-name> -n <namespace>
```

Look for the `Last State` section in the container status:

```text
Last State:     Terminated
  Reason:       OOMKilled
  Exit Code:    137
```

Exit code 137 is the standard indicator of an OOM kill.

## Understanding Memory Limits on Kubernetes

Kubernetes has two memory-related settings:

- **requests** - How much memory the pod is guaranteed. Used for scheduling.
- **limits** - The maximum memory the pod can use. Exceeding this triggers an OOM kill.

```yaml
resources:
  requests:
    memory: "256Mi"   # Guaranteed memory
  limits:
    memory: "512Mi"   # Maximum memory before OOM kill
```

If no limit is set, the container can use as much memory as the node has available, and it will only be OOM killed by the kernel when the entire node runs out of memory.

## Step 1: Check Current Memory Usage

Before changing limits, understand how much memory the container actually needs:

```bash
# Check current memory usage of all pods
kubectl top pods -n <namespace> --sort-by=memory

# Check the specific pod's memory usage
kubectl top pod <pod-name> -n <namespace>
```

Compare the current usage with the memory limit. If usage is consistently close to the limit, the container is at risk of OOM.

## Step 2: Analyze Memory Usage Patterns

Memory issues fall into two categories:

**Steady growth (memory leak):** Memory usage grows over time until it hits the limit. This is a bug in the application.

**Spike-based:** Memory usage spikes during certain operations (large requests, batch jobs, cache warming). The limit just needs to be higher.

Monitor memory over time:

```bash
# Watch memory usage over time
watch kubectl top pod <pod-name> -n <namespace>
```

For more detailed analysis, set up Prometheus and Grafana to track memory usage patterns over hours or days.

## Step 3: Check Node-Level Memory

On Talos Linux, check the overall node memory situation:

```bash
# Check node memory
talosctl -n <node-ip> memory

# Check node memory pressure
kubectl describe node <node-name> | grep MemoryPressure
```

If the node itself is under memory pressure, the kernel OOM killer may terminate pods even if they have not hit their Kubernetes memory limit. This is a different situation than a Kubernetes-enforced OOM kill.

Check the kernel logs for OOM killer activity:

```bash
# Check for kernel OOM kills
talosctl -n <node-ip> dmesg | grep -i "oom\|out of memory\|killed process"
```

## Step 4: Identify Memory-Hungry Processes

For containers running multiple processes, identify which process is consuming the most memory:

```bash
# Exec into the pod (if it stays up long enough)
kubectl exec -it <pod-name> -n <namespace> -- top

# Or check from Talos
talosctl -n <node-ip> processes | sort -k4 -rn | head -20
```

## Step 5: Increase Memory Limits

If the application genuinely needs more memory, increase the limits:

```yaml
resources:
  requests:
    memory: "512Mi"    # Set to the typical usage
  limits:
    memory: "1Gi"      # Set to handle peak usage
```

A good rule of thumb is to set the request to the average usage and the limit to 2x the average or the observed peak, whichever is higher.

Apply the change:

```bash
# Edit the deployment
kubectl edit deployment <deployment-name> -n <namespace>

# Or apply an updated manifest
kubectl apply -f updated-deployment.yaml
```

## Step 6: Fix Memory Leaks

If the container's memory grows indefinitely, the application has a memory leak. Increasing limits only delays the inevitable OOM kill.

Common causes of memory leaks:

- Unbounded caches
- Connection pools that grow but never shrink
- Event listeners that accumulate
- Large buffers that are never freed

Profile the application's memory usage. For Java applications:

```yaml
containers:
  - name: myapp
    image: myapp:latest
    env:
      - name: JAVA_OPTS
        # Set heap limits to prevent unbounded growth
        value: "-Xms256m -Xmx384m -XX:+UseG1GC"
    resources:
      limits:
        memory: "512Mi"  # Must be larger than JVM max heap
```

For Node.js applications:

```yaml
containers:
  - name: myapp
    image: myapp:latest
    command: ["node", "--max-old-space-size=384", "server.js"]
    resources:
      limits:
        memory: "512Mi"
```

## Step 7: Handle System-Level OOM Kills on Talos

On Talos Linux, system components can also be OOM killed. Check for system-level OOM kills:

```bash
# Check Talos system service memory usage
talosctl -n <node-ip> memory

# Check if kubelet was OOM killed
talosctl -n <node-ip> dmesg | grep kubelet
```

If the kubelet itself is OOM killed, the node will become NotReady. Talos will automatically restart the kubelet, but if memory pressure is persistent, the node will keep cycling.

Configure kubelet memory reservations to protect system components:

```yaml
machine:
  kubelet:
    extraArgs:
      system-reserved: "memory=1Gi"
      kube-reserved: "memory=512Mi"
      eviction-hard: "memory.available<200Mi"
```

## Step 8: Pod QoS Classes and Eviction

Kubernetes assigns Quality of Service (QoS) classes that determine eviction priority:

- **Guaranteed** - requests equal limits. Last to be evicted.
- **Burstable** - requests less than limits. Evicted after BestEffort.
- **BestEffort** - no requests or limits set. First to be evicted.

Set your critical pods to Guaranteed QoS:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "512Mi"    # Same as request = Guaranteed QoS
    cpu: "500m"
```

## Step 9: Vertical Pod Autoscaler

For workloads where memory usage is unpredictable, consider using the Vertical Pod Autoscaler (VPA):

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: Auto
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        minAllowed:
          memory: "128Mi"
        maxAllowed:
          memory: "2Gi"
```

VPA automatically adjusts memory requests and limits based on observed usage.

## Step 10: Prevention and Monitoring

Set up alerts to catch memory issues before they cause OOM kills:

```bash
# Check container memory usage vs limits
kubectl top pods -n <namespace> --containers

# Compare with limits
kubectl get pods -n <namespace> -o json | jq '.items[] | {name: .metadata.name, limits: .spec.containers[].resources.limits}'
```

Good monitoring practices:

1. Alert when memory usage exceeds 80% of the limit
2. Track memory usage trends to predict future OOM kills
3. Review OOM kill events daily
4. Set appropriate memory limits on all pods (do not rely on BestEffort)

## Summary

OOMKilled pods on Talos Linux are caused by containers exceeding their memory limits. The fix involves understanding the application's memory needs, setting appropriate limits, and fixing memory leaks if they exist. Use `kubectl top` for quick checks, kernel dmesg for node-level OOM kills, and proper monitoring for ongoing prevention. On Talos specifically, make sure to reserve system memory for kubelet and other system services to prevent node-level instability.
