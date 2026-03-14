# How to Set Up External etcd Clusters for Kubernetes High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, High Availability

Description: Learn how to deploy external etcd clusters for Kubernetes high availability, including installation, configuration, backup strategies, and monitoring for production-grade cluster state management.

---

External etcd clusters provide the highest level of resilience for Kubernetes control planes by separating the state storage layer from the API servers. This architecture allows you to scale etcd independently, perform maintenance without affecting the control plane, and implement more robust disaster recovery strategies.

This guide walks through setting up a production-ready external etcd cluster for Kubernetes high availability.

## Understanding External etcd Architecture

In an external etcd topology, etcd runs on dedicated nodes separate from the Kubernetes control plane. This provides several advantages:

- **Independent scaling**: Scale etcd based on cluster size without affecting API servers
- **Isolation**: etcd failures don't directly impact control plane nodes
- **Simplified maintenance**: Upgrade etcd without touching control plane components
- **Better resource allocation**: Dedicated resources for state storage
- **Enhanced security**: Isolate sensitive cluster state on separate infrastructure

Typical setup uses 3 or 5 etcd nodes (always odd numbers for quorum).

## Planning Your etcd Cluster

For production deployments, follow these guidelines:

**Hardware requirements per node:**
- CPU: 4 cores minimum (8 for large clusters)
- RAM: 8GB minimum (16GB+ for large clusters)
- Disk: SSD required, 50GB minimum (100GB+ recommended)
- Network: Low latency between nodes (< 10ms RTT)

**Node count:**
- 3 nodes: Tolerates 1 failure
- 5 nodes: Tolerates 2 failures
- 7+ nodes: Rarely needed, adds overhead

## Installing etcd on Dedicated Nodes

Set up three dedicated etcd nodes. On each node:

```bash
# Download etcd
ETCD_VER=v3.5.10
wget https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz

# Extract and install
tar xzvf etcd-${ETCD_VER}-linux-amd64.tar.gz
sudo mv etcd-${ETCD_VER}-linux-amd64/etcd* /usr/local/bin/

# Verify installation
etcd --version
etcdctl version

# Create etcd user and directories
sudo useradd -r -s /sbin/nologin etcd
sudo mkdir -p /var/lib/etcd
sudo mkdir -p /etc/etcd
sudo chown -R etcd:etcd /var/lib/etcd
sudo chown -R etcd:etcd /etc/etcd
```

## Generating TLS Certificates

etcd requires TLS for secure communication. Generate certificates using cfssl or kubeadm:

```bash
# Install cfssl tools
sudo apt-get install golang-cfssl

# Create CA configuration
cat > ca-config.json <<EOF
{
  "signing": {
    "default": {
      "expiry": "8760h"
    },
    "profiles": {
      "etcd": {
        "usages": ["signing", "key encipherment", "server auth", "client auth"],
        "expiry": "8760h"
      }
    }
  }
}
EOF

# Create CA certificate request
cat > ca-csr.json <<EOF
{
  "CN": "etcd-ca",
  "key": {
    "algo": "rsa",
    "size": 2048
  }
}
EOF

# Generate CA certificate
cfssl gencert -initca ca-csr.json | cfssljson -bare ca

# Create etcd server certificate request
# Replace IP addresses with your etcd node IPs
cat > etcd-csr.json <<EOF
{
  "CN": "etcd",
  "hosts": [
    "localhost",
    "127.0.0.1",
    "10.0.1.10",
    "10.0.1.11",
    "10.0.1.12",
    "etcd-1.example.com",
    "etcd-2.example.com",
    "etcd-3.example.com"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  }
}
EOF

# Generate etcd server certificate
cfssl gencert -ca=ca.pem -ca-key=ca-key.pem -config=ca-config.json -profile=etcd etcd-csr.json | cfssljson -bare etcd

# Copy certificates to etcd directory
sudo cp ca.pem etcd.pem etcd-key.pem /etc/etcd/
sudo chown etcd:etcd /etc/etcd/*.pem
sudo chmod 600 /etc/etcd/*-key.pem
```

