# How to Manage etcd Cluster Member Replacement Without Data Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, High Availability, Disaster Recovery

Description: Learn how to safely replace failed etcd cluster members without data loss, including member removal, addition, and disaster recovery procedures for Kubernetes control planes.

---

Replacing an etcd cluster member is a delicate operation. etcd stores all Kubernetes cluster state, and improper member replacement can cause data loss or cluster outages. This guide covers safe procedures for replacing unhealthy members, adding new members, and recovering from member failures without losing data.

## Understanding etcd Cluster Health

Before replacing a member, assess cluster health. An etcd cluster maintains consensus through the Raft protocol. A cluster needs a quorum (majority) of members to function. With 3 members, you can tolerate 1 failure. With 5 members, you can tolerate 2 failures.

Check cluster status:

```bash
# Export etcd endpoints and credentials
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key

# Check cluster health
etcdctl endpoint health --cluster

# Check member list
etcdctl member list -w table

# Check raft status
etcdctl endpoint status --cluster -w table
```

Expected output for a healthy 3-member cluster:

```
+------------------+---------+--------+-------+---------+
|    ENDPOINT      | HEALTHY | TOOK   | ERROR | VERSION |
+------------------+---------+--------+-------+---------+
| 10.0.1.10:2379   | true    | 12ms   |       | 3.5.9   |
| 10.0.1.11:2379   | true    | 14ms   |       | 3.5.9   |
| 10.0.1.12:2379   | true    | 13ms   |       | 3.5.9   |
+------------------+---------+--------+-------+---------+
```

## Identifying the Failed Member

Determine which member failed and whether the cluster has quorum:

```bash
# List members with detailed information
etcdctl member list -w json | jq '.'

# Check if any members are unresponsive
for endpoint in 10.0.1.10:2379 10.0.1.11:2379 10.0.1.12:2379; do
  echo "Checking $endpoint"
  etcdctl --endpoints=$endpoint endpoint health || echo "$endpoint is down"
done

# View etcd logs on each node
journalctl -u etcd -n 100 --no-pager

# Check for leader election issues
journalctl -u etcd | grep -i "leader\|election\|lost"
```

## Removing an Unhealthy Member

If a member is permanently failed and the cluster has quorum, remove it:

```bash
# Get the member ID
etcdctl member list

# Example output:
# 8e9e05c52164694d, started, etcd-0, https://10.0.1.10:2380, https://10.0.1.10:2379
# 2b2cec3d12cc4267, started, etcd-1, https://10.0.1.11:2380, https://10.0.1.11:2379
# 91bc3c398fb3c146, started, etcd-2, https://10.0.1.12:2380, https://10.0.1.12:2379

# Remove the failed member (use ID, not name)
etcdctl member remove 91bc3c398fb3c146

# Verify removal
etcdctl member list
```

Stop etcd on the removed member to prevent it from rejoining:

```bash
# On the failed node, stop etcd
sudo systemctl stop etcd
sudo systemctl disable etcd

# Optionally, archive the data directory
sudo mv /var/lib/etcd /var/lib/etcd.backup-$(date +%Y%m%d-%H%M%S)
```

## Adding a New Member

After removing the failed member, add a replacement:

```bash
# Add the new member (use new node's IP and name)
etcdctl member add etcd-2 \
  --peer-urls=https://10.0.1.20:2380

# The command returns important information:
# Member 3e4f5c6d7e8f9a0b added to cluster 1234567890abcdef
#
# ETCD_NAME="etcd-2"
# ETCD_INITIAL_CLUSTER="etcd-0=https://10.0.1.10:2380,etcd-1=https://10.0.1.11:2380,etcd-2=https://10.0.1.20:2380"
# ETCD_INITIAL_ADVERTISE_PEER_URLS="https://10.0.1.20:2380"
# ETCD_INITIAL_CLUSTER_STATE="existing"
```

Note that ETCD_INITIAL_CLUSTER_STATE must be "existing", not "new", when joining an existing cluster.

## Configuring the New etcd Member

On the new node, configure etcd with the parameters from the add command:

```bash
# Create etcd configuration
sudo mkdir -p /etc/etcd
sudo nano /etc/etcd/etcd.conf
```

