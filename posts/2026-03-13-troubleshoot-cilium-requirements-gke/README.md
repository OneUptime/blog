# Troubleshoot Cilium Requirements on Google Kubernetes Engine

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, GKE, Google Cloud, eBPF

Description: Learn how to validate and troubleshoot Cilium installation requirements on GKE, including node image compatibility, network policy migration, and Dataplane V2 conflicts.

---

## Introduction

Google Kubernetes Engine offers a managed Kubernetes environment with its own networking stack, including Dataplane V2 (which is actually built on Cilium internally). Installing open-source Cilium alongside or instead of GKE's networking requires careful attention to compatibility, as conflicts between GKE's built-in CNI and a self-managed Cilium installation can cause subtle networking failures.

GKE's Container-Optimized OS (COS) nodes have a read-only root filesystem with specific constraints on kernel module loading and host filesystem changes. Standard Ubuntu node images provide more flexibility for OS packages and modules, but both image families must still meet Cilium's kernel and Kubernetes requirements.

This guide covers the key requirement checks specific to GKE before you install or troubleshoot Cilium in your cluster.

## Prerequisites

- `gcloud` CLI authenticated with cluster access
- `kubectl` configured against the target GKE cluster
- `cilium` CLI installed locally
- GKE cluster with Standard mode (Autopilot does not support custom CNI)

## Step 1: Check GKE Node Image Compatibility

COS and Ubuntu node images on GKE have different OS packaging and kernel module characteristics. Cilium requires a supported Linux kernel and detects available eBPF capabilities at startup; on some COS kernels, Cilium uses compatibility behavior for features that depend on modules such as `xt_socket`.

Verify your node pool image type:

```bash
# List node pools and their image types for the cluster

gcloud container node-pools list \
  --cluster=<cluster-name> \
  --region=<region> \
  --format="table(name,config.imageType,config.machineType)"

# Describe a specific node pool to see OS image and GKE version details
gcloud container node-pools describe <pool-name> \
  --cluster=<cluster-name> \
  --region=<region> \
  --format="yaml(config.imageType,version)"
```

For Cilium, use GKE Standard Linux node pools with `UBUNTU_CONTAINERD` or `COS_CONTAINERD` and verify that the node kernel meets the Cilium system requirements. In GKE 1.24 and later, Docker-based node images are not supported, so use containerd-based node images.

## Step 2: Disable GKE Dataplane V2 or Network Policy Controller

GKE's built-in Dataplane V2 uses a Cilium-based implementation that conflicts with a self-managed Cilium installation. If your cluster has Dataplane V2 enabled, you must create a new cluster without it.

Check whether Dataplane V2 or GKE network policy enforcement is active:

```bash
# Check cluster network configuration for Dataplane V2
gcloud container clusters describe <cluster-name> \
  --region=<region> \
  --format="yaml(networkConfig.datapathProvider)"

# Expected output for standard networking:
# datapathProvider: LEGACY_DATAPATH
#
# Some legacy clusters might omit this field. If output is ADVANCED_DATAPATH,
# you must recreate the cluster without Dataplane V2.

# Check GKE Network Policy enforcement and add-on state
gcloud container clusters describe <cluster-name> \
  --region=<region> \
  --format="yaml(networkPolicy.enabled,addonsConfig.networkPolicyConfig.disabled)"
```

## Step 3: Verify BPF Filesystem Mount on COS Nodes

COS nodes use a read-only root filesystem. Cilium needs the BPF filesystem mounted in the host mount namespace, normally at `/sys/fs/bpf`, so pinned BPF resources can survive Cilium agent restarts. If the BPF filesystem is not mounted, Cilium automatically mounts it during startup.

Check the BPF mount on a running node:

```bash
# Access node via SSH through gcloud (requires oslogin or bastion)
gcloud compute ssh <node-name> --zone=<zone>

# On the node, check that BPF filesystem is mounted
mount | grep bpf

# On GKE Helm installs that enable node initialization, verify the node-init pods
kubectl -n kube-system get pods -l app=cilium-node-init
```

## Step 4: Run Cilium Connectivity Test

After installation, the connectivity test validates that traffic flows correctly through the Cilium dataplane on GKE.

Execute the full connectivity test suite:

```bash
# Wait for all Cilium pods to be ready before testing
cilium status --wait

# Run connectivity tests - this creates a test namespace with client/server pods
cilium connectivity test --test-namespace=cilium-test

# Check for any failed test cases in the output
cilium connectivity test 2>&1 | grep -E "(FAIL|PASS|ERROR)"
```

## Best Practices

- Create GKE clusters with `--no-enable-network-policy` to avoid conflicts with Cilium's network policy engine
- Use Workload Identity instead of service account keys for Cilium's GCP API access
- Enable node auto-upgrade on Ubuntu node pools to keep kernel versions current
- Set resource requests/limits on the Cilium DaemonSet pods to prevent eviction on memory-constrained nodes
- Test Cilium upgrades in a separate GKE cluster before applying to production

## Conclusion

Running Cilium on GKE requires validating node image types, ensuring Dataplane V2 is not enabled, and confirming BPF filesystem availability. These checks prevent the majority of GKE-specific Cilium failures. The connectivity test suite provides a definitive health check after installation and after any infrastructure changes.
