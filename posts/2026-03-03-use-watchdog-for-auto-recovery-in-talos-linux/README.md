# How to Use Watchdog for Auto-Recovery in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Watchdog, Auto-Recovery, High Availability, System Reliability

Description: How to implement automatic system recovery using watchdog timers on Talos Linux for self-healing Kubernetes infrastructure

---

Running Kubernetes in production means accepting that things will fail. Hardware glitches, kernel bugs, driver issues, and resource exhaustion can all cause a node to hang or become unresponsive. The question is not whether failures will happen, but how quickly and automatically your infrastructure recovers. Watchdog timers provide the foundation for automatic recovery on Talos Linux, but building a truly self-healing system requires combining watchdog functionality with Kubernetes health management and proper configuration.

This guide shows you how to build a comprehensive auto-recovery system using watchdog timers on Talos Linux.

## The Auto-Recovery Stack

A well-designed auto-recovery system has multiple layers, each handling different types of failures:

```text
Layer 5: Application Level
  Tool: Kubernetes liveness probes
  Recovers: Application crashes, deadlocks
  Time to recover: 10-30 seconds

Layer 4: Container Level
  Tool: Kubernetes pod management
  Recovers: Container failures, OOM kills
  Time to recover: 5-30 seconds

Layer 3: Service Level
  Tool: Talos service management
  Recovers: kubelet, containerd crashes
  Time to recover: 10-60 seconds

Layer 2: Kernel Level
  Tool: Software watchdog (soft lockup, hung task detection)
  Recovers: Kernel hangs, driver stalls, deadlocks
  Time to recover: 30-120 seconds

Layer 1: Hardware Level
  Tool: Hardware watchdog (iTCO, IPMI)
  Recovers: Complete system freeze, kernel panic
  Time to recover: 60-300 seconds
```

Each layer catches failures that the layer above it cannot handle. Together, they form a comprehensive recovery system.

## Configuring the Complete Watchdog Stack

Here is a production-ready watchdog configuration for Talos Linux:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Hardware watchdog
      - iTCO_wdt.heartbeat=60
      - iTCO_wdt.nowayout=1

      # NMI watchdog for hard lockups
      - nmi_watchdog=1

      # Kernel panic behavior
      - panic=10                        # Reboot 10s after panic

      # Soft lockup settings
      - softlockup_panic=1

  kernel:
    modules:
      - name: iTCO_wdt
      - name: iTCO_vendor_support

  sysctls:
    # Soft lockup detection
    kernel.softlockup_panic: "1"
    kernel.softlockup_all_cpu_backtrace: "1"
    kernel.watchdog_thresh: "20"

    # Hard lockup detection
    kernel.hardlockup_panic: "1"

    # Hung task detection
    kernel.hung_task_panic: "1"
    kernel.hung_task_timeout_secs: "120"

    # Panic and reboot settings
    kernel.panic: "10"
    kernel.panic_on_oops: "1"
    kernel.panic_on_warn: "0"

    # OOM handling
    vm.panic_on_oom: "0"              # Don't panic on OOM, use OOM killer
    vm.oom_kill_allocating_task: "1"  # Kill the task that caused OOM
```

This configuration creates a chain: soft lockup or hung task triggers a panic, the panic triggers a reboot after 10 seconds, and if the panic handler itself hangs, the hardware watchdog reboots after 60 seconds.

## Kubernetes-Level Recovery Configuration

Configure Kubernetes to handle node failures gracefully:

```yaml
# talos-machine-config.yaml
cluster:
  controllerManager:
    extraArgs:
      # How quickly to detect unhealthy nodes
      node-monitor-period: "5s"
      node-monitor-grace-period: "40s"

      # How quickly to evict pods from unhealthy nodes
      pod-eviction-timeout: "30s"
```

Configure kubelet to report health accurately:

```yaml
machine:
  kubelet:
    extraArgs:
      # Node health reporting
      node-status-update-frequency: "10s"

      # Resource monitoring
      eviction-hard: "memory.available<500Mi,nodefs.available<10%"
      eviction-soft: "memory.available<1Gi,nodefs.available<15%"
      eviction-soft-grace-period: "memory.available=1m,nodefs.available=1m"
```

## Pod Disruption Budgets for Safe Recovery

When a watchdog triggers a node reboot, all pods on that node are terminated. Pod Disruption Budgets (PDBs) ensure that your services maintain minimum availability even during unplanned reboots:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 2                    # At least 2 replicas must stay running
  selector:
    matchLabels:
      app: web-app

---
# Or use maxUnavailable
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-pdb
spec:
  maxUnavailable: 1                  # At most 1 replica can be down
  selector:
    matchLabels:
      app: api-server
```

