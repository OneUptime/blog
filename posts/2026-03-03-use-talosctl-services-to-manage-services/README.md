# How to Use talosctl services to Manage Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Service Management, System Administration, Kubernetes

Description: Learn how to use talosctl services to list, inspect, and manage system services running on your Talos Linux nodes

---

Every Talos Linux node runs a set of system services that keep the operating system and Kubernetes functioning. These include everything from the kernel-level `machined` service that drives the Talos API to the `kubelet` that connects the node to your Kubernetes cluster. The `talosctl services` command gives you full visibility into these services and lets you manage them when needed.

## Understanding Talos Linux Services

Talos Linux does not use systemd, sysvinit, or any other traditional Linux init system. Instead, it uses its own service manager called `machined`. This service manager is purpose-built for running an immutable Kubernetes node and is much simpler than systemd. Services in Talos are either system services (managed by Talos itself) or container-based services (running in containerd).

The core services you will find on a Talos Linux node include:

- **machined**: The main Talos service that handles the API and system management
- **containerd**: The container runtime
- **kubelet**: The Kubernetes node agent
- **etcd**: The distributed key-value store (control plane nodes only)
- **apid**: The API daemon that handles talosctl requests
- **trustd**: Handles certificate management between nodes

## Listing All Services

To see all services running on a node:

```bash
# List all services on a node
talosctl services --nodes 192.168.1.10
```

The output shows each service along with its state:

```
SERVICE      STATE     HEALTH   LAST CHANGE
apid         Running   OK       5h30m ago
containerd   Running   OK       5h30m ago
cri          Running   OK       5h30m ago
etcd         Running   OK       5h28m ago
kubelet      Running   OK       5h28m ago
machined     Running   ?        5h30m ago
trustd       Running   OK       5h30m ago
udevd        Running   OK       5h30m ago
```

The STATE column tells you whether the service is running, stopped, or in an error state. The HEALTH column indicates whether the service is passing its health checks. The LAST CHANGE column shows when the service last changed state.

## Checking a Specific Service

To get detailed information about a specific service:

```bash
# Get details about the kubelet service
talosctl services kubelet --nodes 192.168.1.10
```

This shows more detailed information including the service's process ID, uptime, and any recent events:

```bash
# Check etcd service details on a control plane node
talosctl services etcd --nodes 192.168.1.10

# Check containerd status
talosctl services containerd --nodes 192.168.1.10
```

## Checking Services Across Multiple Nodes

You can check services across your entire cluster at once:

```bash
# Check services on all control plane nodes
talosctl services --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Check services on all worker nodes
talosctl services --nodes 192.168.1.20,192.168.1.21,192.168.1.22
```

This is helpful for quickly identifying if a service is down on any node in your cluster.

## Monitoring Service Health

The health status of services is crucial for understanding node health:

```bash
#!/bin/bash
# service-health-check.sh - Check service health across the cluster

ALL_NODES="192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21"

echo "Checking service health across all nodes..."
OUTPUT=$(talosctl services --nodes "$ALL_NODES" 2>&1)

# Check for any services that are not in Running state
if echo "$OUTPUT" | grep -v "Running" | grep -v "SERVICE" | grep -v "^$" > /dev/null 2>&1; then
  echo "WARNING: Some services are not in Running state:"
  echo "$OUTPUT" | grep -v "Running" | grep -v "SERVICE"
  exit 1
fi

echo "All services are running normally"
```

## Restarting Services

If a service is misbehaving, you can restart it:

```bash
# Restart the kubelet service
talosctl service kubelet restart --nodes 192.168.1.10

# Restart containerd
talosctl service containerd restart --nodes 192.168.1.10
```

Be careful when restarting services. Restarting `kubelet` will cause the node to temporarily leave the Kubernetes cluster. Restarting `containerd` will stop all containers on the node. Restarting `etcd` on a control plane node can briefly impact cluster operations.

## Stopping and Starting Services

You can also stop and start individual services:

```bash
# Stop the kubelet (this will take the node out of the Kubernetes cluster)
talosctl service kubelet stop --nodes 192.168.1.20

# Start the kubelet again
talosctl service kubelet start --nodes 192.168.1.20
```

Stopping a service is useful when you need to troubleshoot without a service interfering, or when you want to perform maintenance on a specific component.

## Viewing Service Logs

To understand why a service is not healthy, check its logs:

