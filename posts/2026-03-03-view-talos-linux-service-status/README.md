# How to View Talos Linux Service Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Service Management, Troubleshooting, Talosctl

Description: Learn how to view and interpret service status on Talos Linux nodes using talosctl services and related commands.

---

Talos Linux runs several system services that together form the foundation of your Kubernetes cluster. Unlike traditional Linux distributions where you might use systemctl to check service status, Talos uses its own API-driven approach. The `talosctl services` command is your primary tool for understanding what is running on each node and whether those services are healthy.

## Understanding Talos Linux Services

Talos Linux manages its own set of services outside of Kubernetes. These are the foundational services that make the Kubernetes cluster possible:

- **apid** - The Talos API server that handles talosctl commands
- **machined** - The main Talos service that manages machine configuration and lifecycle
- **trustd** - Handles certificate distribution between nodes
- **etcd** - The distributed key-value store (control plane nodes only)
- **kubelet** - The Kubernetes node agent
- **containerd** - The container runtime

Each of these services has a lifecycle managed by Talos, and you can inspect their status at any time.

## Listing All Services

```bash
# Show all services on a node
talosctl services --nodes <node-ip>
```

This produces output similar to:

```text
NODE        SERVICE      STATE     HEALTH   LAST CHANGE
10.0.0.1    apid         Running   OK       5h30m ago
10.0.0.1    containerd   Running   OK       5h30m ago
10.0.0.1    cri          Running   OK       5h30m ago
10.0.0.1    etcd         Running   OK       5h29m ago
10.0.0.1    kubelet      Running   OK       5h28m ago
10.0.0.1    machined     Running   ?        5h30m ago
10.0.0.1    trustd       Running   OK       5h30m ago
10.0.0.1    udevd        Running   OK       5h30m ago
```

## Understanding Service States

Each service has a state and a health indicator:

### States

- **Running** - The service is actively running
- **Starting** - The service is in the process of starting up
- **Stopping** - The service is shutting down
- **Finished** - The service completed its task (for one-shot services)
- **Failed** - The service encountered an error
- **Waiting** - The service is waiting for a dependency

### Health

- **OK** - The health check passed
- **?** - No health check is configured for this service
- **Error text** - The health check failed with a specific error

## Checking Services on Multiple Nodes

```bash
# Check services across all control plane nodes
talosctl services --nodes 10.0.0.1,10.0.0.2,10.0.0.3
```

This shows services for all specified nodes in a single table, making it easy to compare.

## Checking a Specific Service

If you are interested in one particular service:

```bash
# Get detailed information about etcd
talosctl service etcd --nodes <node-ip>
```

This gives more detailed output including:

- Current state
- Health status
- Events history
- Container ID (for containerized services)

## Viewing Service Logs

When a service is unhealthy or failing, the logs tell you why:

```bash
# View logs for the etcd service
talosctl logs etcd --nodes <node-ip>

# View logs for kubelet
talosctl logs kubelet --nodes <node-ip>

# Follow logs in real time (like tail -f)
talosctl logs etcd --nodes <node-ip> --follow
```

## Common Service Issues and Troubleshooting

### etcd Not Starting

If etcd shows as Starting or Failed:

```bash
# Check etcd logs for errors
talosctl logs etcd --nodes <node-ip>
```

Common causes:

- Certificate issues (check trustd service)
- Disk space exhaustion
- Network connectivity problems between control plane nodes
- A previous cluster bootstrap that left state behind

```bash
# Check disk usage
talosctl get systemstat --nodes <node-ip>
```

### kubelet Not Healthy

```bash
# Check kubelet logs
talosctl logs kubelet --nodes <node-ip>

# Check if the API server is reachable from this node
talosctl services --nodes <node-ip> | grep kubelet
```

Kubelet issues often come from:

- Inability to reach the Kubernetes API server
- Certificate problems
- Resource pressure (disk or memory)
- Image pull failures for system containers

### containerd Issues

```bash
# Check containerd logs
talosctl logs containerd --nodes <node-ip>
```

Containerd problems usually manifest as pods not starting. Check for:

- Disk space for container images
- Image registry connectivity
- Runtime configuration issues

### apid Not Responding

If you cannot connect to a node with talosctl at all, the apid service might be down. Since you cannot use talosctl to check, you will need to:

1. Check if the machine is running (ping, SSH to another node, cloud console)
2. Check the Talos API port (50000) is open
3. Verify your talosconfig has the correct credentials

```bash
# Test basic connectivity to the Talos API port
nc -zv <node-ip> 50000
```

## Service Dependencies

Talos services have dependencies on each other. Understanding these helps troubleshoot cascading failures:

- **machined** starts first and manages the overall machine lifecycle
- **containerd** needs to be running before most other services
- **trustd** handles certificate distribution, needed by etcd and kubelet
- **etcd** depends on containerd and trustd (control plane only)
- **kubelet** depends on containerd and needs a working API server to fully function
- **apid** handles API requests and is one of the first services to start

If a lower-level service fails, higher-level services that depend on it will also fail. For example, if containerd is down, etcd and kubelet will not work either.

## Comparing Worker and Control Plane Services

Control plane nodes run more services than workers. Here is a typical comparison:

**Control plane node:**
```text
apid, containerd, cri, etcd, kubelet, machined, trustd, udevd
```

**Worker node:**
```text
apid, containerd, cri, kubelet, machined, trustd, udevd
```

The key difference is etcd, which only runs on control plane nodes.

## Monitoring Service Uptime

The "LAST CHANGE" column shows when the service last changed state. If a service recently restarted, this tells you:

```bash
# Check for recently restarted services
talosctl services --nodes <node-ip>
```

If a service shows a recent state change (seconds or minutes ago) when it should have been running for days, that suggests the service is restarting frequently. Check the logs for crash loops.

## Scripting Service Checks

You can use talosctl services output in scripts:

```bash
#!/bin/bash
# check-services.sh - Alert on unhealthy services

NODES="10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.5"

for node in $NODES; do
    # Check for any non-Running services (except one-shot services)
    UNHEALTHY=$(talosctl services --nodes $node 2>/dev/null | grep -v "Running" | grep -v "NODE" | grep -v "Finished")
    if [ -n "$UNHEALTHY" ]; then
        echo "ALERT: Unhealthy services on $node:"
        echo "$UNHEALTHY"
    fi
done
```

## Using Service Status in Troubleshooting Workflows

When something goes wrong in your cluster, checking service status should be one of your first steps:

```bash
# Step 1: Check services on the problem node
talosctl services --nodes <node-ip>

# Step 2: If a service is failing, check its logs
talosctl logs <service-name> --nodes <node-ip>

# Step 3: Check system resources
talosctl dashboard --nodes <node-ip>

# Step 4: Check kernel messages for hardware or driver issues
talosctl dmesg --nodes <node-ip>
```

This systematic approach helps you quickly narrow down whether the issue is at the service level, the OS level, or the hardware level.

## Conclusion

The `talosctl services` command is your primary tool for understanding what is running on Talos Linux nodes and whether those services are healthy. It replaces the familiar systemctl status workflow from traditional Linux with an API-driven approach that works consistently across all nodes. Combined with `talosctl logs` for detailed investigation, these commands form the foundation of Talos Linux troubleshooting. Make checking service status your first step whenever something in the cluster does not look right.
