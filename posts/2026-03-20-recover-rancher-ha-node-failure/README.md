# How to Recover from Rancher HA Node Failure - Recover Node Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Recovery, High Availability, etcd, Node Failure, Disaster Recovery

Description: Step-by-step recovery procedures for Rancher HA when a server node fails, including etcd member removal, node replacement, and cluster re-join procedures.

## Introduction

When a Rancher HA server node fails permanently, you need to remove it from the cluster, provision a replacement, and add it back. The procedure differs slightly between RKE2 and K3s but follows the same conceptual steps. The examples below use RKE2 paths and service names; for K3s, use the equivalent `/var/lib/rancher/k3s/...` paths and `k3s` services.

## Step 1: Assess the Failure

```bash
# Check cluster health from a working server node

kubectl get nodes

# Check etcd member status
ETCDCTL="etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key"

$ETCDCTL member list

# Example output showing failed member:
# 4e3a0ef13e1e0de5, started, server-1, https://10.0.0.11:2380, ...  <- Failed
# 7b891c4d58e33f91, started, server-2, https://10.0.0.12:2380, ...  <- Healthy
# 9f45ef213d2c0ab7, started, server-3, https://10.0.0.13:2380, ...  <- Healthy
```

## Step 2: Remove the Failed etcd Member

**Important**: Only attempt this if quorum is maintained. In a 3-server cluster, that means at least 2 healthy etcd members.

```bash
# Get the member ID of the failed node
FAILED_MEMBER_ID="4e3a0ef13e1e0de5"

# Remove the failed member from etcd
$ETCDCTL member remove $FAILED_MEMBER_ID

# Verify it's removed
$ETCDCTL member list
```

## Step 3: Remove the Failed Node from Kubernetes

```bash
# Delete the node from Kubernetes
kubectl delete node server-1

# Verify it's removed
kubectl get nodes
```

## Step 4: Clean Up Rancher Agent References

```bash
# Remove the failed node from Rancher's node inventory
# In Rancher UI: Cluster Management > <cluster> > Nodes > Delete the failed node
# If the cluster was provisioned through Rancher machine pools, use Rancher's Delete action
# for the node instead of deleting Kubernetes Machine resources directly with kubectl.
```

## Step 5: Provision a Replacement Node

Provision a new node with the same specifications as the failed node. For cloud environments:

```bash
# AWS example: Launch a new instance with the same specs
aws ec2 run-instances \
  --image-id ami-0123456789abcdef0 \
  --instance-type t3.xlarge \
  --subnet-id subnet-12345678 \
  --security-group-ids sg-12345678
```

## Step 6: Join the Replacement Node (RKE2)

```bash
# On the new replacement node
curl -sfL https://get.rke2.io | sh -

# Use the existing cluster token
cat > /etc/rancher/rke2/config.yaml << 'EOF'
server: https://10.0.0.10:9345    # Prefer the stable registration address / load balancer
token: <cluster-token>
tls-san:
  - rancher.example.com
  - 10.0.0.10
# Only include node-taint if your existing server nodes use the same taint:
# node-taint:
#   - "CriticalAddonsOnly=true:NoExecute"
EOF

systemctl enable rke2-server.service
systemctl start rke2-server.service
```

## Step 7: Verify Recovery

```bash
# Verify all three nodes are back in the cluster
kubectl get nodes

# Verify etcd has 3 healthy members
$ETCDCTL member list
$ETCDCTL endpoint status --cluster -w table
$ETCDCTL endpoint health --cluster

# Verify Rancher pods are running
kubectl get pods -n cattle-system
```

## Conclusion

Recovering from a Rancher HA node failure is straightforward when 2 of 3 nodes remain healthy (quorum is maintained). The key steps are: remove the failed etcd member, delete the Kubernetes node, provision a replacement, and re-join. This process typically takes 15-30 minutes depending on node boot time.