## Configuring etcd Cluster

Create etcd configuration on each node. For node 1:

```bash
# /etc/etcd/etcd.conf.yml
name: 'etcd-1'
data-dir: /var/lib/etcd
wal-dir: /var/lib/etcd/wal
snapshot-count: 10000
heartbeat-interval: 100
election-timeout: 1000
quota-backend-bytes: 8589934592  # 8GB
listen-peer-urls: 'https://10.0.1.10:2380'
listen-client-urls: 'https://10.0.1.10:2379,https://127.0.0.1:2379'
max-snapshots: 5
max-wals: 5
initial-advertise-peer-urls: 'https://10.0.1.10:2380'
advertise-client-urls: 'https://10.0.1.10:2379'
initial-cluster: 'etcd-1=https://10.0.1.10:2380,etcd-2=https://10.0.1.11:2380,etcd-3=https://10.0.1.12:2380'
initial-cluster-token: 'etcd-cluster-1'
initial-cluster-state: 'new'
enable-v2: false
enable-pprof: true
client-transport-security:
  cert-file: /etc/etcd/etcd.pem
  key-file: /etc/etcd/etcd-key.pem
  client-cert-auth: true
  trusted-ca-file: /etc/etcd/ca.pem
  auto-tls: false
peer-transport-security:
  cert-file: /etc/etcd/etcd.pem
  key-file: /etc/etcd/etcd-key.pem
  client-cert-auth: true
  trusted-ca-file: /etc/etcd/ca.pem
  auto-tls: false
log-level: info
logger: zap
log-outputs: [stderr]
```

Adjust name, listen-peer-urls, listen-client-urls, initial-advertise-peer-urls, and advertise-client-urls for nodes 2 and 3.

## Creating systemd Service

Create systemd service file for etcd:

```bash
# /etc/systemd/system/etcd.service
[Unit]
Description=etcd key-value store
Documentation=https://github.com/etcd-io/etcd
After=network.target

[Service]
Type=notify
User=etcd
ExecStart=/usr/local/bin/etcd --config-file=/etc/etcd/etcd.conf.yml
Restart=always
RestartSec=10s
LimitNOFILE=40000

[Install]
WantedBy=multi-user.target
```

Start etcd on all nodes:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable and start etcd
sudo systemctl enable etcd
sudo systemctl start etcd

# Check status
sudo systemctl status etcd

# View logs
sudo journalctl -u etcd -f
```

## Verifying etcd Cluster Health

Once all nodes are running, verify cluster health:

```bash
# Set environment variables for etcdctl
export ETCDCTL_API=3
export ETCDCTL_CACERT=/etc/etcd/ca.pem
export ETCDCTL_CERT=/etc/etcd/etcd.pem
export ETCDCTL_KEY=/etc/etcd/etcd-key.pem
export ETCDCTL_ENDPOINTS=https://10.0.1.10:2379,https://10.0.1.11:2379,https://10.0.1.12:2379

# Check cluster health
etcdctl endpoint health

# Expected output:
# https://10.0.1.10:2379 is healthy: successfully committed proposal
# https://10.0.1.11:2379 is healthy: successfully committed proposal
# https://10.0.1.12:2379 is healthy: successfully committed proposal

# Check cluster members
etcdctl member list

