# Troubleshoot Cilium Requirements on Google Kubernetes Engine

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, GKE, Kubernetes, Networking, Troubleshooting

Description: Learn how to validate and troubleshoot Cilium installation requirements on GKE, including node image compatibility, network policy migration, and Dataplane V2 conflicts.

---

## Introduction

Google Kubernetes Engine offers a managed Kubernetes environment with its own networking stack, including Dataplane V2 (which is actually built on Cilium internally). Installing open-source Cilium alongside or instead of GKE's networking requires careful attention to compatibility, as conflicts between GKE's built-in CNI and a self-managed Cilium installation can cause subtle networking failures.

GKE's Container-Optimized OS (COS) nodes have a read-only filesystem with specific constraints on kernel module loading and BPF filesystem mounts. Standard Ubuntu node images provide more flexibility but require different configuration steps.

This guide covers the key requirement checks specific to GKE before you install or troubleshoot Cilium in your cluster.

## Prerequisites

- `gcloud` CLI authenticated with cluster access
- `kubectl` configured against the target GKE cluster
- `cilium` CLI installed locally
- GKE cluster with Standard mode (Autopilot does not support custom CNI)

## Step 1: Check GKE Node Image Compatibility

COS and Ubuntu node images on GKE have different kernel capabilities. Ubuntu nodes provide better Cilium compatibility with full eBPF support.

Verify your node pool image type:

```bash
# List node pools and their image types for the cluster
gcloud container node-pools list \
  --cluster=<cluster-name> \
  --region=<region> \
  --format="table(name,config.imageType,config.machineType)"

# Describe a specific node pool to see OS and kernel details
gcloud container node-pools describe <pool-name> \
  --cluster=<cluster-name> \
  --region=<region> \
  --format="yaml(config.imageType,version)"
```

For Cilium, `UBUNTU_CONTAINERD` or `COS_CONTAINERD` on GKE 1.24+ are both supported, but Ubuntu provides a wider set of eBPF features.

## Step 2: Disable GKE Dataplane V2 or Network Policy Controller

GKE's built-in Dataplane V2 uses a Cilium-based implementation that conflicts with a self-managed Cilium installation. If your cluster has Dataplane V2 enabled, you must create a new cluster without it.

Check whether Dataplane V2 is active:

```bash
# Check cluster network configuration for Dataplane V2
gcloud container clusters describe <cluster-name> \
  --region=<region> \
  --format="yaml(networkConfig.datapathProvider)"

# Expected output for standard networking (safe for Cilium):
# datapathProvider: LEGACY_DATAPATH

# If output is ADVANCED_DATAPATH, you must recreate the cluster without Dataplane V2
```

## Step 3: Verify BPF Filesystem Mount on COS Nodes

COS nodes use a read-only root filesystem. The BPF filesystem must be mounted on a writable path that survives node restarts.

Check the BPF mount on a running node:

```bash
# Access node via SSH through gcloud (requires oslogin or bastion)
gcloud compute ssh <node-name> --zone=<zone>

# On the node, check that BPF filesystem is mounted
mount | grep bpf

# On COS, Cilium mounts BPF at startup via an init container — verify it ran
kubectl -n kube-system describe pod -l k8s-app=cilium | grep -A5 "Init Containers"
```

## Step 4: Run Cilium Connectivity Test

After installation, the connectivity test validates that traffic flows correctly through the Cilium dataplane on GKE.

Execute the full connectivity test suite:

```bash
# Wait for all Cilium pods to be ready before testing
cilium status --wait

# Run connectivity tests — this creates a test namespace with client/server pods
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
