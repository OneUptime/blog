# How to Scale Rancher HA Nodes - Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, Scaling, etcd, Kubernetes, Capacity

Description: Scale Rancher HA from 3 to 5 or more server nodes, covering etcd expansion requirements, node join procedures, and load balancer updates.

## Introduction

Rancher HA clusters can be scaled to increase Rancher Server capacity, but etcd cluster size must always be an odd number (3, 5, 7) to maintain quorum. Scaling from 3 to 5 nodes increases fault tolerance to 2 simultaneous node failures rather than just 1.

## When to Scale

- Rancher Server CPU or memory is consistently above 70%
- You need to tolerate 2 simultaneous node failures
- Rancher Server pod scheduling is constrained to 3 nodes

## Step 1: Provision New Server Nodes

Add 2 new nodes (maintaining odd-number etcd membership):

```bash
# Provision 2 new nodes with the same specs as existing servers

# On each new node, install the base OS and configure:
# - Same time synchronization (NTP)
# - Same disk setup for etcd
# - Network connectivity to existing nodes
```

## Step 2: Join New Nodes to RKE2 Cluster

```bash
# On each new server node
curl -sfL https://get.rke2.io | sh -

mkdir -p /etc/rancher/rke2

cat > /etc/rancher/rke2/config.yaml << 'EOF'
server: https://10.0.0.10:9345    # Fixed registration address or load balancer VIP
token: <your-cluster-token>
tls-san:
  - rancher.example.com
  - 10.0.0.10    # Load balancer VIP
EOF

systemctl enable rke2-server.service
systemctl start rke2-server.service
```

## Step 3: Verify etcd Expansion

```bash
# Run from an RKE2 server node
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/var/lib/rancher/rke2/bin

# Wait for new nodes to join and etcd to sync
kubectl get nodes -w

# Verify 5 etcd members. This requires etcdctl installed on the server node.
ETCDCTL="etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key"

$ETCDCTL member list
# Should show 5 members, all started

$ETCDCTL endpoint health --cluster
# All 5 endpoints should show "is healthy"
```

## Step 4: Update Load Balancer Configuration

Add the two new nodes to the load balancer pool. If this load balancer is also the RKE2 fixed registration address, add the new nodes to the 9345 and 6443 backends as well:

```bash
# HAProxy - update backend
# Edit /etc/haproxy/haproxy.cfg
backend rancher_https_backend
    server rancher-node-1 10.0.0.11:443 check
    server rancher-node-2 10.0.0.12:443 check
    server rancher-node-3 10.0.0.13:443 check
    server rancher-node-4 10.0.0.14:443 check    # New nodes
    server rancher-node-5 10.0.0.15:443 check    # New nodes

systemctl reload haproxy
```

## Step 5: Scale Rancher Server Pods

Increase the Rancher Server replica count to match the available nodes:

```bash
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --reuse-values \
  --set replicas=5
```

## Step 6: Verify PodDisruptionBudget

Update the PDB to reflect the new cluster size:

```yaml
# rancher-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: rancher-pdb
  namespace: cattle-system
spec:
  minAvailable: 3    # Keep at least 3 of 5 available during maintenance
  selector:
    matchLabels:
      app: rancher
```

## Conclusion

Scaling Rancher HA from 3 to 5 nodes improves fault tolerance and distributes Rancher Server pods across more infrastructure. The etcd expansion happens automatically when new RKE2 server nodes join, but always verify the etcd member list shows all nodes as healthy before considering the scale operation complete.