# Check cluster status
etcdctl endpoint status --write-out=table
```

## Configuring Kubernetes to Use External etcd

Create kubeadm configuration to use external etcd:

```yaml
# kubeadm-external-etcd.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
controlPlaneEndpoint: "k8s-api.example.com:6443"
etcd:
  external:
    endpoints:
    - https://10.0.1.10:2379
    - https://10.0.1.11:2379
    - https://10.0.1.12:2379
    caFile: /etc/kubernetes/pki/etcd/ca.pem
    certFile: /etc/kubernetes/pki/etcd/etcd.pem
    keyFile: /etc/kubernetes/pki/etcd/etcd-key.pem
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
```

Copy etcd certificates to control plane nodes:

```bash
# On control plane nodes
sudo mkdir -p /etc/kubernetes/pki/etcd
sudo cp ca.pem /etc/kubernetes/pki/etcd/ca.pem
sudo cp etcd.pem /etc/kubernetes/pki/etcd/etcd.pem
sudo cp etcd-key.pem /etc/kubernetes/pki/etcd/etcd-key.pem
```

Initialize the first control plane node:

```bash
sudo kubeadm init --config kubeadm-external-etcd.yaml --upload-certs
```

## Adding Additional Control Plane Nodes

Join additional control plane nodes:

```bash
# On additional control plane nodes
sudo kubeadm join k8s-api.example.com:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane \
  --certificate-key <cert-key>
```

## Implementing etcd Backup Strategy

Set up automated backups of etcd:

```bash
# Create backup script
cat > /usr/local/bin/etcd-backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/etcd"
RETENTION_DAYS=7

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Set etcd credentials
export ETCDCTL_API=3
export ETCDCTL_CACERT=/etc/etcd/ca.pem
export ETCDCTL_CERT=/etc/etcd/etcd.pem
export ETCDCTL_KEY=/etc/etcd/etcd-key.pem

# Create snapshot
SNAPSHOT_FILE="${BACKUP_DIR}/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db"
etcdctl --endpoints=https://127.0.0.1:2379 snapshot save ${SNAPSHOT_FILE}

# Verify snapshot
etcdctl --write-out=table snapshot status ${SNAPSHOT_FILE}

# Compress snapshot
gzip ${SNAPSHOT_FILE}

# Delete old backups
find ${BACKUP_DIR} -name "etcd-snapshot-*.db.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${SNAPSHOT_FILE}.gz"
EOF

chmod +x /usr/local/bin/etcd-backup.sh
```

Schedule backups with cron:

```bash
# Add to crontab
sudo crontab -e

# Run backup every 6 hours
0 */6 * * * /usr/local/bin/etcd-backup.sh >> /var/log/etcd-backup.log 2>&1
```

## Monitoring etcd Performance

Monitor etcd metrics with Prometheus:

```yaml
# prometheus-etcd-scrape.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'etcd'
      scheme: https
      tls_config:
        ca_file: /etc/prometheus/etcd-ca.pem
        cert_file: /etc/prometheus/etcd.pem
        key_file: /etc/prometheus/etcd-key.pem
      static_configs:
      - targets:
        - '10.0.1.10:2379'
        - '10.0.1.11:2379'
        - '10.0.1.12:2379'
```

Key metrics to monitor:

```promql
# Cluster health
up{job="etcd"}

# Leader changes (should be rare)
rate(etcd_server_leader_changes_seen_total[5m])

# Disk sync duration (should be < 100ms)
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))

# Database size
etcd_mvcc_db_total_size_in_bytes

# Client traffic
rate(etcd_network_client_grpc_received_bytes_total[5m])
rate(etcd_network_client_grpc_sent_bytes_total[5m])
```

## Performing etcd Maintenance

Defragment etcd databases periodically:

```bash
# Defragment each member
etcdctl defrag --endpoints=https://10.0.1.10:2379
etcdctl defrag --endpoints=https://10.0.1.11:2379
etcdctl defrag --endpoints=https://10.0.1.12:2379

# Check database size before and after
etcdctl endpoint status --write-out=table
```

Compact old revisions:

```bash
# Get current revision
rev=$(etcdctl endpoint status --write-out="json" | jq -r '.[] | .Status.header.revision')

# Compact all revisions older than current
etcdctl compact $rev

# Defragment after compaction
etcdctl defrag
```

External etcd clusters provide robust, scalable state management for production Kubernetes deployments. Deploy etcd on dedicated nodes with sufficient resources, implement automated backups, monitor performance metrics closely, and perform regular maintenance to ensure optimal performance and reliability of your Kubernetes control plane.
