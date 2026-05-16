# How to Set Up a Talos Linux Cluster with Docker for Local Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Docker, Local Development, Kubernetes, Testing

Description: Spin up a full Talos Linux Kubernetes cluster locally using Docker containers for fast testing and development.

---

Sometimes you need a Kubernetes cluster right now, without the overhead of provisioning VMs or bare metal. Talos Linux supports running inside Docker containers, giving you a fully functional cluster on your workstation in under five minutes. This is perfect for testing configurations, developing Kubernetes applications, or learning how Talos works.

## How It Works

When you run Talos in Docker, each "node" is a Docker container running the Talos Linux userspace. The containers use the host's kernel (as Docker containers do), but the Talos components - apid, machined, containerd, kubelet - all run inside the container just like they would on a real machine.

The result is a cluster that behaves almost identically to a bare metal or VM-based Talos cluster. You can use talosctl, kubectl, and all the standard tools against it.

## Prerequisites

You need:

- Docker Desktop (macOS/Windows) or Docker Engine (Linux) installed and running
- `talosctl` installed on your workstation
- `kubectl` installed on your workstation
- At least 4 GB of free RAM (more for multi-node clusters)

```bash
# Verify Docker is running

docker info

# Verify talosctl is installed
talosctl version --client

# Verify kubectl is installed
kubectl version --client
```

## Creating a Simple Cluster

The `talosctl cluster create docker` command handles everything:

```bash
# Create a single-node cluster
talosctl cluster create docker --name local-test --workers 0
```

This command:

1. Pulls the Talos container image
2. Creates a Docker network for the cluster
3. Starts a control plane container
4. Generates and applies the machine configuration
5. Bootstraps Kubernetes
6. Configures your talosconfig and kubeconfig

After about 2-3 minutes, you have a working cluster:

```bash
# Check it worked
kubectl get nodes
# NAME                          STATUS   ROLES           AGE   VERSION
# local-test-controlplane-1     Ready    control-plane   2m    v1.36.x
```

## Multi-Node Clusters

For testing scheduling behavior, create a multi-node cluster:

```bash
# One control plane node and two workers
talosctl cluster create docker \
  --name scheduling-test \
  --workers 2
```

This takes a bit longer but gives you a realistic multi-node cluster for workload placement. The control plane node runs etcd, and worker nodes join for scheduling.

```bash
# See all the Docker containers
docker ps --filter "name=scheduling-test"

# Check the Kubernetes nodes
kubectl get nodes
```

## Customizing the Cluster

### Specifying Versions

Pin the Talos and Kubernetes versions:

```bash
# Use specific versions
talosctl cluster create docker \
  --name version-test \
  --image ghcr.io/siderolabs/talos:v1.13.0 \
  --kubernetes-version 1.36.0
```

### Custom Machine Configuration Patches

Apply configuration patches just like you would with a regular cluster:

```bash
# Create a patch file
cat > /tmp/test-patch.yaml << 'EOF'
cluster:
  allowSchedulingOnControlPlanes: true
machine:
  kubelet:
    extraArgs:
      max-pods: "200"
EOF

# Create cluster with the patch
talosctl cluster create docker \
  --name custom-test \
  --config-patch @/tmp/test-patch.yaml
```

### Adjusting Resources

Control how much resources each node gets:

```bash
# Set CPU and memory limits for nodes
talosctl cluster create docker \
  --name resource-test \
  --cpus-controlplanes 4 \
  --cpus-workers 2 \
  --memory-controlplanes 4096 \
  --memory-workers 2048 \
  --workers 1
```

The memory values accept megabytes or gigabytes.

### Custom Network Settings

```bash
# Use a specific CIDR for the Docker network
talosctl cluster create docker \
  --name net-test \
  --subnet 172.30.0.0/24
```

## Working with the Cluster

Once the cluster is running, interact with it normally:

