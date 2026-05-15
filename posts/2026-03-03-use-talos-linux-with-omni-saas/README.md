# How to Use Talos Linux with Omni SaaS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Omni, SaaS, Kubernetes, Cluster Management

Description: Learn how to use Sidero Omni SaaS to manage Talos Linux clusters with a centralized management plane across any infrastructure.

---

Sidero Omni is a SaaS platform built by the creators of Talos Linux that provides centralized management for Talos Linux clusters. Instead of managing each cluster individually with `talosctl`, Omni gives you a single dashboard and API to handle multiple clusters across different environments - bare metal, cloud, edge locations, and everything in between.

This guide covers how to get started with Omni and connect your Talos Linux machines to it.

## What Is Omni?

Omni solves a real problem that grows as your Talos Linux usage expands. When you have one cluster, managing it with `talosctl` is simple. When you have five, ten, or fifty clusters spread across data centers and cloud providers, you need something more. Omni provides:

- A web UI for managing all your Talos clusters
- Automatic cluster creation by simply registering machines
- Built-in authentication and role-based access control
- Cluster templates for repeatable deployments
- Upgrade management across multiple clusters
- Integration with identity providers for team access

Think of it as a management plane that sits above your Talos Linux infrastructure and makes multi-cluster operations practical.

## Getting Started with Omni

Sign up for an Omni account at omni.siderolabs.com. After creating your account, you will get access to the Omni dashboard and an account-specific registration endpoint.

```bash
# Install omnictl, talosctl, and kubelogin on macOS or Linux

brew install siderolabs/tap/sidero-tools

# Copy the omniconfig.yaml file from your Omni dashboard, then configure omnictl
mkdir -p ~/.talos/omni
cp omniconfig.yaml ~/.talos/omni/config

# Trigger browser-based authentication and verify access
omnictl get cluster
```

The Omni dashboard will show your account and any existing clusters. For a new account, it will be empty - ready for you to register machines.

## Registering Machines with Omni

The key concept in Omni is machine registration. Instead of managing individual machine configurations, you register machines with Omni and then assign them to clusters through the UI or API.

To register a machine, you boot it with a special Talos Linux image that points to your Omni account:

```bash
# Download the Omni-specific Talos image from your account.
# Find it in the Omni dashboard under "Download Installation Media"
# or use omnictl after configuring your omniconfig.

# For bare metal - download the ISO
omnictl download iso --arch amd64 --talos-version v1.9.0

# For cloud instances - download the appropriate image for your platform
omnictl download nocloud --arch amd64 --talos-version v1.9.0
```

The generated image includes the SideroLink connection parameters for your Omni account, so any machine that boots from it will automatically register with your Omni account.

## Booting Machines for Omni

### Bare Metal

Flash the Omni-specific ISO to a USB drive and boot your machine:

```bash
# Write the ISO to USB
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

### Cloud VMs

For cloud instances, use the appropriate disk image for your provider:

```bash
# Example: Creating a VM on Proxmox with the Omni image
xz -d nocloud-amd64.raw.xz
qm create 100 --name talos-omni-01 --memory 4096 --cores 2
qm importdisk 100 nocloud-amd64.raw local-lvm
qm set 100 --scsi0 local-lvm:vm-100-disk-0 --boot order=scsi0
qm start 100
```

### PXE Boot

For network boot environments, use the Omni-specific PXE assets:

```bash
# Download PXE kernel and initramfs from your Omni account
# Configure your PXE server to use these assets
# Machines will register with Omni on first boot
```

Once a machine boots, it appears in the Omni dashboard as an available machine, ready to be assigned to a cluster.

## Creating a Cluster in Omni

With machines registered, you can create a cluster through the web UI or the CLI:

### Using the Web UI

1. Go to the Omni dashboard
2. Click "Create Cluster"
3. Give your cluster a name
4. Select which registered machines should be control plane nodes
5. Select which machines should be worker nodes
6. Choose the Kubernetes version
7. Click "Create"

Omni handles all the configuration generation, applies it to each machine, and bootstraps the cluster automatically.

### Using omnictl

```bash
# List available machines
omnictl get machine

# Create a cluster using a cluster template
cat > cluster-template.yaml << 'TEMPLATE'
kind: Cluster
name: production-cluster
kubernetes:
  version: v1.31.0
talos:
  version: v1.9.0
patches:
  - name: default
    inline:
      machine:
        network:
          nameservers:
            - 8.8.8.8
            - 8.8.4.4
---
kind: ControlPlane
machines:
  - <MACHINE_ID_1>
  - <MACHINE_ID_2>
  - <MACHINE_ID_3>
