# Checking Cilium Requirements for GKE (Google Kubernetes Engine)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, GKE, Google Cloud, eBPF

Description: A comprehensive checklist for verifying all Cilium requirements on Google Kubernetes Engine, including Dataplane V2 considerations, node image selection, and GKE-specific networking.

---

## Introduction

Installing Cilium on GKE has both advantages and considerations. The advantage is that GKE's Container-Optimized OS (COS) nodes ship with recent kernels that meet Cilium's baseline requirements. The consideration is that GKE offers its own eBPF-based dataplane called "Dataplane V2" (which is powered by Cilium internally), so understanding whether you want to use GKE's managed Cilium integration or deploy Cilium independently is an important first decision.

This guide covers requirements for both approaches: using GKE Dataplane V2 (which uses Cilium under the hood but managed by GKE) and deploying Cilium independently on GKE standard clusters. The node image choices, cluster configuration flags, and networking requirements differ between these approaches.

## Prerequisites

- `gcloud` CLI installed and authenticated
- `kubectl` configured
- GKE cluster created or to be created

## Step 1: Choose Your Approach

```bash
# Option A: GKE Dataplane V2 (Cilium managed by GKE)

# - Cilium is installed and managed by GKE
# - Limited customization
# - Integrated with GKE networking features

# Option B: Self-managed Cilium on GKE
# - Full control over Cilium configuration
# - Manual Cilium upgrade management
# - Requires disabling GKE's network policy controller

# Check if Dataplane V2 is enabled
gcloud container clusters describe my-cluster \
  --region my-region \
  --format="value(networkConfig.datapathProvider)"
# ADVANCED_DATAPATH = Dataplane V2 (Cilium)
# LEGACY_DATAPATH = Standard CNI
```

## Step 2: Check Node Image and Kernel

```bash
# Check node kernel versions
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.kernelVersion}{"\n"}{end}'

# GKE COS and Ubuntu node images are supported Linux node images
# Verify the actual kernel version; current Cilium releases require Linux kernel 5.10+

# Check node image type
gcloud container node-pools describe default-pool \
  --cluster my-cluster \
  --region my-region \
  --format="value(config.imageType)"
# COS_CONTAINERD (recommended)
# UBUNTU_CONTAINERD (also supported)
```

## Step 3: Verify GKE Network Plugin Configuration

```bash
# For self-managed Cilium: check intranode visibility
gcloud container clusters describe my-cluster \
  --region my-region \
  --format="value(networkConfig.enableIntraNodeVisibility)"

# For self-managed Cilium: disable default network policy
# GKE should not run its own network policy if Cilium is managing it

# Check if network policy controller is enabled
gcloud container clusters describe my-cluster \
  --region my-region \
  --format="value(addonsConfig.networkPolicyConfig.disabled)"
```

## Step 4: Create a GKE Cluster with Dataplane V2

```bash
# Create GKE cluster with Dataplane V2 (Cilium managed by GKE)
gcloud container clusters create cilium-gke \
  --enable-dataplane-v2 \
  --enable-ip-alias \
  --cluster-version latest \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --region us-central1 \
  --no-enable-basic-auth \
  --no-issue-client-certificate

# Get credentials
gcloud container clusters get-credentials cilium-gke --region us-central1

# Verify GKE Dataplane V2 is running
kubectl -n kube-system get pods -l k8s-app=cilium -o wide
# The Pods are named anetd-* because anetd is the GKE Dataplane V2 controller
```

## Step 5: Firewall Rule Requirements

```bash
# Check existing firewall rules
gcloud compute firewall-rules list --filter="network:default" --format="table(name,direction,allowed)"

# For Cilium overlay mode (if not using native routing):
# UDP 8472 (VXLAN) must be allowed between nodes

# Add firewall rule if needed
gcloud compute firewall-rules create allow-cilium-vxlan \
  --network default \
  --allow udp:8472 \
  --source-tags gke-my-cluster \
  --target-tags gke-my-cluster

# For health checks:
gcloud compute firewall-rules create allow-cilium-health \
  --network default \
  --allow tcp:4240 \
  --source-tags gke-my-cluster \
  --target-tags gke-my-cluster
```

## Step 6: Workload Identity Requirements

```bash
# Workload Identity Federation is for workloads that need Google Cloud API access.
# Cilium's default GKE install uses Kubernetes PodCIDR IPAM, not AWS ENI IPAM.
gcloud container clusters describe my-cluster \
  --region my-region \
  --format="value(workloadIdentityConfig)"

# Enable Workload Identity if needed
gcloud container clusters update my-cluster \
  --region my-region \
  --workload-pool=my-project.svc.id.goog
```

## GKE + Cilium Requirements Summary

| Requirement | Dataplane V2 (managed) | Self-managed |
|-------------|----------------------|--------------|
| GKE version | 1.20.6-gke.700+ | Match your Cilium release's Kubernetes compatibility matrix |
| Node image | COS or Ubuntu | COS or Ubuntu |
| Kernel | GKE-managed supported node image | 5.10+ |
| Network plugin | GKE manages | Manual |
| NetworkPolicy controller | Included | Disable GKE NP |

## Conclusion

GKE offers the easiest Cilium deployment path via Dataplane V2, where Google manages the Cilium lifecycle. For teams needing full control over Cilium configuration, self-managed deployment on GKE is well-supported with COS nodes providing excellent kernel compatibility. The key requirements are node image selection (COS recommended), firewall rule configuration, and the choice between managed and self-managed Cilium.
