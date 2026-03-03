# How to Set Up Talos Linux on Parallels Desktop

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Parallels Desktop, macOS, Virtualization, Kubernetes

Description: A step-by-step guide to installing and running Talos Linux on Parallels Desktop for macOS, covering image preparation, VM creation, and cluster bootstrapping.

---

Running Kubernetes on your Mac for development and testing has always been a bit of a balancing act. Tools like Docker Desktop and Minikube work fine for simple tasks, but when you want something closer to a production-grade cluster, they fall short. Talos Linux fills that gap. It is a minimal, immutable operating system designed exclusively for Kubernetes, and it pairs surprisingly well with Parallels Desktop on macOS.

In this guide, you will walk through the full process of setting up a Talos Linux cluster inside Parallels Desktop. By the end, you will have a working Kubernetes cluster running on your Mac that behaves almost identically to what you would run in production.

## Why Parallels Desktop for Talos Linux?

Parallels Desktop is one of the best virtualization platforms available for macOS. It supports both Intel and Apple Silicon Macs, and its tight integration with the macOS ecosystem makes it particularly smooth to work with. Compared to something like UTM or QEMU, Parallels handles networking and resource management with far less manual setup.

Talos Linux, on the other hand, does not have SSH access, does not have a package manager, and does not even have a shell. Everything is managed through its API using the `talosctl` command-line tool. This makes it a perfect fit for a virtualized environment where you do not want to worry about OS-level maintenance.

## Prerequisites

Before you begin, make sure you have the following installed on your Mac:

- Parallels Desktop Pro or Business edition (the standard edition lacks some CLI features)
- `talosctl` command-line tool
- `kubectl` for managing Kubernetes
- At least 8 GB of RAM available for VMs

Install `talosctl` and `kubectl` using Homebrew:

```bash
# Install talosctl
brew install siderolabs/tap/talosctl

# Install kubectl if you don't already have it
brew install kubectl
```

## Download the Talos Linux ISO

Talos provides pre-built ISO images for different architectures. For Parallels on Apple Silicon Macs, you need the ARM64 image. For Intel Macs, grab the AMD64 version.

```bash
# For Apple Silicon (M1/M2/M3/M4)
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-arm64.iso

# For Intel Macs
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-amd64.iso
```

You can also check the Talos releases page for the latest version and download a specific release if needed.

## Create a Virtual Machine in Parallels

Open Parallels Desktop and create a new virtual machine. You can do this through the GUI or the command line. The CLI approach is more repeatable, so let us go with that.

```bash
# Create a new VM from the Talos ISO
prlctl create "talos-cp-1" --ostype linux --distribution linux-2.6

# Set VM resources
prlctl set "talos-cp-1" --cpus 2 --memsize 2048

# Attach the ISO as a boot device
prlctl set "talos-cp-1" --device-set cdrom0 --image /path/to/metal-arm64.iso

# Set the boot order to CD first
prlctl set "talos-cp-1" --device-bootorder "cdrom0 hdd0"

# Start the VM
prlctl start "talos-cp-1"
```

Replace `/path/to/metal-arm64.iso` with the actual path to the ISO you downloaded.

## Configure Networking

By default, Parallels uses a shared network mode that provides NAT-based connectivity. This works fine for a single-node setup, but if you want to run a multi-node cluster, bridged networking gives you direct LAN access to each VM.

```bash
# Switch to bridged networking
prlctl set "talos-cp-1" --device-set net0 --type bridged --iface en0
```

After starting the VM, it will display its IP address on the console. Make note of this address - you will need it to configure the cluster.

## Generate the Talos Configuration

Talos uses machine configuration files to set up each node. You generate these using `talosctl`:

```bash
# Generate machine configs for the cluster
talosctl gen config my-cluster https://<CONTROL_PLANE_IP>:6443

# This creates:
# - controlplane.yaml
# - worker.yaml
# - talosconfig
```

Replace `<CONTROL_PLANE_IP>` with the IP address of your control plane VM.

## Apply Configuration to the VM

With the configuration files generated, apply the control plane configuration to your VM:

