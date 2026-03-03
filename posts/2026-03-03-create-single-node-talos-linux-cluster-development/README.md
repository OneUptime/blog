# How to Create a Single-Node Talos Linux Cluster for Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Development, Single Node, Local Development

Description: Set up a single-node Talos Linux Kubernetes cluster for local development and testing purposes.

---

Not every Kubernetes environment needs three control plane nodes and a fleet of workers. For development, testing, and learning, a single-node cluster is often the best approach. It is fast to set up, uses minimal resources, and gives you a fully functional Kubernetes environment.

Talos Linux works well for single-node clusters, but it requires a small configuration tweak since Kubernetes normally prevents scheduling workloads on control plane nodes. This guide walks you through the entire process.

## Why a Single-Node Cluster

Single-node clusters make sense in several situations:

- You are learning Kubernetes and want something lightweight
- You need a local environment for testing Helm charts or manifests
- You are developing operators or controllers and need a quick feedback loop
- You want to run a small homelab setup on limited hardware

The trade-off is obvious: no high availability. If the node goes down, everything goes down. For development work, that is perfectly acceptable.

## Choosing Your Platform

For a single-node dev cluster, Docker is usually the easiest option. You can also use a VM through QEMU, VirtualBox, or VMware. We will cover both approaches.

### Option A: Docker (Fastest)

If you have Docker installed on your workstation, you can spin up a Talos cluster without downloading ISOs or creating VMs.

```bash
# Create a single-node cluster using Docker
talosctl cluster create \
  --name dev-cluster \
  --controlplanes 1 \
  --workers 0
```

This command pulls the Talos container image, creates a Docker container acting as a Talos node, generates the configuration, applies it, bootstraps Kubernetes, and gives you a working cluster. The whole process takes about two to three minutes.

After it completes, your kubeconfig is automatically configured:

```bash
# Check the cluster is running
kubectl get nodes

# You should see one node in Ready state
# NAME                      STATUS   ROLES           AGE   VERSION
# dev-cluster-controlplane-1   Ready    control-plane   2m    v1.29.x
```

### Option B: Virtual Machine

If you prefer a VM-based approach, create a VM with at least:

- 2 CPUs
- 4 GB RAM (2 GB minimum, but 4 GB is more comfortable)
- 20 GB disk

Boot the VM with the Talos ISO and note the IP address shown on the console.

## Generating the Configuration for Single-Node

The key to making a single-node cluster work is allowing Kubernetes to schedule pods on the control plane node. By default, control plane nodes have a taint that prevents this.

```bash
# Generate the machine configuration
talosctl gen config dev-cluster https://192.168.1.50:6443 \
  --config-patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'
```

Alternatively, create a patch file:

```yaml
# single-node-patch.yaml
cluster:
  allowSchedulingOnControlPlanes: true
```

And apply it during generation:

```bash
# Generate config with the patch file
talosctl gen config dev-cluster https://192.168.1.50:6443 \
  --config-patch-control-plane @single-node-patch.yaml
```

This patch tells Kubernetes to remove the `node-role.kubernetes.io/control-plane:NoSchedule` taint from the control plane node, allowing your workloads to run there.

## Applying the Configuration

Push the configuration to your node:

```bash
# Apply the control plane config
talosctl apply-config --insecure \
  --nodes 192.168.1.50 \
  --file controlplane.yaml
```

The node will reboot and come back up with Talos installed. Wait about a minute for it to settle.

## Setting Up talosctl Access

Configure your talosctl client:

```bash
# Set the talosconfig
export TALOSCONFIG="$(pwd)/talosconfig"

# Configure the endpoint and default node
talosctl config endpoint 192.168.1.50
talosctl config node 192.168.1.50
```

## Bootstrapping the Cluster

Now bootstrap Kubernetes:

```bash
# Bootstrap - only run this once
talosctl bootstrap
```

Monitor the progress:

```bash
# Watch services start up
talosctl services

# Wait for the cluster to be healthy (this may take a few minutes)
talosctl health --wait-timeout 5m
```

The health check waits for etcd, the API server, and all core components to be running. On a single node, this typically takes 2-4 minutes.

## Retrieving kubeconfig

```bash
# Get kubeconfig merged into your default config
talosctl kubeconfig

# Or save it to a specific file
talosctl kubeconfig ./dev-kubeconfig
```

Verify the cluster:

```bash
# Check node status
kubectl get nodes

# Check all pods in kube-system
kubectl get pods -n kube-system
```

All system pods should be running. On a single-node cluster, you will see etcd, kube-apiserver, kube-controller-manager, kube-scheduler, CoreDNS, and kube-proxy all running on the same node.

## Testing with a Sample Deployment

Let us deploy something to make sure scheduling works on the control plane node:

```bash
# Create a test deployment
kubectl create deployment hello --image=nginx:alpine --replicas=2

# Wait for pods to be ready
kubectl rollout status deployment/hello

# Check where the pods landed
kubectl get pods -o wide
```

Both pods should be running on your single node. If they are stuck in `Pending`, check that the scheduling patch was applied correctly:

```bash
# Check the node's taints
kubectl describe node | grep -A5 Taints

# You should see:
# Taints: <none>
# Or at most, the control plane taint should not be NoSchedule
```

## Resource Considerations

A single-node Talos cluster running Kubernetes uses roughly:

- 1.5-2 GB RAM for the base system (Talos + Kubernetes components)
- Minimal CPU at idle

That leaves 2+ GB of your 4 GB allocation for workloads. If you are running heavier workloads, consider giving the VM 8 GB of RAM.

Storage is straightforward since everything lives on one disk. For development, 20 GB is usually plenty unless you are pulling a lot of container images.

## Useful Development Workflow Commands

Here are some commands you will use frequently with your single-node cluster:

```bash
# View system logs
talosctl logs kubelet

# Check the machine configuration currently applied
talosctl get machineconfig -o yaml

# View kernel messages (useful for hardware/driver issues)
talosctl dmesg

# Reset the node (warning: destroys the cluster)
talosctl reset --graceful=false

# Upgrade Talos to a new version
talosctl upgrade --image ghcr.io/siderolabs/installer:v1.9.0
```

## Cleaning Up

When you are done with the cluster and used the Docker approach:

```bash
# Destroy the Docker-based cluster
talosctl cluster destroy --name dev-cluster
```

For a VM-based cluster, just delete the VM. There is nothing else to clean up since Talos does not install anything on your workstation beyond the talosconfig and kubeconfig files.

## Comparing to Other Local Kubernetes Options

You might wonder how a single-node Talos cluster compares to minikube, kind, or k3s. The main advantage of Talos is that it gives you a production-like environment. The Kubernetes components run the same way they would in a multi-node production cluster. This means you catch configuration issues early rather than discovering them when you deploy to staging.

The trade-off is that Talos uses more resources than kind (which shares the host kernel) and is less flexible than k3s (which lets you shell in and poke around). But for development that needs to closely match production, a single-node Talos cluster is an excellent choice.