Add this configuration:

```bash
# Member configuration
ETCD_NAME=etcd-2
ETCD_DATA_DIR=/var/lib/etcd
ETCD_LISTEN_PEER_URLS=https://10.0.1.20:2380
ETCD_LISTEN_CLIENT_URLS=https://10.0.1.20:2379,https://127.0.0.1:2379

# Advertised URLs
ETCD_INITIAL_ADVERTISE_PEER_URLS=https://10.0.1.20:2380
ETCD_ADVERTISE_CLIENT_URLS=https://10.0.1.20:2379

# Cluster configuration
ETCD_INITIAL_CLUSTER=etcd-0=https://10.0.1.10:2380,etcd-1=https://10.0.1.11:2380,etcd-2=https://10.0.1.20:2380
ETCD_INITIAL_CLUSTER_STATE=existing
ETCD_INITIAL_CLUSTER_TOKEN=etcd-cluster-1

# Security configuration
ETCD_CERT_FILE=/etc/kubernetes/pki/etcd/server.crt
ETCD_KEY_FILE=/etc/kubernetes/pki/etcd/server.key
ETCD_CLIENT_CERT_AUTH=true
ETCD_TRUSTED_CA_FILE=/etc/kubernetes/pki/etcd/ca.crt
ETCD_PEER_CERT_FILE=/etc/kubernetes/pki/etcd/peer.crt
ETCD_PEER_KEY_FILE=/etc/kubernetes/pki/etcd/peer.key
ETCD_PEER_CLIENT_CERT_AUTH=true
ETCD_PEER_TRUSTED_CA_FILE=/etc/kubernetes/pki/etcd/ca.crt
```

Create the systemd service:

```bash
sudo nano /etc/systemd/system/etcd.service
```

Add this content:

```ini
[Unit]
Description=etcd key-value store
Documentation=https://github.com/etcd-io/etcd
After=network.target

[Service]
Type=notify
EnvironmentFile=/etc/etcd/etcd.conf
ExecStart=/usr/local/bin/etcd
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Copy certificates from existing etcd members:

```bash
# On an existing etcd node, copy certificates to the new node
sudo scp /etc/kubernetes/pki/etcd/ca.crt 10.0.1.20:/etc/kubernetes/pki/etcd/
sudo scp /etc/kubernetes/pki/etcd/server.crt 10.0.1.20:/etc/kubernetes/pki/etcd/
sudo scp /etc/kubernetes/pki/etcd/server.key 10.0.1.20:/etc/kubernetes/pki/etcd/
sudo scp /etc/kubernetes/pki/etcd/peer.crt 10.0.1.20:/etc/kubernetes/pki/etcd/
sudo scp /etc/kubernetes/pki/etcd/peer.key 10.0.1.20:/etc/kubernetes/pki/etcd/

