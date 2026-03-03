# How to Install Talos Linux on Bare Metal Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Bare Metal, Kubernetes, Installation, Infrastructure

Description: A complete walkthrough for installing Talos Linux on bare metal servers, from preparing your hardware to running your first Kubernetes cluster.

---

Talos Linux is designed from the ground up to run Kubernetes. Unlike traditional Linux distributions, it strips away everything you do not need - there is no shell, no SSH, no package manager. The entire operating system is managed through an API. This makes it a fantastic choice for bare metal Kubernetes deployments where security and immutability matter.

In this guide, we will walk through every step of installing Talos Linux on physical hardware. By the end, you will have a working Kubernetes cluster running on your own machines.

## Prerequisites

Before you begin, make sure you have the following ready:

- At least one physical server (two or more recommended for high availability)
- A USB drive with at least 4 GB of storage
- A workstation with `talosctl` installed
- Network connectivity between your workstation and the bare metal servers
- DHCP available on your network (or static IP addresses planned out)

## Step 1: Download the Talos Linux ISO

Head over to the Talos Linux GitHub releases page or use the Image Factory to grab the latest ISO. You can also download it directly from the command line:

```bash
# Download the latest Talos Linux ISO for amd64
curl -LO https://github.com/siderolabs/talos/releases/latest/download/talos-amd64.iso
```

If your servers use UEFI boot, make sure you grab the UEFI-compatible image. Most modern servers do, but older hardware might still use legacy BIOS.

## Step 2: Create a Bootable USB Drive

Once you have the ISO, write it to a USB drive. On Linux or macOS, you can use `dd`:

```bash
# Write the ISO to a USB drive (replace /dev/sdX with your actual device)
sudo dd if=talos-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
```

On macOS, the device path will look like `/dev/diskN`. Make sure you unmount the disk first:

```bash
# On macOS, unmount before writing
diskutil unmountDisk /dev/disk2
sudo dd if=talos-amd64.iso of=/dev/rdisk2 bs=4m
```

Double-check you are writing to the correct device. Writing to the wrong disk can wipe out your data.

## Step 3: Boot the Server from USB

Plug the USB drive into your server and boot from it. You will usually need to press a key during POST to access the boot menu - this varies by manufacturer (F12 for Dell, F11 for HP, F2 for Supermicro, etc.).

When Talos boots, it will display a console screen showing the node's IP address. Take note of this IP address because you will need it to apply the machine configuration. Talos enters a maintenance mode at this point and waits for a configuration to be applied via the API.

There is no login prompt. There is no shell. This is by design. Everything from here on out happens through `talosctl`.

## Step 4: Install talosctl on Your Workstation

If you have not installed `talosctl` yet, grab it now:

```bash
# Install talosctl on Linux
curl -sL https://talos.dev/install | sh
```

On macOS with Homebrew:

```bash
# Install talosctl via Homebrew
brew install siderolabs/tap/talosctl
```

Verify the installation:

```bash
# Check that talosctl is installed correctly
talosctl version --client
```

## Step 5: Generate Machine Configurations

Talos Linux uses machine configurations (YAML files) to define how each node should behave. You generate these with `talosctl gen config`:

```bash
# Generate configuration files for your cluster
# Replace "my-cluster" with your desired cluster name
# Replace the endpoint with your control plane IP or load balancer address
talosctl gen config my-cluster https://192.168.1.100:6443
```

This command creates several files:

- `controlplane.yaml` - Configuration for control plane nodes
- `worker.yaml` - Configuration for worker nodes
- `talosconfig` - Client configuration for talosctl

The endpoint you provide should be the address where the Kubernetes API will be reachable. For a single control plane node, this is just that node's IP. For HA setups, use a load balancer or virtual IP.

## Step 6: Customize the Machine Configuration

Before applying, you might want to customize the configuration. Common changes include setting static IPs, configuring disk layouts, or adding custom kernel arguments.

Here is an example of a patch to set a static IP on a node:

```yaml
# patch-static-ip.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.101/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

Apply the patch when generating your config:

```bash
# Generate config with a custom patch applied
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch-control-plane @patch-static-ip.yaml
```

## Step 7: Apply the Configuration to Nodes

Now apply the machine configuration to each node. Start with the control plane:

```bash
# Apply the control plane configuration to the first node
talosctl apply-config --insecure \
  --nodes 192.168.1.101 \
  --file controlplane.yaml
```

The `--insecure` flag is needed because the node does not yet have a configuration, so TLS has not been established. After the config is applied, the node will reboot and install Talos to disk.

For worker nodes, apply the worker configuration:

```bash
# Apply worker configuration to a worker node
talosctl apply-config --insecure \
  --nodes 192.168.1.102 \
  --file worker.yaml
```

Repeat this for each additional node.

## Step 8: Bootstrap the Cluster

After all nodes have rebooted and are running Talos, bootstrap Kubernetes on one of the control plane nodes:

```bash
# Set up talosctl to use the generated config
export TALOSCONFIG="talosconfig"

# Bootstrap Kubernetes on the first control plane node
talosctl bootstrap --nodes 192.168.1.101
```

Only run the bootstrap command once, on a single control plane node. Running it on multiple nodes will cause problems.

## Step 9: Retrieve Your kubeconfig

Once the bootstrap process finishes (give it a few minutes), pull down your kubeconfig:

```bash
# Get the kubeconfig and save it
talosctl kubeconfig --nodes 192.168.1.101
```

This merges the new cluster's credentials into your default kubeconfig file at `~/.kube/config`.

## Step 10: Verify the Cluster

Check that everything is running:

```bash
# Verify nodes are ready
kubectl get nodes

# Check system pods
kubectl get pods -n kube-system
```

You should see your nodes in a `Ready` state and all the core Kubernetes components running - etcd, kube-apiserver, kube-controller-manager, kube-scheduler, CoreDNS, and kube-proxy.

## Troubleshooting Common Issues

If a node does not come up, check its status with talosctl:

```bash
# Check the services running on a node
talosctl services --nodes 192.168.1.101

# View system logs for issues
talosctl dmesg --nodes 192.168.1.101

# Check etcd membership
talosctl etcd members --nodes 192.168.1.101
```

Common problems include network misconfigurations (wrong gateway or DNS), disk issues (Talos needs a dedicated disk), and firewall rules blocking communication between nodes.

## What Comes Next

With your bare metal Talos Linux cluster running, you can start deploying workloads. Consider setting up a CNI plugin like Cilium or Flannel if one is not already configured, install an ingress controller, and set up persistent storage with something like Rook-Ceph or Longhorn.

Talos on bare metal gives you the performance benefits of running directly on hardware while maintaining the security and simplicity of an immutable operating system. There is no drift, no unauthorized changes, and upgrades are as simple as applying a new machine configuration that points to the next Talos version.