```bash
# Apply the control plane config
talosctl apply-config --insecure --nodes <CONTROL_PLANE_IP> --file controlplane.yaml
```

The `--insecure` flag is necessary because the node does not have a certificate configured yet. After applying the configuration, the node will reboot and begin setting up the Kubernetes control plane components.

## Set Up talosctl Endpoints

Configure your `talosctl` client to communicate with the cluster:

```bash
# Set the endpoint and node
talosctl config endpoint <CONTROL_PLANE_IP>
talosctl config node <CONTROL_PLANE_IP>

# Merge the generated talosconfig into your default config
talosctl config merge talosconfig
```

## Bootstrap the Cluster

Once the control plane node has rebooted and the Talos API is responding, bootstrap etcd:

```bash
# Bootstrap the cluster
talosctl bootstrap

# Watch the boot process
talosctl dmesg --follow
```

The bootstrap process takes a few minutes. You can monitor the progress with `talosctl health`:

```bash
# Check cluster health
talosctl health
```

## Get the Kubeconfig

After the cluster is healthy, retrieve the kubeconfig file:

```bash
# Get the kubeconfig
talosctl kubeconfig .

# Verify access
kubectl get nodes
```

You should see your control plane node listed and in a Ready state.

## Adding Worker Nodes

To add worker nodes, create additional VMs in Parallels following the same process as above, then apply the worker configuration:

```bash
# Create a worker VM
prlctl create "talos-worker-1" --ostype linux --distribution linux-2.6
prlctl set "talos-worker-1" --cpus 2 --memsize 2048
prlctl set "talos-worker-1" --device-set cdrom0 --image /path/to/metal-arm64.iso
prlctl start "talos-worker-1"

# Apply worker config (use the worker VM's IP)
talosctl apply-config --insecure --nodes <WORKER_IP> --file worker.yaml
```

The worker node will join the cluster automatically after applying the configuration.

## Automating the Setup with a Script

If you plan on creating and tearing down clusters regularly, wrapping everything in a script saves a lot of time:

```bash
#!/bin/bash
# create-talos-cluster.sh

CLUSTER_NAME="talos-dev"
ISO_PATH="$HOME/Downloads/metal-arm64.iso"
CP_COUNT=1
WORKER_COUNT=2

# Create control plane
for i in $(seq 1 $CP_COUNT); do
  prlctl create "${CLUSTER_NAME}-cp-${i}" --ostype linux --distribution linux-2.6
  prlctl set "${CLUSTER_NAME}-cp-${i}" --cpus 2 --memsize 4096
  prlctl set "${CLUSTER_NAME}-cp-${i}" --device-set cdrom0 --image "$ISO_PATH"
  prlctl start "${CLUSTER_NAME}-cp-${i}"
done

# Create workers
for i in $(seq 1 $WORKER_COUNT); do
  prlctl create "${CLUSTER_NAME}-worker-${i}" --ostype linux --distribution linux-2.6
  prlctl set "${CLUSTER_NAME}-worker-${i}" --cpus 2 --memsize 2048
  prlctl set "${CLUSTER_NAME}-worker-${i}" --device-set cdrom0 --image "$ISO_PATH"
  prlctl start "${CLUSTER_NAME}-worker-${i}"
done

echo "VMs created. Note the IP addresses from the console and proceed with configuration."
```

## Troubleshooting Common Issues

If the VM fails to boot from the ISO, double-check that the boot order is set correctly. Parallels sometimes resets this when you change other settings.

If networking is not working, verify that your firewall is not blocking traffic on ports 6443 (Kubernetes API), 50000 (Talos API), and 50001 (Talos trustd). On macOS, the built-in firewall can sometimes interfere with bridged networking.

If the cluster health check times out, give it a bit more time. On Apple Silicon Macs, the ARM64 image sometimes takes longer to initialize because of the emulation layer differences in Parallels.

## Wrapping Up

Running Talos Linux on Parallels Desktop gives you a lightweight, production-like Kubernetes environment right on your Mac. The combination of Talos's immutable design and Parallels's smooth virtualization makes for a development setup that is both reliable and easy to manage. You can spin up clusters in minutes, tear them down when you are done, and never worry about drift or configuration pollution between test runs.
