# How to Set Up Harvester Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Cluster

Description: Learn how to set up a multi-node Harvester HCI cluster with high availability for production virtual machine workloads.

## Introduction

A Harvester cluster provides the foundation for running virtual machines at scale with built-in high availability. While a single node works for testing, production deployments require at least three nodes to achieve control plane HA and support Harvester's multi-node VM recovery and live migration features. This guide walks through setting up a production-ready three-node Harvester cluster.

## Cluster Architecture

A typical Harvester cluster consists of:

```mermaid
graph TD
    VIP["Cluster VIP (192.168.1.100)"] --> Node1
    VIP --> Node2
    VIP --> Node3
    Node1["Node 1 - Seed Node\n192.168.1.11"] --> Storage["Longhorn Distributed Storage"]
    Node2["Node 2\n192.168.1.12"] --> Storage
    Node3["Node 3\n192.168.1.13"] --> Storage
```

Each node runs:
- RKE2 Kubernetes (control plane + worker)
- Longhorn storage agent
- KubeVirt for VM management
- Multus CNI for VM networking

## Prerequisites

- Three physical servers (minimum) meeting hardware requirements
- A shared management network with static IPs available
- One additional IP for the cluster VIP
- Matching CPU specifications across nodes if you plan to use live migration
- Synchronized system clocks (NTP configured)

## Step 1: Plan Your Network Layout

Before installation, document your network plan:

```text
# Cluster Network Plan

Cluster VIP:     192.168.1.100  (Kubernetes API + Harvester UI)
Node 1 (seed):   192.168.1.11
Node 2:          192.168.1.12
Node 3:          192.168.1.13
Gateway:         192.168.1.1
DNS:             8.8.8.8
Cluster Token:   my-secure-cluster-token-2024
```

## Step 2: Install the First (Seed) Node

Boot the first server from Harvester installation media and select **Create a new Harvester cluster**:

```yaml
# Configuration for the seed node
# During installation, provide these values:

Management Interface: eth0
IP Address: 192.168.1.11/24
Gateway: 192.168.1.1
DNS: 8.8.8.8

Cluster VIP: 192.168.1.100
VIP Mode: Static

Cluster Token: my-secure-cluster-token-2024
Hostname: harvester-node-01

Installation Disk: /dev/sda
Data Disk: /dev/sdb
```

Wait for the seed node installation to complete and the node to reboot. Verify it's accessible at `https://192.168.1.100` before proceeding.

## Step 3: Add the Second Node

Boot the second server and select **Join an existing Harvester cluster**:

```yaml
# Configuration for node 2

Management Interface: eth0
IP Address: 192.168.1.12/24
Gateway: 192.168.1.1
DNS: 8.8.8.8

# URL of the existing cluster
Server URL: https://192.168.1.100:443

# Must match the token set on the seed node
Cluster Token: my-secure-cluster-token-2024

Role: Default Role
Hostname: harvester-node-02
Installation Disk: /dev/sda
Data Disk: /dev/sdb
```

## Step 4: Add the Third Node

Repeat the same process for node 3:

```yaml
# Configuration for node 3

Management Interface: eth0
IP Address: 192.168.1.13/24
Gateway: 192.168.1.1
DNS: 8.8.8.8

Server URL: https://192.168.1.100:443
Cluster Token: my-secure-cluster-token-2024

Role: Default Role
Hostname: harvester-node-03
Installation Disk: /dev/sda
Data Disk: /dev/sdb
```

## Step 5: Verify the Cluster

Once all three nodes have joined, verify the cluster is healthy:

```bash
# SSH into any node
ssh rancher@192.168.1.11

# Set kubeconfig
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

# All three nodes should show Ready status
kubectl get nodes
```

```bash
# Verify Harvester system components
kubectl get pods -n harvester-system

# Verify Longhorn storage is healthy (all 3 nodes should appear)
kubectl get nodes.longhorn.io -n longhorn-system

# Verify etcd has 3 members (quorum)
kubectl exec -n kube-system -it etcd-harvester-node-01 -- \
    etcdctl --cacert /var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
            --cert /var/lib/rancher/rke2/server/tls/etcd/server-client.crt \
            --key /var/lib/rancher/rke2/server/tls/etcd/server-client.key \
            member list
```

## Step 6: Configure NTP Synchronization

All nodes must have synchronized clocks for etcd and distributed systems:

```bash
# Check current time sync status on each node
timedatectl status

# Configure cluster-wide NTP servers in Harvester:
# Advanced > Settings > ntp-servers
# Example value:
# {
#   "ntpServers": [
#     "0.suse.pool.ntp.org",
#     "1.suse.pool.ntp.org"
#   ]
# }

# Verify the node annotation includes node.harvesterhci.io/ntp-service
kubectl get node harvester-node-01 -o yaml | grep 'node.harvesterhci.io/ntp-service'

# Verify sync
timedatectl timesync-status
```

## Step 7: Configure the Cluster from the UI

Open `https://192.168.1.100` and configure basic cluster settings:

### Set Up Backup Target

Navigate to **Settings > Backup Target** to configure S3 or NFS backup:

```yaml
# S3 Backup Target Example
Type: S3
Endpoint: https://s3.amazonaws.com
Bucket Name: my-harvester-backups
Region: us-east-1
Access Key ID: AKIAIOSFODNN7EXAMPLE
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Configure SSL Certificate (Optional)

For a trusted certificate, navigate to **Settings > SSL Certificates** and upload your certificate and private key.

## Step 8: Validate High Availability

Test control plane HA by simulating a management node failure:

```bash
# On a management node that will remain online, verify the VIP/API responds
curl -fk https://192.168.1.100/version

# On the management node you want to test, stop the management service
sudo systemctl stop rke2-server

# Back on the healthy management node, verify the VIP/API still responds
curl -fk https://192.168.1.100/version

# Verify the cluster is still accessible from a healthy management node
kubectl get nodes
```

The management URL should remain reachable from another healthy management node while the failed node is down.

## Cluster Sizing Recommendations

| Cluster Size | Use Case | Min RAM/Node | Min Storage/Node |
|---|---|---|---|
| 1 node | Development/Testing | 32 GB | 500 GB |
| 3 nodes | Production HA | 64 GB | 1 TB |
| 5+ nodes | Large Production | 128 GB | 2 TB |

## Conclusion

You now have a three-node Harvester cluster with a highly available management plane and multi-node VM capabilities. With three management nodes, the cluster can tolerate a single node failure without losing access to the API. During an unexpected node failure, VMs on that node are restarted or rescheduled based on Harvester settings rather than live-migrated in place. As your workload grows, you can add more nodes to increase compute and storage capacity. The cluster forms the foundation for deploying virtual machines, integrating with Rancher, and running Kubernetes workloads side by side with VMs.
