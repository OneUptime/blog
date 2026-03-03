# How to Migrate from kubeadm to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, kubeadm, Migration, Cluster Management, Infrastructure

Description: A practical guide to migrating your existing kubeadm-managed Kubernetes clusters to Talos Linux with minimal downtime and full workload preservation.

---

If you have been running Kubernetes clusters bootstrapped with kubeadm, you already know the pain of managing node configurations, keeping packages up to date, and dealing with configuration drift across your control plane and worker nodes. Talos Linux offers a fundamentally different approach - an immutable, API-driven operating system built specifically for Kubernetes. Migrating from kubeadm to Talos Linux can simplify your operations, tighten your security posture, and reduce the surface area you need to worry about.

This guide walks through the process of migrating a production kubeadm cluster to Talos Linux step by step.

## Why Move Away from kubeadm

kubeadm is a solid tool for bootstrapping Kubernetes clusters, but it leaves you responsible for the underlying operating system. That means you are managing SSH access, package managers, kernel updates, systemd services, and all the configuration files that come with running a general-purpose Linux distribution. Over time, nodes drift from their original configuration, and debugging becomes harder.

Talos Linux removes all of that. There is no SSH, no shell, no package manager. The entire OS is configured through a single YAML machine configuration file and managed through an API. Upgrades are atomic and reversible. The attack surface is minimal because there is nothing running on the node that is not strictly needed for Kubernetes.

## Prerequisites

Before starting the migration, make sure you have the following ready:

- A working kubeadm cluster that you want to migrate
- The `talosctl` CLI installed on your workstation
- The `kubectl` CLI configured to talk to your existing cluster
- Backup of your etcd data
- A plan for your persistent storage (more on this below)

Install `talosctl` if you have not already:

```bash
# Download the latest talosctl binary
curl -sL https://talos.dev/install | sh

# Verify the installation
talosctl version --client
```

## Step 1: Back Up Everything

Before you touch anything, take a full backup of your etcd data and your workload definitions.

```bash
# Back up etcd from one of the control plane nodes
ETCDCTL_API=3 etcdctl snapshot save etcd-backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Export all your workload definitions
kubectl get all --all-namespaces -o yaml > cluster-resources-backup.yaml

# Back up any custom resources
kubectl get crd -o name | while read crd; do
  kubectl get $(echo $crd | cut -d/ -f2) --all-namespaces -o yaml > "backup-$(echo $crd | cut -d/ -f2).yaml"
done
```

Also make sure you have copies of any Helm values files, Kustomize overlays, or GitOps repository configurations that define your workloads. You will need these to redeploy on the new cluster.

## Step 2: Generate Talos Machine Configurations

Talos uses a secrets bundle and machine configurations to define your cluster. Generate them with `talosctl`:

```bash
# Generate the cluster secrets
talosctl gen secrets -o secrets.yaml

# Generate machine configurations for your cluster
talosctl gen config my-cluster https://your-cluster-endpoint:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out

# This produces:
# _out/controlplane.yaml - configuration for control plane nodes
# _out/worker.yaml - configuration for worker nodes
# _out/talosconfig - client configuration for talosctl
```

You will want to customize these configurations for your environment. Common changes include setting the network configuration, adding machine-specific patches, and configuring the CNI plugin.

```yaml
# Example patch file for control plane nodes (patch-cp.yaml)
machine:
  network:
    hostname: talos-cp-01
    interfaces:
      - interface: eth0
        dhcp: true
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.9.0
cluster:
  network:
    cni:
      name: custom
      urls:
        - https://raw.githubusercontent.com/cilium/cilium/main/install/kubernetes/quick-install.yaml
```

Apply patches to your generated configurations:

```bash
# Apply patch to control plane config
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @patch-cp.yaml \
  --output _out/controlplane-patched.yaml
```

## Step 3: Provision Talos Nodes

The approach here depends on your infrastructure. If you are running on bare metal, you will boot nodes from the Talos ISO or PXE image. If you are on a cloud provider or virtualization platform, use the appropriate Talos image.

```bash
# For bare metal, download the ISO
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/talos-amd64.iso

# For VMware, download the OVA
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/talos-amd64.ova
```

Boot your new nodes with the Talos image. They will sit in maintenance mode waiting for their configuration.

## Step 4: Apply Configurations and Bootstrap

Apply the machine configurations to each node:

```bash
# Apply configuration to the first control plane node
talosctl apply-config --insecure \
  --nodes 192.168.1.10 \
  --file _out/controlplane-patched.yaml

# Apply configuration to worker nodes
talosctl apply-config --insecure \
  --nodes 192.168.1.20 \
  --file _out/worker.yaml
```

Bootstrap the cluster from the first control plane node:

```bash
# Set up talosctl config
export TALOSCONFIG="_out/talosconfig"
talosctl config endpoint 192.168.1.10
talosctl config node 192.168.1.10

# Bootstrap etcd on the first control plane node
talosctl bootstrap

# Wait for the cluster to come up and grab the kubeconfig
talosctl kubeconfig ./kubeconfig
```

## Step 5: Migrate Workloads

Now you have two clusters running side by side. The safest migration strategy is a blue-green approach where you deploy your workloads to the new Talos cluster and then switch traffic over.

```bash
# Point kubectl at the new cluster
export KUBECONFIG=./kubeconfig

# Verify the cluster is healthy
kubectl get nodes
kubectl get pods -n kube-system

# Deploy your workloads using whatever method you normally use
# If using Helm:
helm install my-app ./my-chart -f values.yaml

# If using plain manifests:
kubectl apply -f ./manifests/

# If using GitOps (ArgoCD/Flux), point your GitOps controller
# at the new cluster
```

For stateful workloads, you will need to handle data migration separately. If you are using a CSI driver, make sure it is installed on the new cluster first. Then use tools like Velero to migrate persistent volume data.

```bash
# Install Velero on both clusters
# On the old cluster, create a backup
velero backup create full-migration --include-namespaces '*'

# On the new Talos cluster, restore from the backup
velero restore create --from-backup full-migration
```

## Step 6: Switch Traffic and Decommission

Once your workloads are running on the Talos cluster and you have verified everything works, update your DNS records or load balancer configurations to point to the new cluster. Keep the old kubeadm cluster running for a rollback window - typically a few days to a week.

After you are confident the migration is successful, drain and decommission the old kubeadm nodes:

```bash
# On the old cluster
kubectl drain old-node-01 --ignore-daemonsets --delete-emptydir-data
kubectl delete node old-node-01
```

## Common Pitfalls

There are a few things that trip people up during this migration. First, Talos does not support running arbitrary system services, so if you had custom daemons running on your kubeadm nodes, those need to be containerized or moved elsewhere. Second, network policies and CNI configurations do not always transfer cleanly, so test your network policies thoroughly on the new cluster. Third, any node-level customizations like kernel parameters or mount points need to be translated into Talos machine configuration format.

## Wrapping Up

Migrating from kubeadm to Talos Linux is not a trivial afternoon project, but the payoff is significant. You get a cluster that is easier to manage, harder to misconfigure, and more secure by default. The key is to plan carefully, back up everything, run both clusters in parallel during the transition, and verify your workloads thoroughly before cutting over. Once you are on Talos, cluster upgrades become a single `talosctl upgrade` command instead of the multi-step kubeadm upgrade dance, and that alone makes the migration worth the effort.
