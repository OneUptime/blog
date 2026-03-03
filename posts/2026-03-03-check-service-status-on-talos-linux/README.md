# How to Check Service Status on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Service Status, Monitoring, Kubernetes, Troubleshooting

Description: Learn how to check the status of system services on Talos Linux nodes using talosctl commands and understand what each status indicator means.

---

When something is not working right on a Talos Linux cluster, the first thing you need to do is check the status of your services. Unlike traditional Linux where you would SSH in and run `systemctl status`, Talos Linux uses the `talosctl` tool to query service states remotely through the Talos API. This guide covers everything you need to know about checking service status on Talos Linux.

## The Basics: Listing All Services

The most fundamental command for checking services is:

```bash
# List all services on a node
talosctl services -n <node-ip>
```

This gives you a table showing every service, its current state, and its health status. A healthy control plane node looks like this:

```
SERVICE          STATE     HEALTH   LAST CHANGE
apid             Running   OK       5d2h ago
containerd       Running   OK       5d2h ago
cri              Running   OK       5d2h ago
etcd             Running   OK       5d2h ago
kubelet          Running   OK       5d2h ago
machined         Running   ?        5d2h ago
trustd           Running   OK       5d2h ago
udevd            Running   OK       5d2h ago
```

A healthy worker node will show the same services except etcd.

## Checking Individual Service Status

For detailed information about a specific service:

```bash
# Get detailed status of a single service
talosctl service kubelet -n <node-ip>
```

The output includes:

- Current state
- Health status
- Events history
- Last state change timestamp

```bash
# Example output:
# NODE        SERVICE   STATE     HEALTH   LAST CHANGE
# 10.0.0.1    kubelet   Running   OK       5d2h ago
#
# Events:
# STATE      HEALTH    TIMESTAMP
# Running    OK        2026-02-26T10:15:30Z
# Preparing  ?         2026-02-26T10:15:28Z
# Waiting    ?         2026-02-26T10:15:25Z
```

## Understanding Service States

Each service can be in one of these states:

### Running
The service is active and operational. This is the normal state for long-running services.

```bash
# Verify a service is running
talosctl service etcd -n <control-plane-ip>
# STATE: Running means everything is fine
```

### Waiting
The service is waiting for its dependencies to become ready. For example, kubelet waits for containerd, and etcd waits for networking.

```bash
# If kubelet shows Waiting, check its dependencies
talosctl service kubelet -n <node-ip>
# Then check containerd
talosctl service containerd -n <node-ip>
```

### Preparing
The service is initializing. This is a transient state during startup. If a service stays in Preparing for more than a few minutes, something is wrong.

### Pre
The service is running pre-start tasks. Again, this should be brief.

### Stopping
The service is shutting down gracefully. You see this during reboots or upgrades.

### Finished
The service completed its task and exited. This applies to one-shot services that run a task and then stop.

### Failed
The service encountered an error and stopped. This needs investigation.

```bash
# If a service shows Failed, check its logs
talosctl logs <service-name> -n <node-ip>
```

## Understanding Health Status

Health status is separate from the service state. A service can be Running but not healthy.

- **OK** - The service is healthy and functioning correctly
- **?** (Unknown) - Health status is unknown or health checks are not configured
- **Error** - Health checks are failing

```bash
# Check health across all nodes at once
talosctl health -n <node-ip>

# This runs a comprehensive health check including:
# - Service status
# - etcd health
# - Kubernetes API availability
# - Node readiness
```

## Checking Services Across Multiple Nodes

You can query multiple nodes at once:

```bash
# Check services on all control plane nodes
talosctl services -n 10.0.0.1,10.0.0.2,10.0.0.3

# Or use a endpoints file
talosctl services -e <endpoint> -n 10.0.0.1,10.0.0.2,10.0.0.3
```

Build a comprehensive status report:

```bash
#!/bin/bash
# cluster-service-status.sh

CONTROL_PLANE=("10.0.0.1" "10.0.0.2" "10.0.0.3")
WORKERS=("10.0.0.11" "10.0.0.12" "10.0.0.13" "10.0.0.14")

echo "=== Control Plane Service Status ==="
for ip in "${CONTROL_PLANE[@]}"; do
    echo ""
    echo "Node: $ip"
    talosctl services -n "$ip" 2>/dev/null || echo "  UNREACHABLE"
done

echo ""
echo "=== Worker Node Service Status ==="
for ip in "${WORKERS[@]}"; do
    echo ""
    echo "Node: $ip"
    talosctl services -n "$ip" 2>/dev/null || echo "  UNREACHABLE"
done
```

## Checking Kubernetes Component Status

Beyond Talos system services, you also need to check the Kubernetes components that run as static pods:

```bash
# Check kube-apiserver
talosctl service kube-apiserver -n <control-plane-ip> 2>/dev/null

# If the above does not work, check via logs
talosctl logs kube-apiserver -n <control-plane-ip> | tail -20

# Check kube-controller-manager
talosctl logs kube-controller-manager -n <control-plane-ip> | tail -20

# Check kube-scheduler
talosctl logs kube-scheduler -n <control-plane-ip> | tail -20
```

Also check through kubectl:

```bash
# Check node status from the Kubernetes perspective
kubectl get nodes

# Check system pods
kubectl get pods -n kube-system

# Check component health (deprecated but still useful)
kubectl get componentstatuses 2>/dev/null
```

## Checking etcd Health

etcd deserves special attention because it is the most critical component:

```bash
# etcd service status
talosctl service etcd -n <control-plane-ip>

# etcd cluster status
talosctl etcd status -n <control-plane-ip>

# etcd member list
talosctl etcd members -n <control-plane-ip>

# etcd alarms
talosctl etcd alarm list -n <control-plane-ip>
```

The etcd status command shows:

- Database size
- Leader information
- Raft term and index
- Revision number

```bash
# If etcd shows issues, check for fragmentation
# Large DB size relative to actual data suggests fragmentation
talosctl etcd status -n <control-plane-ip>
```

## Monitoring Service Status Continuously

For real-time monitoring during maintenance or troubleshooting:

```bash
# Watch services on a node (poll every 5 seconds)
watch -n 5 "talosctl services -n <node-ip>"

# Watch for node status changes
kubectl get nodes -w

# Watch for pod events
kubectl get events --sort-by='.lastTimestamp' -w
```

## Creating a Status Dashboard Script

Build a comprehensive status check that gives you a quick overview:

```bash
#!/bin/bash
# cluster-status-dashboard.sh

CP_IP="10.0.0.1"

echo "=========================================="
echo "  Cluster Status Dashboard"
echo "  $(date)"
echo "=========================================="

echo ""
echo "--- Talos Services (Control Plane) ---"
talosctl services -n "$CP_IP"

echo ""
echo "--- etcd Status ---"
talosctl etcd status -n "$CP_IP" 2>/dev/null || echo "etcd: UNAVAILABLE"

echo ""
echo "--- Kubernetes Nodes ---"
kubectl get nodes -o wide 2>/dev/null || echo "API server: UNAVAILABLE"

echo ""
echo "--- System Pods ---"
kubectl get pods -n kube-system 2>/dev/null

echo ""
echo "--- Recent Events ---"
kubectl get events --sort-by='.lastTimestamp' -A 2>/dev/null | tail -10

echo ""
echo "--- Resource Usage ---"
kubectl top nodes 2>/dev/null || echo "Metrics server not available"

echo ""
echo "=========================================="
```

## Using the Talos Health Command

The `talosctl health` command is a comprehensive health check that validates multiple aspects:

```bash
# Run a full health check
talosctl health -n <control-plane-ip>

# With a timeout for slow clusters
talosctl health -n <control-plane-ip> --wait-timeout 5m

# The command checks:
# 1. All Talos services are running
# 2. etcd cluster is healthy
# 3. Kubernetes API is accessible
# 4. All nodes are ready
# 5. DNS is working
# 6. All system pods are running
```

If `talosctl health` passes, your cluster is in good shape. If it fails, it tells you exactly which check failed.

## Checking Service Configuration

Sometimes the issue is not that a service is down, but that it is misconfigured:

```bash
# View the machine configuration that controls services
talosctl get machineconfig -n <node-ip> -o yaml

# Check specific configuration sections
talosctl get kubeletconfig -n <node-ip> -o yaml

# Check network configuration
talosctl get addresses -n <node-ip>
talosctl get routes -n <node-ip>
```

## Integrating with External Monitoring

For production clusters, integrate service status checks with your monitoring system:

```yaml
# prometheus-talos-probe.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: talos-service-check
  namespace: monitoring
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checker
            image: ghcr.io/siderolabs/talosctl:v1.9.0
            command:
            - /bin/sh
            - -c
            - |
              for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
                HEALTH=$(talosctl health -n "$node" --wait-timeout 30s 2>&1)
                if [ $? -ne 0 ]; then
                  echo "UNHEALTHY: $node"
                  # Send alert
                fi
              done
          restartPolicy: OnFailure
```

## Conclusion

Checking service status on Talos Linux is straightforward once you know the commands. The `talosctl services` command gives you a quick overview, `talosctl service <name>` provides details on individual services, and `talosctl health` runs a comprehensive check. Make these commands part of your daily routine, and automate them for continuous monitoring. When something goes wrong, start with service status, then move to logs for the specific service that is having trouble. The structured nature of Talos services makes troubleshooting much more predictable than on traditional Linux systems.