## Ensuring Pods Survive Node Reboots

Configure your deployments with anti-affinity rules to spread replicas across nodes. This way, a watchdog reboot on one node does not take down all replicas:

```yaml
# deployment-with-spread.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: critical-service
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: critical-service
      containers:
      - name: app
        image: critical-service:latest
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
```

## Fast Node Rejoin After Watchdog Reboot

When a node reboots from a watchdog trigger, you want it to rejoin the cluster as quickly as possible. Talos Linux helps here because the immutable OS boots fast and all configuration is already defined.

Optimize the boot process:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # Faster boot
      - quiet                           # Reduce console output during boot
      - loglevel=3                      # Only show errors
```

Ensure kubelet reconnects quickly:

```yaml
machine:
  kubelet:
    extraArgs:
      node-status-update-frequency: "5s"  # Report status immediately
```

## Monitoring Recovery Events

Track watchdog-triggered recoveries to identify patterns and root causes:

```yaml
# watchdog-monitor-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: recovery-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: recovery-monitor
  template:
    metadata:
      labels:
        app: recovery-monitor
    spec:
      containers:
      - name: monitor
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          # Check for recent watchdog events in dmesg
          if dmesg | grep -qi "watchdog\|soft lockup\|hard lockup\|hung_task"; then
            echo "WATCHDOG EVENT DETECTED"
            # Send to your alerting system
            # curl -X POST http://alertmanager:9093/api/v1/alerts ...
          fi

          # Monitor uptime for unexpected reboots
          UPTIME=$(cat /proc/uptime | cut -d' ' -f1 | cut -d'.' -f1)
          if [ "$UPTIME" -lt "300" ]; then
            echo "NODE RECENTLY REBOOTED - uptime: ${UPTIME}s"
            # Alert on recent reboots
          fi

          sleep infinity
```

## Setting Up Alerting for Watchdog Events

Create Prometheus alerts for watchdog-related events:

```yaml
# watchdog-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: watchdog-alerts
  namespace: monitoring
spec:
  groups:
  - name: watchdog-recovery
    rules:
    - alert: NodeRecentlyRebooted
      expr: time() - node_boot_time_seconds < 300
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.instance }} rebooted recently"
        description: "Node has been up for less than 5 minutes"

    - alert: FrequentNodeReboots
      expr: changes(node_boot_time_seconds[24h]) > 2
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.instance }} has rebooted multiple times"
        description: "More than 2 reboots in 24 hours suggests a recurring issue"

    - alert: NodeNotReadyTooLong
      expr: kube_node_status_condition{condition="Ready",status="true"} == 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} has been NotReady for over 10 minutes"
```

## Testing Auto-Recovery

Test your recovery setup in a staging environment. Verify each layer independently:

```bash
# Test 1: Pod-level recovery
kubectl delete pod critical-service-xxxxx
# Verify: New pod starts within 30 seconds

# Test 2: Node drain (simulates graceful reboot)
kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data
# Verify: Pods are rescheduled to other nodes

# Test 3: Watchdog-triggered reboot (controlled test on non-production)
# WARNING: This will reboot the node
talosctl reboot --nodes staging-node-1
# Verify: Node comes back, pods are rescheduled or restarted

# Test 4: Verify recovery time
START=$(date +%s)
talosctl reboot --nodes staging-node-1
# Wait for node to be Ready again
kubectl wait --for=condition=Ready node/staging-node-1 --timeout=300s
END=$(date +%s)
echo "Recovery time: $((END - START)) seconds"
```

## Best Practices for Auto-Recovery

1. Always run multiple replicas of critical services across different nodes
2. Set PDBs to maintain minimum availability during reboots
3. Monitor reboot frequency and alert on excessive reboots
4. Investigate the root cause of every watchdog event
5. Test recovery procedures regularly in staging
6. Keep watchdog timeouts reasonable (60-120 seconds for hardware, 120 seconds for hung tasks)
7. Use `nowayout=1` on production watchdog configurations

## Conclusion

Auto-recovery with watchdog timers on Talos Linux creates infrastructure that heals itself without human intervention. By combining hardware watchdog, software watchdog, Kubernetes health management, and proper workload distribution, you build a system where node-level failures are automatically detected and recovered from within minutes. The key is layering multiple recovery mechanisms so that no single type of failure can cause a permanent outage. Monitor your recovery events, investigate root causes, and continuously improve your configuration based on real-world failure patterns.
