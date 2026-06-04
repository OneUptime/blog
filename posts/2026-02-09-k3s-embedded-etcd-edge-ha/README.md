# How to Configure K3s with Embedded etcd for High Availability at the Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, k3s, Edge Computing

Description: Learn how to set up a highly available K3s cluster using embedded etcd at the edge, eliminating the need for external databases while maintaining resilience in resource-constrained environments.

---

K3s is designed for edge deployments, but achieving high availability in edge environments presents unique challenges. Traditional HA Kubernetes often requires more control-plane and datastore planning, adding complexity and resource overhead that edge locations often can't afford.

K3s solves this with embedded etcd, allowing you to build HA clusters without external dependencies. In this guide, you'll learn how to deploy a multi-master K3s cluster using embedded etcd, perfect for edge locations that need resilience without operational overhead.

## Understanding Embedded etcd in K3s

By default, K3s uses SQLite for its datastore, which works great for single-server setups but doesn't support clustering. For high availability, K3s can use either an external database (PostgreSQL, MySQL) or embedded etcd.

Embedded etcd means each K3s server node runs its own etcd member as part of the K3s process. The etcd cluster forms automatically, and K3s handles all the etcd management. You get HA without managing a separate etcd cluster.

This architecture is perfect for edge environments where you want redundancy but can't dedicate resources to external infrastructure.

## Planning Your HA Edge Cluster

For a highly available K3s cluster at the edge, you need:

- At least 3 server nodes (masters) for quorum
- Odd number of servers (3, 5, or 7) for etcd voting
- Nodes should be on the same local network for low latency
- At least 2GB RAM and 2 CPU cores per server node
- Persistent storage on each server node

For this guide, we'll set up a 3-node cluster on edge servers at a retail location.

## Installing the First Server Node

The first server node initializes the cluster and etcd. SSH to your first node and run:

```bash
# Set cluster initialization flag

curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --tls-san edge-cluster.local \
  --tls-san 192.168.1.10 \
  --write-kubeconfig-mode 644

# --cluster-init: Initialize embedded etcd
# --tls-san: Additional names/IPs for the API server certificate
```

This installs K3s and starts it as a systemd service. The `--cluster-init` flag tells K3s to use embedded etcd and expect additional server nodes to join.

Check the node status:

```bash
kubectl get nodes
sudo systemctl status k3s
```

You should see one server node in Ready state.

Retrieve the join token that other servers will use:

```bash
sudo cat /var/lib/rancher/k3s/server/token
```

Save this token securely. You'll need it to join additional servers.

## Joining Additional Server Nodes

On your second server node, install K3s and join the cluster:

```bash
# Replace with your first server's IP and token
export K3S_TOKEN="K10abc123...::server:def456..."
export K3S_URL="https://192.168.1.10:6443"

curl -sfL https://get.k3s.io | sh -s - server \
  --server ${K3S_URL} \
  --token ${K3S_TOKEN} \
  --tls-san edge-cluster.local \
  --tls-san 192.168.1.11
```

The `--server` flag tells this node to join an existing cluster rather than starting a new one. K3s automatically adds this node to the etcd cluster.

Wait 30-60 seconds for the node to join, then check cluster status from any server:

```bash
kubectl get nodes
```

Repeat this process on your third server node:

```bash
export K3S_TOKEN="K10abc123...::server:def456..."
export K3S_URL="https://192.168.1.10:6443"

curl -sfL https://get.k3s.io | sh -s - server \
  --server ${K3S_URL} \
  --token ${K3S_TOKEN} \
  --tls-san edge-cluster.local \
  --tls-san 192.168.1.12
```

Now you have a 3-node HA cluster. All three servers can schedule workloads and handle API requests.

## Verifying etcd Cluster Health

K3s does not bundle etcdctl, but you can install it and use the certificates that K3s manages for embedded etcd. Check etcd member status:

```bash
# Install etcdctl
ETCD_VERSION="v3.5.5"
ETCD_URL="https://github.com/etcd-io/etcd/releases/download/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz"
curl -sL ${ETCD_URL} | sudo tar -zxv --strip-components=1 -C /usr/local/bin

# List local snapshots
sudo k3s etcd-snapshot list

# Take an on-demand snapshot
sudo k3s etcd-snapshot save

# View etcd cluster status
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/k3s/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/k3s/server/tls/etcd/client.key \
  endpoint health --cluster
```

You should see all three endpoints reporting healthy.

## Configuring a Load Balancer

For true HA, clients and agent nodes should connect through a load balancer that distributes requests across all server nodes.

Install HAProxy on a separate host or use a hardware load balancer:

```bash
# Install HAProxy
sudo apt update
sudo apt install haproxy -y

# Configure HAProxy
sudo tee /etc/haproxy/haproxy.cfg > /dev/null <<EOF
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend k3s_api
    bind *:6443
    mode tcp
    default_backend k3s_servers

backend k3s_servers
    mode tcp
    balance roundrobin
    option tcp-check
    # Health check the API server
    tcp-check connect port 6443
    server server1 192.168.1.10:6443 check fall 3 rise 2
    server server2 192.168.1.11:6443 check fall 3 rise 2
    server server3 192.168.1.12:6443 check fall 3 rise 2
EOF

# Restart HAProxy
sudo systemctl restart haproxy
sudo systemctl enable haproxy
```

