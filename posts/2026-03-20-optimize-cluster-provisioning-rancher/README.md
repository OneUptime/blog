# How to Optimize Cluster Provisioning Speed in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Provisioning, Performance, Kubernetes, Node Templates, Automation

Description: Speed up Rancher cluster provisioning by pre-caching images, optimizing node templates, using custom machine drivers, and parallelizing node bootstrapping.

## Introduction

Cluster provisioning time in Rancher depends on node boot time, image pull time, and Kubernetes component startup. In cloud environments, a new cluster can take 15-30 minutes with default settings. These optimizations can reduce that to 5-10 minutes.

## Step 1: Use Pre-Configured Node Images

Pre-bake Kubernetes images into your machine image (AMI, GCE Image) to eliminate image pull time during provisioning:

```bash
# On a base node, stage the RKE2 airgap artifacts so images
# are loaded on first start (no network pull needed).
sudo mkdir -p /var/lib/rancher/rke2/agent/images/
sudo cp rke2-images.linux-amd64.tar.zst \
  /var/lib/rancher/rke2/agent/images/

# Or run the airgap installer with all artifacts staged in one dir
# (rke2.linux-amd64.tar.gz, rke2-images.linux-amd64.tar.zst,
#  sha256sum-amd64.txt, install.sh).
sudo INSTALL_RKE2_ARTIFACT_PATH=/root/rke2-artifacts sh install.sh

# Package the resulting filesystem into the node image for your
# cloud provider. New nodes start with images pre-cached.
```

## Step 2: Optimize Node Template Configuration

```yaml
# Rancher Node Template (AWS example)
amazonec2Config:
  instanceType: t3.large
  ami: ami-PREBAKED-IMAGE      # AMI with Kubernetes images pre-loaded
  rootSize: "50"
  volumeType: gp3              # gp3 has better baseline performance than gp2
  iops: "3000"
  spotPrice: ""                # On-demand for production stability
  userdata: /path/to/userdata.sh   # File path; rancher-machine reads
                                   # this and passes it as EC2 user data.
```

```bash
# /path/to/userdata.sh - runs on first boot to prep the kernel for K8s
#!/bin/bash
# Disable swap (required for Kubernetes)
swapoff -a
sed -i '/swap/d' /etc/fstab
# Load kernel modules required for bridge netfilter sysctls
modprobe overlay
modprobe br_netfilter
# Configure sysctl settings required by Kubernetes
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.bridge.bridge-nf-call-iptables=1
```

## Step 3: Increase Provisioning Parallelism

Rancher's CAPR controller provisions each machine via its own Kubernetes Job (`rancher-machine create`), so machines in a pool already run in parallel. The real ceilings are cloud-provider API rate limits and machine pool size - not a Rancher knob. To provision a large cluster faster, split nodes across multiple machine pools and raise the pool's `quantity`:

```yaml
# Cluster v1 (provisioning.cattle.io) - multiple pools provision concurrently
spec:
  rkeConfig:
    machinePools:
      - name: workers-a
        quantity: 5
        machineConfigRef:
          kind: Amazonec2Config
          name: workers-a
      - name: workers-b
        quantity: 5
        machineConfigRef:
          kind: Amazonec2Config
          name: workers-b
```

## Step 4: Use RKE2 with Embedded Component Cache

RKE2 bundles all components as a self-contained archive, eliminating download time:

```bash
# On the Rancher UI when creating a cluster:
# Select "RKE2/K3s" as the cluster type
# Configure the RKE2 version
# RKE2 uses airgap bundles that eliminate network-dependent image pulls
```

## Step 5: Pre-Configure etcd Snapshots Schedule

Configure etcd snapshots after cluster creation to avoid post-provision pauses:

```yaml
# Rancher Cluster v1 (provisioning.cattle.io) - RKE2 cluster spec
spec:
  rkeConfig:
    etcd:
      snapshotScheduleCron: "0 */6 * * *"   # Every 6 hours
      snapshotRetention: 5
```

If you manage RKE2 directly via `/etc/rancher/rke2/config.yaml`, the equivalent flat keys are:

```yaml
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 5
```

## Step 6: Monitor Provisioning Progress

```bash
# Watch cluster provisioning events
kubectl get events -n cattle-system \
  --field-selector reason=ProvisioningSuccessful \
  --watch

# View Rancher provisioning logs
kubectl logs -n cattle-system rancher-xxxxx | grep -E "provision|cluster" | tail -50
```

## Conclusion

Cluster provisioning speed depends primarily on image pull time and node bootstrap time. Pre-baked AMIs with Kubernetes images are the single highest-impact optimization, reducing provisioning time by 5-10 minutes per cluster. Combined with parallel node provisioning and RKE2's self-contained bundles, you can provision a 10-node cluster in under 8 minutes.
