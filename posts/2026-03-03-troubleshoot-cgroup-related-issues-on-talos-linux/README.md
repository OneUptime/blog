# How to Troubleshoot Cgroup-Related Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, cgroups, Troubleshooting, Kubernetes, Performance, Debugging

Description: A troubleshooting guide for diagnosing and resolving common cgroup-related issues on Talos Linux including OOM kills, CPU throttling, and resource contention.

---

Cgroup issues are among the most frustrating problems to diagnose in Kubernetes because the symptoms often look like application bugs. A web server with intermittent latency spikes might actually be experiencing CPU throttling. A database that crashes randomly might be getting OOM killed. An application that slows down under load might be hitting IO limits.

On Talos Linux, troubleshooting cgroup issues requires a different approach than traditional Linux because there is no SSH access and no traditional debugging tools installed on the host. This guide covers the most common cgroup-related problems and how to diagnose and fix them on Talos Linux.

## Setting Up Your Troubleshooting Toolkit

Since Talos Linux is immutable and does not have SSH, you need two tools for cgroup troubleshooting:

**talosctl** for reading node-level information:

```bash
# Read cgroup files directly from the node
talosctl read /sys/fs/cgroup/kubepods.slice/cpu.stat --nodes <node-ip>

# List cgroup directory contents
talosctl ls /sys/fs/cgroup/kubepods.slice --nodes <node-ip>

# View kernel logs for OOM events
talosctl dmesg --nodes <node-ip> | grep -i "oom\|killed\|out of memory"
```

**Debug pod** for more interactive investigation:

```yaml
# debug-pod.yaml
# Privileged debug pod for cgroup investigation
apiVersion: v1
kind: Pod
metadata:
  name: cgroup-troubleshoot
  namespace: kube-system
spec:
  hostPID: true
  nodeSelector:
    kubernetes.io/hostname: <target-node>
  containers:
    - name: debug
      image: alpine:latest
      command: ["sleep", "infinity"]
      securityContext:
        privileged: true
      volumeMounts:
        - name: cgroup
          mountPath: /sys/fs/cgroup
          readOnly: true
        - name: proc
          mountPath: /host/proc
          readOnly: true
  volumes:
    - name: cgroup
      hostPath:
        path: /sys/fs/cgroup
    - name: proc
      hostPath:
        path: /proc
  restartPolicy: Never
```

## Problem 1: Pods Getting OOM Killed

**Symptoms:**
- Pod restarts with reason "OOMKilled"
- Application crashes without clear error messages
- `kubectl describe pod` shows "Last State: Terminated - Reason: OOMKilled"

**Diagnosis:**

```bash
# Check recent OOM kills from kernel logs
talosctl dmesg --nodes <node-ip> | grep -i "oom-kill\|out of memory"

# Check the memory events for a specific pod cgroup
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.events

# Look for:
# oom > 0 indicates OOM killer was triggered
# max > 0 indicates the hard limit was reached

# Check what the actual memory usage was at the time
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.current

# Compare with the limit
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/memory.max
```

**Solutions:**

```yaml
# Option 1: Increase memory limit
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"  # Increase from previous limit

# Option 2: Fix memory leaks in the application
# Look for continuously growing memory usage in Prometheus:
# container_memory_working_set_bytes{pod="my-pod"}
# If it grows linearly over time, you have a memory leak

# Option 3: Tune JVM/runtime memory settings
# For Java applications, set heap size below the container limit
# Container limit: 1Gi
# JVM flags: -Xmx768m -Xms256m
# This leaves ~256MB for non-heap memory
```

## Problem 2: CPU Throttling Causing Latency

**Symptoms:**
- Intermittent latency spikes (every 100ms)
- P99 latency is much higher than P50
- Application appears slow despite low average CPU usage

**Diagnosis:**

```bash
# Check CPU throttling statistics
kubectl exec cgroup-troubleshoot -n kube-system -- sh -c '
  for cg in /sys/fs/cgroup/kubepods.slice/*/kubepods-*-pod*.slice; do
    [ -f "$cg/cpu.stat" ] || continue
    name=$(basename "$cg" | sed "s/kubepods-.*-pod/pod-/;s/.slice//")
    throttled=$(grep "^nr_throttled " "$cg/cpu.stat" | awk "{print \$2}")
    periods=$(grep "^nr_periods " "$cg/cpu.stat" | awk "{print \$2}")
    if [ "$periods" -gt 0 ] 2>/dev/null && [ "$throttled" -gt 0 ] 2>/dev/null; then
      pct=$((throttled * 100 / periods))
      echo "$name: ${pct}% throttled (${throttled}/${periods})"
    fi
  done
' | sort -t: -k2 -rn | head -10

# Check the CPU limit (quota/period)
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/cpu.max

# Check actual CPU usage
kubectl top pod <pod-name> -n <namespace>
```

**Solutions:**