```bash
# Use talosctl
talosctl service --nodes 10.5.0.2

# View logs
talosctl logs kubelet --nodes 10.5.0.2

# Deploy workloads
kubectl create deployment nginx --image=nginx:alpine
kubectl expose deployment nginx --port=80 --type=NodePort
kubectl get pods
```

### Accessing Services

Services exposed via NodePort are accessible through the Docker container's IP:

```bash
# Find the node port
kubectl get svc nginx -o jsonpath='{.spec.ports[0].nodePort}'

# Find the node IP
kubectl get nodes -o wide

# Access the service
curl http://<node-ip>:<node-port>
```

On Docker Desktop for macOS or Windows, container IPs might not be directly reachable from the host. In that case, expose the ports you need when creating the cluster with `--exposed-ports`.

For LoadBalancer services, you will need something like MetalLB since there is no cloud load balancer in a local setup.

## Running Multiple Clusters

You can run several Docker-based Talos clusters simultaneously:

```bash
# Create cluster A
talosctl cluster create docker --name cluster-a --workers 0

# Create cluster B
talosctl cluster create docker --name cluster-b --workers 0

# List running clusters
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "cluster-a|cluster-b"

# Switch between them using kubectl contexts
kubectl config get-contexts
kubectl config use-context admin@cluster-a
kubectl config use-context admin@cluster-b
```

Each cluster gets its own Docker network, so they do not interfere with each other.

## Testing Configuration Changes

Docker clusters are great for testing machine configuration changes before applying them to production:

```bash
# Create a test cluster
talosctl cluster create docker --name config-test --workers 0

# Try applying a configuration change
talosctl patch machineconfig --nodes 10.5.0.2 \
  --patch '[{"op": "add", "path": "/machine/network/nameservers", "value": ["1.1.1.1", "8.8.8.8"]}]'

# Verify the change took effect
talosctl get machineconfig --nodes 10.5.0.2 -o yaml | grep -A3 nameservers
```

If the change causes problems, just destroy the cluster and start over. Nothing is lost.

## Testing Upgrades

Talos OS upgrades are not supported in Docker mode. The Docker platform runs Talos as containers, so upgrade and reset APIs do not apply the way they do on installed machines. To test a different Talos version, create a fresh Docker cluster with the target image:

```bash
# Create a cluster running a specific version
talosctl cluster create docker \
  --name upgrade-test \
  --image ghcr.io/siderolabs/talos:v1.13.0 \
  --workers 0

# Verify the version
talosctl version --nodes 10.5.0.2
```

## Limitations of Docker-Based Clusters

While Docker clusters are very useful, they have some limitations:

- **Networking**: The container shares the host kernel and uses Docker networking. Advanced networking features like VLAN tagging or custom network interfaces behave differently than on real hardware.
- **Performance**: Container overhead means performance is not representative of bare metal.
- **Disk**: There is no real disk installation. Talos runs from the container image directly.
- **VIP**: Virtual IP functionality does not work in Docker mode.
- **Hardware features**: Obviously, no access to real hardware like GPUs, NICs, or storage controllers.

For anything involving network configuration, disk layout, or hardware-specific features, test on VMs or bare metal.

## Destroying Clusters

When you are done with a Docker cluster:

```bash
# Destroy a specific cluster
talosctl cluster destroy --name local-test

# This removes all Docker containers and networks for that cluster
```

If you want to clean up everything:

```bash
# List all Talos-related containers
docker ps -a --filter "label=talos.owned=true"

# Remove them if needed
docker rm -f $(docker ps -a --filter "label=talos.owned=true" -q)
```

## Quick Reference

```bash
# Create a basic cluster
talosctl cluster create docker --name test --workers 0

# Create a multi-node cluster
talosctl cluster create docker --name test --workers 2

# Destroy a cluster
talosctl cluster destroy --name test

# List Docker containers for a cluster
docker ps --filter "name=test"
```

Docker-based Talos clusters are one of the fastest ways to get a Kubernetes environment running. They are ideal for learning, testing, and development workflows where you need quick iteration cycles without the overhead of managing VMs or physical hardware.