# On the new node, set proper permissions
sudo chown -R root:root /etc/kubernetes/pki/etcd
sudo chmod 600 /etc/kubernetes/pki/etcd/*.key
sudo chmod 644 /etc/kubernetes/pki/etcd/*.crt
```

Start the new member:

```bash
# Start etcd
sudo systemctl daemon-reload
sudo systemctl enable etcd
sudo systemctl start etcd

# Check status
sudo systemctl status etcd

# View logs
journalctl -u etcd -f
```

## Verifying Cluster Recovery

Confirm the new member joined successfully:

```bash
# List members
etcdctl member list -w table

# Check cluster health
etcdctl endpoint health --cluster

# Verify data replication
etcdctl endpoint status --cluster -w table

# The DB SIZE should be similar across all members
```

Test cluster functionality:

```bash
# Write a test key
etcdctl put /test/key "test value"

# Read from each member
for endpoint in 10.0.1.10:2379 10.0.1.11:2379 10.0.1.20:2379; do
  echo "Reading from $endpoint"
  etcdctl --endpoints=$endpoint get /test/key
done

# Delete test key
etcdctl del /test/key
```

## Handling Split-Brain Scenarios

If the cluster loses quorum due to network partitions, recover carefully:

```bash
# Identify which members are in the majority partition
etcdctl member list

# If no partition has quorum, force a new cluster from a healthy member
# WARNING: This can cause data loss. Only do this as a last resort.

# On the member with the most recent data:
sudo systemctl stop etcd

# Add this flag to etcd configuration
ETCD_FORCE_NEW_CLUSTER=true

# Start etcd
sudo systemctl start etcd

# Verify single-member cluster
etcdctl member list

# Remove the forced flag
# Edit /etc/etcd/etcd.conf and remove ETCD_FORCE_NEW_CLUSTER

# Restart etcd
sudo systemctl restart etcd

# Now add other members back one at a time
etcdctl member add etcd-1 --peer-urls=https://10.0.1.11:2380
# Configure and start etcd on the second node...
```

## Replacing Multiple Members

When replacing multiple members, do it one at a time:

```bash
# Never replace more members than the cluster can tolerate
# For a 3-member cluster, replace only 1 at a time
# For a 5-member cluster, replace only 2 at a time

# Step 1: Remove first failed member
etcdctl member remove <member-1-id>

# Step 2: Add replacement member
etcdctl member add new-member-1 --peer-urls=https://10.0.1.20:2380

# Step 3: Wait for new member to sync
etcdctl endpoint status --cluster -w table

# Step 4: Only after the first replacement is healthy, proceed with the next
etcdctl member remove <member-2-id>
etcdctl member add new-member-2 --peer-urls=https://10.0.1.21:2380
```

## Updating Kubernetes API Server Configuration

After replacing etcd members, update the Kubernetes API server configuration:

```bash
# Edit API server manifest
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml

# Update the etcd-servers flag with new endpoints
# --etcd-servers=https://10.0.1.10:2379,https://10.0.1.11:2379,https://10.0.1.20:2379

# The API server will automatically restart
# Verify it's connecting to all etcd members
kubectl get nodes
```

## Monitoring etcd After Member Replacement

Set up monitoring to catch issues early:

```bash
# Monitor etcd logs continuously
journalctl -u etcd -f | grep -E "error|warning|leader|election"

# Check for slow operations
etcdctl check perf

# Monitor disk usage
df -h /var/lib/etcd

# Track Raft message flow
etcdctl endpoint status --cluster -w json | \
  jq '.[] | {endpoint: .Endpoint, leader: .Status.leader, raftIndex: .Status.raftIndex}'

# Set up Prometheus alerts
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: etcd-alerts
  namespace: monitoring
data:
  rules.yml: |
    groups:
    - name: etcd
      rules:
      - alert: EtcdMemberDown
        expr: up{job="etcd"} == 0
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "etcd member {{ \$labels.instance }} is down"

      - alert: EtcdNoLeader
        expr: etcd_server_has_leader == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "etcd cluster has no leader"
EOF
```

## Automating Member Replacement

Create a script to automate safe member replacement:

```bash
#!/bin/bash
# replace-etcd-member.sh

set -e

OLD_MEMBER_ID=$1
NEW_MEMBER_NAME=$2
NEW_MEMBER_IP=$3

if [ -z "$OLD_MEMBER_ID" ] || [ -z "$NEW_MEMBER_NAME" ] || [ -z "$NEW_MEMBER_IP" ]; then
  echo "Usage: $0 <old-member-id> <new-member-name> <new-member-ip>"
  exit 1
fi

# Check cluster has quorum
if ! etcdctl endpoint health --cluster > /dev/null 2>&1; then
  echo "ERROR: Cluster does not have quorum. Aborting."
  exit 1
fi

# Remove old member
echo "Removing member $OLD_MEMBER_ID..."
etcdctl member remove $OLD_MEMBER_ID

# Add new member
echo "Adding new member $NEW_MEMBER_NAME at $NEW_MEMBER_IP..."
etcdctl member add $NEW_MEMBER_NAME \
  --peer-urls=https://$NEW_MEMBER_IP:2380

echo "Member replacement initiated. Configure and start etcd on the new node."
echo "Use ETCD_INITIAL_CLUSTER_STATE=existing"
```

Member replacement is a critical operation that requires careful execution. Always verify cluster health before and after replacement, replace only one member at a time, and ensure the cluster maintains quorum throughout the process.