Now clients can connect to the load balancer IP instead of individual servers.

## Joining Agent Nodes

Add worker nodes (agents) that connect through the load balancer:

```bash
# On each agent node
export K3S_TOKEN="K10abc123...::server:def456..."
export K3S_URL="https://192.168.1.100:6443"  # Load balancer IP

curl -sfL https://get.k3s.io | sh -s - agent \
  --server ${K3S_URL} \
  --token ${K3S_TOKEN}
```

Agent nodes connect to the API through HAProxy, which automatically handles server failures by routing to healthy servers.

## Implementing Automated etcd Backups

Configure automatic etcd snapshots to protect against data loss:

```bash
# On each server node, add a K3s configuration drop-in
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/90-etcd-snapshots.yaml > /dev/null <<EOF
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 10
etcd-snapshot-dir: /var/lib/rancher/k3s/server/db/snapshots
EOF

sudo systemctl restart k3s
```

This takes etcd snapshots every 6 hours and retains the last 10 snapshots.

For remote backups, configure S3 storage:

```bash
# Add S3 configuration
sudo tee /etc/rancher/k3s/config.yaml.d/91-etcd-s3.yaml > /dev/null <<EOF
etcd-s3: true
etcd-s3-access-key: your-access-key
etcd-s3-secret-key: your-secret-key
etcd-s3-bucket: k3s-edge-backups
etcd-s3-region: us-east-1
etcd-s3-folder: edge-site-01
EOF

sudo systemctl restart k3s
```

Snapshots now upload to S3 automatically.

## Testing High Availability

Verify your HA setup by simulating failures:

```bash
# Test 1: Stop one server
sudo systemctl stop k3s

# From another server, verify cluster still works
kubectl get nodes
kubectl run test-pod --image=nginx

# The cluster should remain operational with 2/3 servers

# Restart the server
sudo systemctl start k3s
```

Test API availability:

```bash
# Test 2: Shut down the server you're connecting to
# If using the load balancer, your kubectl commands should continue working

# Test 3: Stop two servers (losing quorum)
# The API will generally become unavailable until quorum is restored
# Existing workloads may continue running on healthy nodes, but you can't make changes
```

## Restoring from etcd Backup

If you need to restore from a snapshot:

```bash
# Stop K3s on all servers
sudo systemctl stop k3s

# On the first server, restore from snapshot
sudo k3s server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/k3s/server/db/snapshots/etcd-snapshot-2026-02-09

# This restores the data and prepares for cluster reformation

# Restart K3s on the first server
sudo systemctl start k3s

# On other servers, delete old data and rejoin
sudo rm -rf /var/lib/rancher/k3s/server/db/
sudo systemctl start k3s
```

The cluster rebuilds with the restored data.

## Monitoring etcd Health

Set up monitoring for your embedded etcd cluster:

```bash
# Check the API server readiness endpoint, including its etcd check
kubectl get --raw='/readyz?verbose'

# Check etcd directly from a server node
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/k3s/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/k3s/server/tls/etcd/client.key \
  endpoint status --cluster --write-out=table
```

You can run these checks from your monitoring system and alert if the readiness endpoint fails or etcd endpoints report unhealthy status.

## Handling Server Node Failures

When a server node fails permanently:

1. Remove the failed node from the cluster
2. Add a new server to maintain 3-node quorum

Remove a failed node:

```bash
# From a healthy server, get the etcd member ID
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/k3s/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/k3s/server/tls/etcd/client.key \
  member list

# Remove the failed member
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/k3s/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/k3s/server/tls/etcd/client.key \
  member remove <member-id>

# Delete the Kubernetes node
kubectl delete node <failed-node-name>
```

Add a replacement server:

```bash
# On the new server
export K3S_TOKEN="K10abc123...::server:def456..."
export K3S_URL="https://192.168.1.10:6443"

curl -sfL https://get.k3s.io | sh -s - server \
  --server ${K3S_URL} \
  --token ${K3S_TOKEN}
```

## Optimizing for Edge Constraints

For resource-constrained edge environments, tune K3s:

```bash
# Reduce resource usage
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --kube-apiserver-arg='max-requests-inflight=100' \
  --kube-apiserver-arg='max-mutating-requests-inflight=50' \
  --etcd-arg='quota-backend-bytes=2147483648'  # 2GB etcd limit
```

These settings reduce memory usage while maintaining HA capabilities.

## Conclusion

K3s with embedded etcd brings enterprise-grade high availability to edge environments without the operational burden of managing external infrastructure. By following these patterns, you create resilient edge clusters that survive individual node failures while remaining simple to operate.

Start with three nodes for basic HA, monitor etcd health carefully, and implement regular backups to protect against data loss. This foundation supports reliable edge computing for industrial IoT, retail, healthcare, and other distributed environments where downtime is costly.
