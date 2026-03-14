# Update Cilium Requirements on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, GKE, Google Cloud, EBPF

Description: Learn how to verify and update Cilium's system requirements on Google Kubernetes Engine (GKE), including node image selection, kernel version requirements, and GKE-specific networking prerequisites.

---

## Introduction

Google Kubernetes Engine offers Container-Optimized OS (COS) and Ubuntu node images, and newer GKE versions also support the GKE Dataplane V2 which is powered by Cilium. Each configuration path has distinct requirements for running Cilium, and understanding these differences ensures you choose the right approach for your use case.

GKE's default Container-Optimized OS nodes provide excellent kernel support for Cilium's eBPF features. However, certain Cilium features require specific GKE versions, node image types, and cluster configurations. GKE's network policy enforcement, GKE Dataplane V2, and standalone Cilium installations each have separate requirement profiles.

This guide walks through verifying GKE cluster requirements for Cilium, including node image verification, kernel compatibility checks, and GKE-specific network configuration prerequisites.

## Prerequisites

- GKE cluster (Standard or Autopilot)
- `gcloud` CLI authenticated with appropriate permissions
- `kubectl` configured for the GKE cluster
- `cilium` CLI installed
- Project Editor or Kubernetes Engine Admin IAM role

## Step 1: Check GKE Cluster Version and Node Images

Verify the cluster meets version requirements and uses appropriate node images.

```bash
# Check GKE cluster version and node configuration
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="yaml(currentMasterVersion,nodeConfig.imageType,networkConfig)"

# List node pools with their image types
gcloud container node-pools list \
  --cluster <cluster-name> \
  --zone <zone> \
  --format="table(name,config.imageType,version,config.machineType)"
```

Supported image types for Cilium on GKE:
- `COS_CONTAINERD` (Container-Optimized OS) - Recommended, kernel 5.10+
- `UBUNTU_CONTAINERD` - Supported, kernel 5.15+
- `COS` (Docker runtime) - Not supported for Cilium

## Step 2: Verify Kernel Version on GKE Nodes

Confirm nodes are running kernels compatible with desired Cilium features.

```bash
# Check kernel versions across all nodes
kubectl get nodes \
  -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion,OS:.status.nodeInfo.osImage"

# COS nodes on GKE 1.29+ typically run kernel 6.1+
# Ubuntu nodes on GKE 1.28+ typically run kernel 5.15+
# Both exceed Cilium's minimum requirements
```

## Step 3: Check GKE Network Policy Mode Compatibility

GKE's built-in network policy mode affects how Cilium can be deployed.

```bash
# Check current network policy provider
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(networkPolicy.provider)"

# Check if Dataplane V2 (Cilium-based) is enabled
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(networkConfig.datapathProvider)"

# ADVANCED_DATAPATH = GKE Dataplane V2 (managed Cilium)
# LEGACY_DATAPATH = Traditional networking, Cilium can be installed standalone
```

## Step 4: Update Node Pool to Meet Requirements

Update or create node pools with compatible configurations.

```bash
# Update existing node pool to use COS_CONTAINERD image type
gcloud container node-pools update default-pool \
  --cluster <cluster-name> \
  --zone <zone> \
  --image-type COS_CONTAINERD

# Or create a new node pool with optimal settings for Cilium
gcloud container node-pools create cilium-pool \
  --cluster <cluster-name> \
  --zone <zone> \
  --image-type COS_CONTAINERD \
  --machine-type n2-standard-4 \
  --num-nodes 3 \
  --workload-metadata from-node
```

## Step 5: Enable Required GKE API Features

Some Cilium features require specific GKE API capabilities to be enabled.

```bash
# Enable GKE network policy if using standard NetworkPolicy
gcloud container clusters update <cluster-name> \
  --zone <zone> \
  --update-addons=NetworkPolicy=ENABLED

# Verify the cluster has necessary permissions for Cilium
kubectl auth can-i create clusterroles --all-namespaces
kubectl auth can-i create customresourcedefinitions

# Check that kube-dns is running (required for Cilium DNS-based policies)
kubectl get pods -n kube-system | grep kube-dns
```

## Best Practices

- Use GKE Dataplane V2 for new clusters - it provides a managed, fully supported Cilium integration
- Prefer COS_CONTAINERD over Ubuntu nodes for smaller attack surface and better Cilium support
- Pin GKE node versions and upgrade node pools sequentially to avoid compatibility gaps
- Review GKE release notes for changes to network policy enforcement before each upgrade
- Use GKE Autopilot for workloads where node management overhead is undesirable

## Conclusion

GKE provides excellent default support for Cilium through its Container-Optimized OS node images and optional GKE Dataplane V2. By verifying kernel versions, configuring the appropriate network policy mode, and using COS_CONTAINERD node images, you ensure your GKE cluster meets all Cilium requirements. For new clusters, GKE Dataplane V2 provides a fully managed Cilium deployment that handles requirements automatically.
