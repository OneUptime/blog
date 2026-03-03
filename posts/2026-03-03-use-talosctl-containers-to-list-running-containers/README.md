# How to Use talosctl containers to List Running Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Containers, Debugging, Kubernetes

Description: Learn how to use talosctl containers to list and inspect running containers on Talos Linux nodes for debugging and monitoring

---

When running Kubernetes on Talos Linux, you sometimes need to see exactly which containers are running on a specific node. Since Talos Linux does not provide SSH access or a shell you can log into, traditional tools like `docker ps` or `crictl ps` are not available directly. The `talosctl containers` command fills this need by giving you a view of all running containers through the Talos API.

## How Containers Work in Talos Linux

Talos Linux uses containerd as its container runtime. All containers on a Talos node, whether they are system containers managed by Talos itself or Kubernetes pod containers managed by kubelet, run through containerd. The `talosctl containers` command queries containerd and returns information about every container on the node.

Containers in Talos Linux fall into two namespaces:

- **system**: Containers that are part of the Talos Linux operating system itself
- **k8s.io**: Containers that are part of Kubernetes pods

Understanding this distinction helps you filter and interpret the output correctly.

## Basic Usage

To list all containers on a node:

```bash
# List all containers on a node
talosctl containers --nodes 192.168.1.10
```

The output includes the container's namespace, ID, image, process ID, and current status:

```
NAMESPACE   ID                                                                 IMAGE                                        PID    STATUS
k8s.io      0a1b2c3d4e5f                                                      registry.k8s.io/pause:3.9                    1234   RUNNING
k8s.io      1b2c3d4e5f6a                                                      registry.k8s.io/coredns/coredns:v1.11.1      1235   RUNNING
system      2c3d4e5f6a7b                                                      ghcr.io/siderolabs/kubelet:v1.30.0           1236   RUNNING
```

## Filtering by Namespace

To see only Kubernetes containers:

```bash
# List only Kubernetes containers
talosctl containers --nodes 192.168.1.10 -k
```

The `-k` flag filters to show only containers in the `k8s.io` namespace, which are the Kubernetes pod containers.

To see only system containers:

```bash
# List only system containers (default namespace)
talosctl containers --nodes 192.168.1.10
```

Without the `-k` flag, you see the system namespace containers by default on some versions. Check your talosctl version for the exact behavior.

## Identifying Containers

The output from `talosctl containers` shows container IDs, which can be cryptic. To understand what each container is doing, look at the IMAGE column:

```bash
# List containers and look at the images
talosctl containers --nodes 192.168.1.10 -k
```

Common images you will see include:

- `registry.k8s.io/pause` - The sandbox container for each pod
- `registry.k8s.io/coredns/coredns` - DNS resolution for the cluster
- `registry.k8s.io/kube-proxy` - Network proxy on each node
- `ghcr.io/siderolabs/kubelet` - The Kubernetes node agent
- Application-specific images from your deployments

## Comparing with kubectl

While `kubectl get pods` shows you the Kubernetes abstraction, `talosctl containers` shows you the actual container runtime reality:

```bash
# Kubernetes view - shows pods and their status
kubectl get pods -A -o wide --field-selector spec.nodeName=worker-1

# Container runtime view - shows actual containers
talosctl containers --nodes 192.168.1.20 -k
```

The container list will always have more entries than the pod list because each pod typically has at least two containers: the pause/sandbox container and the actual application container. Multi-container pods will have even more entries.

## Debugging Container Issues

### Finding Crashed Containers

When a pod is in CrashLoopBackOff, you can check the container status directly:

```bash
# List containers and look for non-RUNNING status
talosctl containers --nodes 192.168.1.20 -k

# You might see entries like:
# NAMESPACE   ID          IMAGE                          PID    STATUS
# k8s.io      abc123      myapp:v1.2.3                  0      STOPPED
```

### Checking Container Resource Usage

Combine the containers list with the stats command to see resource usage:

```bash
# First, list containers to get their IDs
talosctl containers --nodes 192.168.1.20 -k

# Then check stats for all containers
talosctl stats --nodes 192.168.1.20 -k
```

### Investigating Startup Problems

If a container is not starting, check the container list alongside kubelet logs:

```bash
# See if the container even exists
talosctl containers --nodes 192.168.1.20 -k

# Check kubelet logs for errors about the container
talosctl logs kubelet --nodes 192.168.1.20 | grep "my-app"
```

## Monitoring Container Count

Tracking the number of containers on each node helps identify scheduling imbalances:

```bash
#!/bin/bash
# container-count.sh - Count containers per node

NODES="192.168.1.10 192.168.1.11 192.168.1.20 192.168.1.21 192.168.1.22"

echo "Container counts per node:"
echo "========================="

for node in $NODES; do
  count=$(talosctl containers --nodes "$node" -k 2>/dev/null | tail -n +2 | wc -l)
  echo "$node: $count containers"
done
```

If one node has significantly more containers than others, you might have a scheduling imbalance or too many pods with nodeSelector or nodeAffinity targeting that specific node.

## Scripting Container Inspection

Here is a more comprehensive inspection script:

```bash
#!/bin/bash
# inspect-containers.sh - Detailed container inspection

NODE=$1
if [ -z "$NODE" ]; then
  echo "Usage: $0 <node-address>"
  exit 1
fi

echo "=== System Containers on $NODE ==="
talosctl containers --nodes "$NODE"

echo ""
echo "=== Kubernetes Containers on $NODE ==="
talosctl containers --nodes "$NODE" -k

echo ""
echo "=== Container Count Summary ==="
SYSTEM_COUNT=$(talosctl containers --nodes "$NODE" 2>/dev/null | tail -n +2 | wc -l)
K8S_COUNT=$(talosctl containers --nodes "$NODE" -k 2>/dev/null | tail -n +2 | wc -l)
echo "System containers: $SYSTEM_COUNT"
echo "Kubernetes containers: $K8S_COUNT"
echo "Total: $((SYSTEM_COUNT + K8S_COUNT))"
```

## Checking Containers During Upgrades

During node upgrades, containers go through a lifecycle. Monitoring them helps you verify the upgrade is progressing correctly:

```bash
# Before upgrade - record the baseline
echo "Pre-upgrade containers:"
talosctl containers --nodes 192.168.1.20 -k > /tmp/pre-upgrade-containers.txt

# Start the upgrade
talosctl upgrade --nodes 192.168.1.20 --image ghcr.io/siderolabs/installer:v1.7.0

# After the node comes back - check containers
echo "Post-upgrade containers:"
talosctl containers --nodes 192.168.1.20 -k > /tmp/post-upgrade-containers.txt

# Compare
diff /tmp/pre-upgrade-containers.txt /tmp/post-upgrade-containers.txt
```

## Containers vs. Processes

It is useful to understand the difference between `talosctl containers` and `talosctl processes`:

- `talosctl containers` shows containerd containers, which are the isolated workloads running on the node
- `talosctl processes` shows system-level processes, giving you a lower-level view

```bash
# Container-level view
talosctl containers --nodes 192.168.1.10 -k

# Process-level view
talosctl processes --nodes 192.168.1.10
```

For Kubernetes debugging, you usually want the container view. For system-level troubleshooting, the process view might be more helpful.

## Checking for Image Pull Issues

If containers are not starting because of image pull failures, the container might not appear in the list at all. In that case, check kubelet logs:

```bash
# Check if the container exists
talosctl containers --nodes 192.168.1.20 -k | grep my-app

# If not found, check kubelet logs for pull errors
talosctl logs kubelet --nodes 192.168.1.20 | grep -i "pull"
talosctl logs kubelet --nodes 192.168.1.20 | grep -i "error"
```

## Understanding Sandbox Containers

Every Kubernetes pod has a sandbox container (also called the pause container). This container holds the network namespace for the pod and is always present even if the application container is not running:

```bash
# You will see pause containers alongside application containers
talosctl containers --nodes 192.168.1.20 -k | grep pause

# Each pause container corresponds to one pod
# Count pause containers to count pods
talosctl containers --nodes 192.168.1.20 -k | grep pause | wc -l
```

## Best Practices

- Use `talosctl containers` as a complement to `kubectl get pods`, not a replacement. Each gives you a different perspective.
- Check containers during troubleshooting to verify that what Kubernetes reports matches what is actually running.
- Monitor container counts per node to detect scheduling imbalances.
- Combine container listings with stats and logs for a complete debugging picture.
- Use the `-k` flag when you only care about Kubernetes workloads and want to filter out system containers.
- Record container baselines before performing upgrades or maintenance so you can compare afterward.
- When a pod seems stuck, check the container level to see if the container exists, is running, or has stopped.

The `talosctl containers` command gives you direct visibility into the container runtime on your Talos Linux nodes. It is an essential tool for understanding what is actually running versus what Kubernetes thinks is running.
