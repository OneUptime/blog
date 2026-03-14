# Migrate Workloads to Calico on Self-Managed GCE Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GCE, Google Cloud, Kubernetes, Networking, Migration, CNI

Description: A practical guide to migrating workloads from an existing CNI to Calico on a self-managed Kubernetes cluster deployed on Google Compute Engine, leveraging GCE's native routing support for optimal performance.

---

## Introduction

Google Compute Engine provides an excellent foundation for self-managed Kubernetes clusters, with native VPC routing that Calico can leverage to avoid overlay encapsulation overhead. Unlike GKE, self-managed clusters on GCE give you complete control over the CNI plugin, enabling you to adopt Calico for enterprise-grade network policy, multi-pool IPAM, and BGP route advertisement directly into GCE's VPC.

One of the unique advantages of running Calico on GCE is the ability to use Calico's native routing mode, where GCE VPC routes carry pod network prefixes without any encapsulation. This results in lower latency and higher throughput compared to VXLAN or IP-in-IP overlay networks.

This guide walks you through migrating your existing CNI to Calico on GCE, configuring native routing with GCE VPC, and validating workload connectivity using `calicoctl`.

## Prerequisites

- Self-managed Kubernetes cluster on GCE VMs (kubeadm recommended)
- `kubectl` with cluster-admin access
- `calicoctl` v3.27+ installed
- `gcloud` CLI authenticated with compute.routes permission
- GCE VPC with sufficient IP space for Calico pod CIDRs
- SSH access to GCE instances or OS Login configured

## Step 1: Review GCE VPC Route Limits

GCE VPC has a default limit of 250 dynamic routes per VPC. Plan your pod CIDR block sizes to stay within this limit.

Check current VPC route usage before proceeding:

```bash
# List existing routes in your GCE VPC
gcloud compute routes list --filter="network=YOUR_VPC_NAME" --format="table(name,destRange,nextHopInstance)"

# Count total routes to assess headroom
gcloud compute routes list --filter="network=YOUR_VPC_NAME" --format="value(name)" | wc -l
```

## Step 2: Drain Nodes and Remove Existing CNI

Safely prepare each node for CNI replacement by draining workloads.

Cordon and drain each node before removing the old CNI:

```bash
# Cordon the target node to stop new scheduling
kubectl cordon <gce-node-name>

# Drain the node with a 3-minute timeout
kubectl drain <gce-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=180s

# SSH to the node and remove old CNI state
gcloud compute ssh <gce-node-name> --command="
  sudo rm -f /etc/cni/net.d/*
  sudo ip link delete cni0 2>/dev/null || true
  sudo systemctl restart kubelet
"
```

## Step 3: Install Calico with Native Routing

Configure Calico to use GCE VPC native routing for pod traffic.

Install the Tigera operator and configure Calico for native (non-encapsulated) routing:

```bash
# Install the Tigera operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
```

Create the Installation resource with native routing mode enabled:

```yaml
# calico-gce-installation.yaml - Calico native routing for GCE self-managed Kubernetes
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    # Native routing uses GCE VPC routes - no encapsulation overhead
    bgp: Enabled
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16    # Must not overlap with GCE VNet or service CIDRs
      encapsulation: None       # Use native GCE VPC routing
      natOutgoing: Enabled
      nodeSelector: all()
```

Apply the installation configuration:

```bash
kubectl create -f calico-gce-installation.yaml
```

## Step 4: Configure GCE Routes for Pod CIDRs

Calico will automatically create GCE VPC routes for pod CIDRs when using native routing with the `gce` cloud provider annotation.

Verify that Calico has programmed GCE VPC routes for each node's pod CIDR:

```bash
# List GCE routes created by Calico for pod networks
gcloud compute routes list \
  --filter="network=YOUR_VPC_NAME AND description~calico" \
  --format="table(name,destRange,nextHopInstance)"

# Check Calico node status to confirm route programming
calicoctl node status

# Verify IP pool allocation
calicoctl get ippools -o wide
```

## Step 5: Uncordon and Validate

Restore nodes to active scheduling and verify workload connectivity.

Uncordon nodes and test end-to-end pod connectivity:

```bash
# Uncordon the migrated node
kubectl uncordon <gce-node-name>

# Deploy a test pod to verify network connectivity
kubectl run nettest --image=nicolaka/netshoot --rm -it -- bash

# Inside the pod, test cross-node connectivity
ping <pod-on-another-node-ip>
curl http://kubernetes.default.svc.cluster.local
```

## Best Practices

- Use a block size of `/26` or larger to reduce the number of GCE VPC routes needed
- Enable Calico's node-to-node mesh for small clusters; use route reflectors for large clusters
- Set `natOutgoing: Enabled` on all IP pools to ensure pods can reach the internet
- Monitor GCE VPC route count against the quota limit using OneUptime custom monitors
- Apply Calico NetworkPolicies to enforce microsegmentation between namespaces after migration

## Conclusion

Migrating to Calico on self-managed GCE Kubernetes unlocks native VPC routing for pod traffic, eliminating encapsulation overhead and improving network performance. With GCE's VPC routing integration, Calico can achieve near-bare-metal network throughput while still providing rich network policy enforcement. Use OneUptime to monitor network health metrics and alert on routing anomalies after completing your migration.