---
kind: Workers
machines:
  - <MACHINE_ID_4>
TEMPLATE

omnictl cluster template validate -f cluster-template.yaml
omnictl cluster template sync -f cluster-template.yaml --verbose
omnictl cluster template status -f cluster-template.yaml
```

## Accessing Your Cluster

Once Omni finishes building the cluster, you can get the kubeconfig directly from Omni:

```bash
# Download kubeconfig through omnictl
omnictl kubeconfig ./kubeconfig --cluster production-cluster --merge=false --force

# Or through talosctl via the Omni proxy
omnictl talosconfig ./talosconfig --cluster production-cluster --merge=false --force
talosctl --talosconfig=talosconfig health
```

The Omni dashboard also provides a built-in kubectl terminal and shows cluster health metrics.

## Cluster Templates

One of Omni's most useful features is cluster templates. You can define your cluster configuration as code and reuse it:

```yaml
# cluster-template.yaml
kind: Cluster
name: edge-cluster
kubernetes:
  version: v1.31.0
talos:
  version: v1.9.0
patches:
  - name: kubelet-config
    inline:
      machine:
        kubelet:
          extraArgs:
            rotate-server-certificates: "true"
  - name: network-config
    inline:
      machine:
        network:
          interfaces:
            - interface: eth0
              dhcp: true
---
kind: ControlPlane
machineClass:
  name: edge-control-plane
  size: 3
---
kind: Workers
machineClass:
  name: edge-workers
  size: 5
patches:
  - name: kubelet-config
    inline:
      machine:
        kubelet:
          extraArgs:
            rotate-server-certificates: "true"
```

```bash
# Apply the template to create the cluster
omnictl cluster template validate -f cluster-template.yaml
omnictl cluster template sync -f cluster-template.yaml --verbose
```

## Managing Upgrades

Omni simplifies the upgrade process for both Talos Linux and Kubernetes:

For clusters managed by a template, update the versions in the `Cluster` document:

```yaml
kubernetes:
  version: v1.32.0
talos:
  version: v1.10.0
```

```bash
# Then validate and sync the template
omnictl cluster template validate -f cluster-template.yaml
omnictl cluster template sync -f cluster-template.yaml --verbose
```

Omni performs rolling upgrades, updating one node at a time and waiting for each node to be healthy before proceeding to the next one.

## Identity Provider Integration

For team environments, Omni integrates with identity providers:

```bash
# Omni supports SAML and OIDC for authentication
# Configure your IdP in the Omni dashboard under Settings -> Identity Providers
# Team members can then log in with their corporate credentials
```

You can set up role-based access control so that different team members have different levels of access:

- Cluster administrators can create and delete clusters
- Operators can manage existing clusters
- Viewers can see cluster status but not make changes

## Multi-Cluster Management

Omni truly shines when you manage multiple clusters. The dashboard shows all your clusters at a glance, with health status, version information, and resource utilization.

```bash
# List all clusters
omnictl get cluster

# Get details about a specific cluster
omnictl get cluster production-cluster

# View machines across all clusters
omnictl get machine
```

## Machine Labels and Organization

Use labels to organize your machines and make cluster creation easier:

```bash
# Add labels when generating installation media
omnictl download iso --arch amd64 \
  --initial-labels location=datacenter-east,hardware=gpu-node

# Create a machine class that selects machines by label
cat > machine-class.yaml << 'CLASS'
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: datacenter-east-gpu
spec:
  matchlabels:
    - location = datacenter-east, hardware = gpu-node
CLASS

omnictl apply -f machine-class.yaml
```

These labels can be used by machine classes in cluster templates to automatically select the right machines for each cluster.

## Troubleshooting

If a machine does not appear in Omni after booting, verify that it has network connectivity and can reach the Omni service. For Omni SaaS, machines need outbound TCP 443 and UDP 51820 access to the Omni endpoints shown in the UI.

If cluster creation fails, check the machine health in the Omni dashboard. Each machine shows its current state and any errors. Common issues include insufficient resources or network configuration problems.

For connectivity issues between Omni and your machines, check that your firewall allows outbound connections on TCP 443 and UDP 51820. Omni uses a pull-based model where machines connect to Omni, not the other way around.

## Conclusion

Omni transforms the experience of managing Talos Linux from individual cluster management to fleet-level operations. By centralizing machine registration, cluster creation, and upgrade management in a single SaaS platform, it makes running multiple Talos Linux clusters practical even for small teams. The combination of a web UI for visibility, a CLI for automation, and identity provider integration for access control addresses the real operational challenges that come with running Kubernetes at scale.
