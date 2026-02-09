# How to Use crictl to Debug Container Runtime Issues on Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, crictl, Debugging, Container Runtime, containerd

Description: Learn how to use crictl CLI tool to debug container runtime issues on Kubernetes nodes, inspect containers, and troubleshoot pod failures at the CRI level.

---

While kubectl provides a high-level interface for managing Kubernetes workloads, crictl offers direct access to the container runtime interface (CRI). This makes it invaluable for debugging issues that occur below the Kubernetes abstraction layer, such as container startup failures, image pull problems, and runtime configuration issues.

## What is crictl?

crictl is a command-line tool for interacting with CRI-compatible container runtimes like containerd and CRI-O. It was created by the Kubernetes project to provide a debugging tool that works across different container runtimes without being tied to Docker's CLI.

When kubectl commands fail or pods won't start, crictl helps you inspect what's happening at the container runtime level, often revealing issues that aren't visible through kubectl.

## Installing and Configuring crictl

Most modern Kubernetes distributions include crictl by default. Verify installation:

```bash
crictl --version
```

If not installed, download it manually:

```bash
VERSION="v1.29.0"
wget https://github.com/kubernetes-sigs/cri-tools/releases/download/$VERSION/crictl-$VERSION-linux-amd64.tar.gz
sudo tar zxvf crictl-$VERSION-linux-amd64.tar.gz -C /usr/local/bin
rm -f crictl-$VERSION-linux-amd64.tar.gz
```

Configure crictl to work with your runtime:

```bash
# For containerd (default on most systems)
cat <<EOF | sudo tee /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false
EOF

# For CRI-O
cat <<EOF | sudo tee /etc/crictl.yaml
runtime-endpoint: unix:///var/run/crio/crio.sock
image-endpoint: unix:///var/run/crio/crio.sock
timeout: 10
debug: false
EOF
```

You can also set these as environment variables:

```bash
export CONTAINER_RUNTIME_ENDPOINT=unix:///run/containerd/containerd.sock
export IMAGE_SERVICE_ENDPOINT=unix:///run/containerd/containerd.sock
```

## Listing and Inspecting Containers

The basic workflow mirrors Docker commands but provides CRI-specific information:

```bash
# List running containers
sudo crictl ps

# List all containers (including stopped)
sudo crictl ps -a

# Filter by pod name
sudo crictl ps --name nginx

# Filter by pod sandbox ID
sudo crictl ps --pod <pod-id>

# Show detailed output
sudo crictl ps -v
```

Inspect a specific container for detailed information:

```bash
# Get container ID
CONTAINER_ID=$(sudo crictl ps --name myapp -q | head -1)

# Inspect container
sudo crictl inspect $CONTAINER_ID

# View specific fields with jq
sudo crictl inspect $CONTAINER_ID | jq '.info.pid'
sudo crictl inspect $CONTAINER_ID | jq '.status.labels'
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.linux.resources'
```

## Debugging Container Startup Failures

When a container fails to start, crictl reveals details kubectl doesn't show:

```bash
# Find failed containers
sudo crictl ps -a --state Exited

# Get the container that keeps restarting
CONTAINER_ID=$(sudo crictl ps -a --name myapp --state Exited -q | head -1)

# View detailed status
sudo crictl inspect $CONTAINER_ID | jq '.status'

# Check the exit code and reason
sudo crictl inspect $CONTAINER_ID | jq '.status.exitCode'
sudo crictl inspect $CONTAINER_ID | jq '.status.reason'
sudo crictl inspect $CONTAINER_ID | jq '.status.message'

# View container logs
sudo crictl logs $CONTAINER_ID

# View last 50 lines with timestamps
sudo crictl logs --tail=50 --timestamps $CONTAINER_ID
```

For containers that fail before logging:

```bash
# Check container creation info
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.process'

# Verify environment variables
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.process.env'

# Check working directory
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.process.cwd'

# Inspect mounts
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.mounts[]'
```

## Working with Pod Sandboxes

Kubernetes pods run in sandboxes that provide shared namespaces. Understanding sandboxes is key to debugging networking and IPC issues:

```bash
# List all pod sandboxes
sudo crictl pods

# List pods in a specific namespace
sudo crictl pods --namespace default

# Get pod sandbox details
POD_ID=$(sudo crictl pods --name nginx-app -q)
sudo crictl inspectp $POD_ID

# Check pod network configuration
sudo crictl inspectp $POD_ID | jq '.status.network'

# View pod IP and additional IPs
sudo crictl inspectp $POD_ID | jq '.status.network.ip'
sudo crictl inspectp $POD_ID | jq '.status.network.additionalIps'

# Check pod labels and annotations
sudo crictl inspectp $POD_ID | jq '.status.labels'
sudo crictl inspectp $POD_ID | jq '.status.annotations'
```

Debug pod sandbox creation failures:

```bash
# Find failed sandboxes
sudo crictl pods --state NotReady

# Inspect the sandbox
sudo crictl inspectp <sandbox-id> | jq '.status.state'

# Check why sandbox failed
sudo crictl inspectp <sandbox-id> | jq '.status.message'

# View sandbox logs (if available)
sudo journalctl -u containerd | grep <sandbox-id>
```

## Image Management and Debugging

crictl provides powerful image inspection and management:

```bash
# List all images
sudo crictl images

# List with detailed information
sudo crictl images -v

# Search for specific images
sudo crictl images | grep nginx

# Inspect an image
sudo crictl inspecti nginx:latest

# View image layers
sudo crictl inspecti nginx:latest | jq '.status.repoDigests'

# Check image size
sudo crictl inspecti nginx:latest | jq '.status.size'
```

Debug image pull failures:

```bash
# Try pulling an image manually
sudo crictl pull nginx:latest

# Pull with authentication
sudo crictl pull --creds username:password private-registry.com/myapp:v1.0

# Pull from specific registry
sudo crictl pull --pod-config pod.json myimage:tag

# View pull progress
sudo crictl pull --debug nginx:latest 2>&1 | tee pull.log
```

Check image pull secrets and authentication:

```bash
# Inspect pod for image pull secrets
sudo crictl inspectp $POD_ID | jq '.info.config.metadata.annotations["io.kubernetes.pod.imagePullSecrets"]'

# Verify containerd registry configuration
sudo cat /etc/containerd/config.toml | grep -A 10 registry

# Test registry connectivity
curl -v https://registry.k8s.io/v2/
```

## Executing Commands in Containers

Execute commands for debugging running containers:

```bash
# Execute a command
sudo crictl exec -it $CONTAINER_ID /bin/sh

# Run a specific command
sudo crictl exec $CONTAINER_ID ps aux

# Execute with environment variables
sudo crictl exec -e VAR=value $CONTAINER_ID env

# Execute as a specific user
sudo crictl exec -u 1000 $CONTAINER_ID id
```

## Monitoring Resource Usage

View real-time resource consumption:

```bash
# Get container stats
sudo crictl stats

# Stats for a specific container
sudo crictl stats $CONTAINER_ID

# Continuous monitoring
sudo crictl stats --watch

# Output stats in JSON
sudo crictl stats -o json | jq '.'
```

Check resource limits and usage:

```bash
# View configured limits
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.linux.resources.memory'
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.linux.resources.cpu'

# Compare with actual usage
sudo crictl stats $CONTAINER_ID -o json | jq '.linux.memory'
sudo crictl stats $CONTAINER_ID -o json | jq '.linux.cpu'
```

## Troubleshooting Common Issues

### Container Keeps Restarting

```bash
# Find the pattern
sudo crictl ps -a --name myapp | head -5

# Check all exit codes
for id in $(sudo crictl ps -a --name myapp -q); do
  echo "Container: $id"
  sudo crictl inspect $id | jq -r '.status.exitCode'
  sudo crictl logs --tail=5 $id
  echo "---"
done

# Look for OOMKilled
sudo crictl inspect $CONTAINER_ID | jq '.status.reason'
```

### Network Connectivity Problems

```bash
# Verify pod has IP
sudo crictl inspectp $POD_ID | jq '.status.network.ip'

# Check network namespace
sudo crictl inspectp $POD_ID | jq '.info.runtimeSpec.linux.namespaces[] | select(.type=="network")'

# Execute network debugging in container
sudo crictl exec $CONTAINER_ID ip addr
sudo crictl exec $CONTAINER_ID ip route
sudo crictl exec $CONTAINER_ID cat /etc/resolv.conf
```

### Volume Mount Issues

```bash
# List all mounts
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.mounts[]'

# Check specific volume
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.mounts[] | select(.destination=="/data")'

# Verify mount exists on host
HOST_PATH=$(sudo crictl inspect $CONTAINER_ID | jq -r '.info.runtimeSpec.mounts[] | select(.destination=="/data") | .source')
ls -la $HOST_PATH

# Check permissions
sudo crictl exec $CONTAINER_ID ls -la /data
```

### Performance Issues

```bash
# Check if container is throttled
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.linux.resources.cpu.quota'
sudo crictl inspect $CONTAINER_ID | jq '.info.runtimeSpec.linux.resources.cpu.period'

# View actual CPU usage
sudo crictl stats $CONTAINER_ID -o json | jq '.linux.cpu.usageCoreNanoSeconds'

# Check memory pressure
sudo crictl stats $CONTAINER_ID -o json | jq '.linux.memory.workingSetBytes'
```

## Advanced Debugging Techniques

Create a debug configuration for testing:

```bash
# Create pod sandbox config
cat > pod-config.json <<EOF
{
  "metadata": {
    "name": "debug-pod",
    "namespace": "default",
    "uid": "debug-pod-uid"
  },
  "linux": {
    "security_context": {
      "namespace_options": {
        "network": 2
      }
    }
  }
}
EOF

# Create container config
cat > container-config.json <<EOF
{
  "metadata": {
    "name": "debug-container"
  },
  "image": {
    "image": "nicolaka/netshoot:latest"
  },
  "command": ["/bin/bash"],
  "args": ["-c", "sleep 3600"]
}
EOF

# Create and start container
POD_ID=$(sudo crictl runp pod-config.json)
CONTAINER_ID=$(sudo crictl create $POD_ID container-config.json pod-config.json)
sudo crictl start $CONTAINER_ID

# Use for debugging
sudo crictl exec -it $CONTAINER_ID /bin/bash
```

## Cleanup and Maintenance

Remove unused resources:

```bash
# Remove stopped containers
sudo crictl rm $(sudo crictl ps -aq --state Exited)

# Remove unused images
sudo crictl rmi --prune

# Stop and remove a specific container
sudo crictl stop $CONTAINER_ID
sudo crictl rm $CONTAINER_ID

# Stop and remove pod sandbox
sudo crictl stopp $POD_ID
sudo crictl rmp $POD_ID
```

## Conclusion

crictl is an essential tool for debugging Kubernetes at the container runtime level. It provides direct access to CRI operations, allowing you to troubleshoot issues that kubectl cannot reach. From inspecting failed containers and debugging image pulls to analyzing resource usage and network configuration, crictl gives you the visibility needed to solve complex container runtime problems.

Understanding crictl complements your kubectl knowledge and enables you to debug the full stack of containerized applications in Kubernetes environments.
