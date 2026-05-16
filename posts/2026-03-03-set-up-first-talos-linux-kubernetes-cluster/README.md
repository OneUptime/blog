# How to Set Up Your First Talos Linux Kubernetes Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Cluster Setup, Getting Started, DevOps

Description: Learn how to set up your very first Kubernetes cluster using Talos Linux, from generating configs to deploying your first pod.

---

Getting started with Kubernetes can feel overwhelming, especially when you factor in the operating system layer. Traditional approaches involve installing Ubuntu or CentOS, then layering kubeadm or similar tools on top. Talos Linux simplifies this by being a purpose-built OS that only does one thing: run Kubernetes.

This guide takes you from zero to a working cluster. We will keep things simple and focus on getting you productive as quickly as possible.

## Why Talos Linux for Your First Cluster

If you are learning Kubernetes, Talos is a great choice because it removes an entire category of problems. You never have to worry about package conflicts, SSH security, user management, or system updates breaking your cluster. The OS is immutable and managed entirely through a declarative API.

That said, Talos is also different from what you might be used to. There is no SSH access, no shell, and no way to "log in" to a node in the traditional sense. Everything is done through `talosctl` or the Kubernetes API itself.

## What You Will Need

For this tutorial, you need:

- A workstation (macOS, Linux, or Windows) with `talosctl` and `kubectl` installed
- At least one machine to run Talos Linux on (physical or virtual)
- Network access between your workstation and the target machine

If you do not have spare hardware, you can use VirtualBox, VMware, or even Docker to run Talos locally. We will cover the simplest path here using a virtual machine, but the steps apply to any environment.

## Installing the Required Tools

First, install `talosctl` on your workstation:

```bash
# On macOS using Homebrew

brew install siderolabs/tap/talosctl

# On Linux using the install script
curl -sL https://talos.dev/install | sh
```

You will also need `kubectl`:

```bash
# On macOS
brew install kubectl

# On Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

## Downloading the Talos Image

For a VM, download the appropriate image. If you are using QEMU/KVM:

```bash
# Download the ISO image
curl -L -O https://github.com/siderolabs/talos/releases/latest/download/metal-amd64.iso
```

For VirtualBox or VMware, use the appropriate platform image from the Talos Image Factory at https://factory.talos.dev, which provides pre-built images for dozens of platforms.

## Creating the Virtual Machine

If you are using KVM/libvirt, create a VM like this:

```bash
# Create a VM with 2 CPUs, 4 GB RAM, and the Talos ISO
virt-install \
  --virt-type kvm \
  --name talos-control-plane \
  --ram 4096 \
  --vcpus 2 \
  --disk path=talos-control-plane.qcow2,bus=virtio,size=40,format=qcow2 \
  --cdrom metal-amd64.iso \
  --os-variant=linux2022 \
  --network network=default \
  --boot hd,cdrom \
  --noautoconsole
```

The VM will boot into Talos maintenance mode. You can find the node's IP address from the VM console or with `virsh domifaddr talos-control-plane`. Write this down.

## Generating Your Cluster Configuration

This is where Talos differs from other approaches. Instead of running an installer on the node, you generate a configuration on your workstation and push it to the node.

```bash
# Generate the cluster configuration
# "my-first-cluster" is the name, and the URL is where the Kubernetes API will listen
talosctl gen config my-first-cluster https://192.168.1.50:6443 \
  --install-disk /dev/vda
```

This produces three files:

- `controlplane.yaml` - configuration for control plane nodes
- `worker.yaml` - configuration for worker nodes
- `talosconfig` - configuration for the talosctl client

For a single-node cluster, you only need `controlplane.yaml`.

## Allowing Single-Node Scheduling

By default, control plane nodes do not run regular workloads. For a single-node setup, you want to allow scheduling on the control plane:

```yaml
# Create a patch file: allow-scheduling.yaml
cluster:
  allowSchedulingOnControlPlanes: true
```

Regenerate the config with this patch:

```bash
# Regenerate with the scheduling patch
talosctl gen config my-first-cluster https://192.168.1.50:6443 \
  --install-disk /dev/vda \
  --config-patch @allow-scheduling.yaml
```

## Applying the Configuration

Now push the configuration to your node:

```bash
# Apply the control plane config to the node
# Use --insecure because the node does not have TLS set up yet
talosctl apply-config --insecure \
  --nodes 192.168.1.50 \
  --file controlplane.yaml
```

The node will reboot, install Talos to the disk, and come back up with the configuration applied. This takes a couple of minutes.

## Setting Up talosctl

Point your talosctl at the new cluster:

```bash
# Tell talosctl where to find the cluster
export TALOSCONFIG="talosconfig"
talosctl config endpoint 192.168.1.50
talosctl config node 192.168.1.50
```

## Bootstrapping Kubernetes

With the configuration applied, bootstrap the Kubernetes cluster:

```bash
# Bootstrap Kubernetes - only run this once
talosctl bootstrap
```

This tells the first control plane node to initialize etcd and start the Kubernetes control plane components. Give it 2-5 minutes to complete.

You can watch the progress:

```bash
# Watch the services come up
talosctl services

# Check the health of the cluster
talosctl health
```

## Getting Your kubeconfig

Once the cluster is healthy, retrieve the kubeconfig:

```bash
# Download the kubeconfig to your local machine
talosctl kubeconfig
```

This merges the credentials into your `~/.kube/config` file. Now you can use kubectl:

```bash
# Check that the node is ready
kubectl get nodes

# You should see something like:
# NAME          STATUS   ROLES           AGE   VERSION
# talos-node1   Ready    control-plane   5m    v1.29.x
```

## Deploying Your First Workload

Let us deploy a simple nginx pod to verify everything works:

```bash
# Create a simple nginx deployment
kubectl create deployment nginx --image=nginx:latest

# Expose it as a service
kubectl expose deployment nginx --port=80 --type=NodePort

# Check the pod is running
kubectl get pods

# Find the NodePort assigned
kubectl get svc nginx
```

You should be able to reach nginx at your node's IP address on the assigned NodePort.

## Understanding What Just Happened

Let us recap the flow of what happened, because it is quite different from a traditional Linux setup:

1. You created a machine (VM or physical) and booted it with the Talos image
2. The machine entered maintenance mode, waiting for configuration
3. You generated a cluster configuration on your workstation
4. You pushed that configuration to the node via the API
5. The node rebooted, installed itself, and applied the configuration
6. You bootstrapped Kubernetes through talosctl
7. Kubernetes started running on the node

At no point did you SSH into anything. At no point did you run apt-get or yum. The entire process was API-driven and declarative.

## Next Steps

From here, you can expand your cluster by adding worker nodes (apply `worker.yaml` to new machines), install a CNI plugin for advanced networking, set up an ingress controller, or start deploying your own applications.

Talos Linux makes cluster management predictable. Upgrades, configuration changes, and even OS updates all go through the same API. Once you are comfortable with this workflow, you will find it hard to go back to managing Kubernetes on a traditional Linux distribution.
