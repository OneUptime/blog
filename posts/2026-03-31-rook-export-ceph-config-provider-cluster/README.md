# How to Export Ceph Config from a Provider Cluster for Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, External Cluster, Provider, Configuration

Description: Learn how to export the Ceph configuration and credentials from a provider cluster so a Rook consumer cluster can connect to it as an external Ceph deployment.

---

## Overview

Rook supports an external cluster mode where a Kubernetes cluster uses a Ceph cluster managed outside of Rook. The provider cluster (the existing Ceph deployment) must export specific configuration data - including monitor addresses, admin keys, and pool/user credentials - so the Rook consumer cluster can connect. This guide walks through the export process.

## Understanding Provider and Consumer Roles

In the Rook external cluster model:

- **Provider**: the existing Ceph cluster (may be managed by Rook in another namespace/cluster, or by cephadm)
- **Consumer**: the Kubernetes cluster running Rook that connects to the provider

The consumer needs: monitor endpoints, a client keyring with appropriate permissions, RBD pool names, and optionally CephFS filesystem details.

## Step 1 - Install the Export Script

Rook provides a Python script to automate config export. Download it from the Rook release:

```bash
curl -O https://raw.githubusercontent.com/rook/rook/master/deploy/examples/create-external-cluster-resources.py
```

## Step 2 - Run the Export Script on the Provider

Execute the script on the provider cluster (or from a host with admin Ceph access):

```bash
python3 create-external-cluster-resources.py \
  --rbd-data-pool-name replicapool \
  --namespace rook-ceph-external \
  --format bash
```

The script creates Ceph users, keys, and outputs a shell script of `kubectl create secret` and `kubectl apply` commands:

```bash
# Sample output from the script
export ROOK_EXTERNAL_FSID=<cluster-fsid>
export ROOK_EXTERNAL_USERNAME=client.healthchecker
export ROOK_EXTERNAL_CEPH_MON_DATA=a=192.168.1.1:6789,b=192.168.1.2:6789
export ROOK_EXTERNAL_USER_SECRET=<keyring>
export CSI_RBD_NODE_SECRET=<node-secret>
export CSI_RBD_PROVISIONER_SECRET=<provisioner-secret>
```

## Step 3 - Export with CephFS Support

If the consumer needs access to a CephFS filesystem, add the filesystem flag:

```bash
python3 create-external-cluster-resources.py \
  --rbd-data-pool-name replicapool \
  --cephfs-filesystem-name myfs \
  --namespace rook-ceph-external \
  --format bash
```

## Step 4 - Export Credentials for Multiple Pools

The `--rbd-data-pool-name` flag accepts a single pool name, so for environments with multiple RBD pools, run the script separately for each pool:

```bash
python3 create-external-cluster-resources.py \
  --rbd-data-pool-name pool1 \
  --namespace rook-ceph-external \
  --format bash > external-cluster-pool1.sh

python3 create-external-cluster-resources.py \
  --rbd-data-pool-name pool2 \
  --namespace rook-ceph-external \
  --format bash > external-cluster-pool2.sh
```

For topology-constrained pools, use the `--topology-pools` flag which accepts a comma-separated list:

```bash
python3 create-external-cluster-resources.py \
  --topology-pools pool1,pool2,pool3 \
  --topology-failure-domain-label topology.kubernetes.io/zone \
  --topology-failure-domain-values zone-a,zone-b,zone-c \
  --namespace rook-ceph-external \
  --format bash
```

## Step 5 - Save the Output

Save the exported configuration to a file for import into the consumer cluster:

```bash
python3 create-external-cluster-resources.py \
  --rbd-data-pool-name replicapool \
  --namespace rook-ceph-external \
  --format bash > external-cluster-config.sh
```

Review the file to confirm all monitor endpoints and user secrets are correct:

```bash
cat external-cluster-config.sh
```

## Verifying Exported Credentials on the Provider

Confirm the created Ceph users exist and have correct permissions:

```bash
ceph auth list | grep client.healthchecker
ceph auth get client.healthchecker
ceph auth get client.csi-rbd-provisioner
ceph auth get client.csi-rbd-node
```

## Summary

Exporting Ceph config from a provider cluster involves running Rook's `create-external-cluster-resources.py` script with the appropriate pool and filesystem parameters. The script creates dedicated Ceph users with minimal required permissions and outputs the secrets and CRDs needed by the consumer cluster. Always verify the exported user keyrings against the provider's auth list before applying them to the consumer cluster.