```yaml
# Option 1: Increase CPU limit
resources:
  requests:
    cpu: "500m"
  limits:
    cpu: "2"  # Give more headroom

# Option 2: Remove CPU limit entirely (recommended for web services)
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    memory: "1Gi"  # Keep memory limit, remove CPU limit

# Option 3: Adjust CFS period for less bursty throttling
# In Talos machine config:
machine:
  kubelet:
    extraArgs:
      cpu-cfs-quota-period: "20ms"  # Shorter period, smoother throttling
```

## Problem 3: Node-Level Memory Pressure

**Symptoms:**
- Pods being evicted from nodes
- Node status shows MemoryPressure condition
- Multiple pods restarting simultaneously

**Diagnosis:**

```bash
# Check node conditions
kubectl describe node <node-name> | grep -A10 "Conditions:"

# Check node-level memory stats
talosctl read /proc/meminfo --nodes <node-ip>

# Check the kubepods cgroup total memory usage
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/memory.current

# Compare with node allocatable
kubectl get node <node-name> -o json | \
  jq '.status.allocatable.memory'

# Check which pods are using the most memory
kubectl top pods -A --sort-by=memory | head -20

# Check PSI memory pressure
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/memory.pressure
```

**Solutions:**

```yaml
# Option 1: Configure eviction thresholds
machine:
  kubelet:
    extraArgs:
      eviction-hard: "memory.available<500Mi"
      eviction-soft: "memory.available<1Gi"
      eviction-soft-grace-period: "memory.available=1m"

# Option 2: Reduce memory overcommit
# Ensure sum of memory requests < node allocatable
# Audit pods with high request-to-limit ratios

# Option 3: Add more nodes or scale up existing ones
```

## Problem 4: IO Contention

**Symptoms:**
- Slow file operations inside containers
- Database query timeouts
- High IO wait in node metrics

**Diagnosis:**

```bash
# Check IO statistics per cgroup
kubectl exec cgroup-troubleshoot -n kube-system -- sh -c '
  for cg in /sys/fs/cgroup/kubepods.slice/*/kubepods-*-pod*.slice; do
    [ -f "$cg/io.stat" ] || continue
    stat=$(cat "$cg/io.stat")
    if [ -n "$stat" ]; then
      name=$(basename "$cg" | sed "s/kubepods-.*-pod/pod-/;s/.slice//")
      echo "$name:"
      echo "$stat"
      echo "---"
    fi
  done
'

# Check IO pressure
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/io.pressure

# Check PSI for the specific pod
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/kubepods.slice/kubepods-burstable.slice/kubepods-burstable-pod<uid>.slice/io.pressure
```

**Solutions:**

```yaml
# Option 1: Use faster storage class
# Switch from gp2/gp3 to io2 for IO-intensive workloads
spec:
  storageClassName: performance-ssd

# Option 2: Separate IO-heavy and IO-light workloads
# Use node affinity to put databases on nodes with fast disks
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: disk-type
              operator: In
              values: ["nvme"]
```

## Problem 5: Cgroup Hierarchy Errors

**Symptoms:**
- kubelet logs show cgroup-related errors
- Pods stuck in ContainerCreating state
- "failed to create cgroup" error messages

**Diagnosis:**

```bash
# Check kubelet logs for cgroup errors
talosctl logs kubelet --nodes <node-ip> | grep -i "cgroup\|cgroupv2"

# Verify cgroup hierarchy is healthy
kubectl exec cgroup-troubleshoot -n kube-system -- \
  cat /sys/fs/cgroup/cgroup.controllers

# Expected output should include: cpuset cpu io memory pids

# Check for any orphaned cgroups
kubectl exec cgroup-troubleshoot -n kube-system -- \
  ls /sys/fs/cgroup/kubepods.slice/ | wc -l
```

**Solutions:**

```bash
# Option 1: Restart kubelet on the affected node
talosctl service kubelet restart --nodes <node-ip>

# Option 2: If cgroups are corrupted, reboot the node
talosctl reboot --nodes <node-ip>

# Option 3: Check Talos machine config for cgroup misconfigurations
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A20 kubelet
```

## Quick Troubleshooting Checklist

When you encounter a cgroup-related issue, work through this checklist:

```text
1. [ ] What is the symptom? (OOM, throttle, slow IO, eviction)
2. [ ] Which pod/container is affected?
3. [ ] What are the resource requests and limits?
4. [ ] What does the cgroup hierarchy show?
5. [ ] What do the kernel logs (dmesg) say?
6. [ ] Is this a pod-level or node-level issue?
7. [ ] When did the problem start? (correlate with deployments)
8. [ ] Is the issue intermittent or continuous?
```

## Summary

Troubleshooting cgroup issues on Talos Linux requires adapting to the platform's immutable design. Use talosctl and debug pods instead of SSH for investigation. The most common problems - OOM kills, CPU throttling, memory pressure, and IO contention - all leave clear traces in cgroup statistics and kernel logs. Start by identifying the symptom category, then use the specific diagnostic commands for that category to pinpoint the cause. Most issues resolve either by adjusting resource limits, fixing application-level resource leaks, or improving workload placement across your Talos Linux cluster nodes.