```bash
# View kubelet logs
talosctl logs kubelet --nodes 192.168.1.10

# Follow kubelet logs in real time
talosctl logs kubelet --nodes 192.168.1.10 -f

# View the last 100 lines of etcd logs
talosctl logs etcd --nodes 192.168.1.10 --tail 100

# View logs for a specific time range
talosctl logs kubelet --nodes 192.168.1.10 --since 1h
```

Combining service status checks with log inspection gives you a complete picture of what is happening on the node.

## Comparing Control Plane and Worker Services

Control plane nodes and worker nodes run different sets of services:

```bash
# Services on a control plane node
echo "=== Control Plane Node ==="
talosctl services --nodes 192.168.1.10
# Expect to see: apid, containerd, cri, etcd, kubelet, machined, trustd, udevd

echo ""
echo "=== Worker Node ==="
talosctl services --nodes 192.168.1.20
# Expect to see: apid, containerd, cri, kubelet, machined, trustd, udevd
# Note: no etcd on worker nodes
```

The main difference is that worker nodes do not run etcd. Everything else should be the same.

## Using Services in Health Checks

Incorporate service checks into your cluster health monitoring:

```bash
#!/bin/bash
# cluster-service-monitor.sh

CONTROL_PLANE="192.168.1.10 192.168.1.11 192.168.1.12"
WORKERS="192.168.1.20 192.168.1.21 192.168.1.22"

REQUIRED_CP_SERVICES="apid containerd cri etcd kubelet machined trustd"
REQUIRED_WORKER_SERVICES="apid containerd cri kubelet machined trustd"

check_services() {
  local node=$1
  local required_services=$2
  local role=$3

  services_output=$(talosctl services --nodes "$node" 2>&1)

  for svc in $required_services; do
    if ! echo "$services_output" | grep "$svc" | grep "Running" > /dev/null; then
      echo "ALERT: $svc is not running on $role node $node"
      return 1
    fi
  done

  echo "OK: All required services running on $role node $node"
  return 0
}

# Check control plane nodes
for node in $CONTROL_PLANE; do
  check_services "$node" "$REQUIRED_CP_SERVICES" "control-plane"
done

# Check worker nodes
for node in $WORKERS; do
  check_services "$node" "$REQUIRED_WORKER_SERVICES" "worker"
done
```

## Troubleshooting Common Service Issues

### Kubelet Not Starting

If kubelet fails to start, it is often a configuration or certificate issue:

```bash
# Check kubelet logs for errors
talosctl logs kubelet --nodes 192.168.1.20 | tail -50

# Common issues:
# - Certificate problems
# - Unable to reach the API server
# - Configuration errors
```

### etcd Not Healthy

etcd health issues can cascade to the entire cluster:

```bash
# Check etcd service details
talosctl services etcd --nodes 192.168.1.10

# Check etcd logs
talosctl logs etcd --nodes 192.168.1.10 | tail -50

# Verify etcd members
talosctl etcd members --nodes 192.168.1.10
```

### Containerd Issues

If containers are not starting, check containerd:

```bash
# Check containerd status
talosctl services containerd --nodes 192.168.1.10

# View containerd logs
talosctl logs containerd --nodes 192.168.1.10 | tail -50

# List running containers
talosctl containers --nodes 192.168.1.10
```

## Service Recovery Patterns

When a service keeps crashing, follow this pattern:

```bash
# 1. Check the service status
talosctl services kubelet --nodes 192.168.1.20

# 2. Check the logs for errors
talosctl logs kubelet --nodes 192.168.1.20 | tail -100

# 3. Check system resources (maybe the node is out of memory)
talosctl memory --nodes 192.168.1.20

# 4. Try restarting the service
talosctl service kubelet restart --nodes 192.168.1.20

# 5. If restart does not help, check if a node reboot resolves the issue
talosctl reboot --nodes 192.168.1.20
```

## Best Practices

- Check service status as part of your regular cluster health checks.
- Set up automated monitoring that alerts you when any service leaves the Running state.
- Always check service logs before restarting a service to understand the root cause.
- Be cautious with restarting services on control plane nodes, as it can impact cluster availability.
- Document the expected services for each node role in your runbook.
- Use the `--nodes` flag to target specific nodes rather than relying on the default context.
- When troubleshooting, start by listing services before diving into logs to get the big picture.

The `talosctl services` command is your window into the health of every Talos Linux node. Regular monitoring and quick response to service issues keep your cluster running reliably.
