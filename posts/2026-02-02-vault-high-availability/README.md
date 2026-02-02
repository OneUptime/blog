# How to Set Up Vault High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, High Availability, Secrets Management, Raft, Consul, DevOps, Security

Description: A comprehensive guide to setting up HashiCorp Vault in high availability mode, covering Raft integrated storage, Consul backend, auto-unseal, performance tuning, and disaster recovery strategies.

---

HashiCorp Vault is the industry standard for secrets management, but a single Vault instance creates a critical point of failure. Production environments require high availability to ensure secrets are always accessible when applications need them.

## Understanding Vault HA Architecture

Vault's high availability mode uses a leader-follower architecture. Only one node handles write operations while other nodes forward requests to the active leader. Standby nodes can serve read requests when configured for performance standby.

```mermaid
flowchart TB
    subgraph Vault Cluster
        L[Active Leader]
        S1[Standby Node 1]
        S2[Standby Node 2]
    end

    subgraph Storage Backend
        R1[(Raft Node 1)]
        R2[(Raft Node 2)]
        R3[(Raft Node 3)]
    end

    subgraph Clients
        C1[Application 1]
        C2[Application 2]
        C3[Application 3]
    end

    C1 --> L
    C2 --> S1
    C3 --> S2

    S1 -.->|Forward Writes| L
    S2 -.->|Forward Writes| L

    L --> R1
    L --> R2
    L --> R3
```

### Storage Backend Options

| Backend | HA Support | Performance | Complexity | Recommendation |
|---------|------------|-------------|------------|----------------|
| Integrated Raft | Yes | High | Low | Best for most cases |
| Consul | Yes | High | Medium | When using Consul already |
| etcd | Yes | Medium | Medium | Kubernetes environments |
| DynamoDB | Yes | Medium | Low | AWS-native deployments |

## Setting Up Vault with Integrated Raft Storage

Integrated Raft storage is the recommended approach for Vault HA. No external dependencies are required, and the storage is built directly into Vault.

### Prerequisites

Before starting, ensure you have three servers with the following specifications:
- Minimum 2 CPU cores
- 4GB RAM
- 20GB fast storage (SSD recommended)
- Network connectivity between all nodes on ports 8200 and 8201

### Node Configuration

The following configuration file sets up a Vault node with Raft storage. Each node requires a unique node_id and its own configuration file.

```hcl
# /etc/vault.d/vault.hcl - Node 1 configuration

# Cluster name for identification
cluster_name = "vault-prod"

# Storage configuration using integrated Raft
storage "raft" {
  # Unique identifier for this node
  path    = "/opt/vault/data"
  node_id = "vault-node-1"

  # Define all cluster members for Raft consensus
  retry_join {
    leader_api_addr = "https://vault-1.example.com:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-2.example.com:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-3.example.com:8200"
  }
}

# API listener configuration
listener "tcp" {
  address       = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"
}

# Advertise addresses for cluster communication
api_addr     = "https://vault-1.example.com:8200"
cluster_addr = "https://vault-1.example.com:8201"

# Enable the UI
ui = true

# Disable memory lock warning (enable in production with proper capabilities)
disable_mlock = false

# Telemetry for monitoring
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}
```

### Systemd Service Configuration

Create a systemd unit file to manage the Vault service with proper resource limits and restart policies.

```ini
# /etc/systemd/system/vault.service

[Unit]
Description=HashiCorp Vault
Documentation=https://www.vaultproject.io/docs/
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=/etc/vault.d/vault.hcl

[Service]
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_IPC_LOCK
CapabilityBoundingSet=CAP_SYSLOG CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
ExecReload=/bin/kill --signal HUP $MAINPID
KillMode=process
KillSignal=SIGINT
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
```

### Initializing the Cluster

After configuring all nodes, start the Vault service on each node and initialize the cluster from the first node.

```bash
# Start Vault on all nodes
sudo systemctl enable vault
sudo systemctl start vault

# Initialize Vault from the first node only
# The -key-shares and -key-threshold define Shamir's secret sharing parameters
export VAULT_ADDR='https://vault-1.example.com:8200'
vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init.json

# Store the output securely - it contains root token and unseal keys
# Each key share should be distributed to different key custodians
```

### Joining Additional Nodes

Additional nodes automatically join the cluster through the retry_join configuration. Verify the cluster status after all nodes are running.

```bash
# Check the Raft peer list from the active node
vault operator raft list-peers

# Expected output shows all three nodes
# Node          Address                    State       Voter
# ----          -------                    -----       -----
# vault-node-1  vault-1.example.com:8201   leader      true
# vault-node-2  vault-2.example.com:8201   follower    true
# vault-node-3  vault-3.example.com:8201   follower    true
```

## Auto-Unseal Configuration

Manual unsealing is impractical for HA deployments. Auto-unseal delegates the unseal operation to a trusted external system.

```mermaid
flowchart LR
    subgraph Vault Cluster
        V1[Vault Node 1]
        V2[Vault Node 2]
        V3[Vault Node 3]
    end

    subgraph Unseal Provider
        KMS[AWS KMS / Azure Key Vault / GCP KMS]
    end

    V1 -->|Decrypt Master Key| KMS
    V2 -->|Decrypt Master Key| KMS
    V3 -->|Decrypt Master Key| KMS
```

### AWS KMS Auto-Unseal

Add the AWS KMS seal stanza to your Vault configuration. Ensure IAM permissions are configured for the Vault nodes.

```hcl
# Add to vault.hcl for AWS KMS auto-unseal

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal-key"

  # Optional: Use specific AWS credentials
  # access_key = "AKIAIOSFODNN7EXAMPLE"
  # secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

### AWS IAM Policy for KMS

Vault nodes require specific IAM permissions to use the KMS key for auto-unseal operations.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789:key/your-key-id"
    }
  ]
}
```

### Azure Key Vault Auto-Unseal

For Azure deployments, configure the Azure Key Vault seal stanza with proper managed identity or service principal credentials.

```hcl
# Add to vault.hcl for Azure Key Vault auto-unseal

seal "azurekeyvault" {
  tenant_id     = "your-tenant-id"
  vault_name    = "vault-unseal-keyvault"
  key_name      = "vault-unseal-key"

  # Uses Azure managed identity by default
  # Alternatively, specify client credentials
  # client_id     = "your-client-id"
  # client_secret = "your-client-secret"
}
```

## Consul Backend Configuration

Organizations already using Consul for service discovery may prefer Consul as the storage backend for better integration.

```mermaid
flowchart TB
    subgraph Vault Cluster
        V1[Vault 1]
        V2[Vault 2]
        V3[Vault 3]
    end

    subgraph Consul Cluster
        C1[Consul 1]
        C2[Consul 2]
        C3[Consul 3]
    end

    V1 --> C1
    V1 --> C2
    V1 --> C3
    V2 --> C1
    V2 --> C2
    V2 --> C3
    V3 --> C1
    V3 --> C2
    V3 --> C3
```

### Vault Configuration with Consul Backend

Configure Vault to use Consul for storage and HA coordination. All Vault nodes should point to the same Consul cluster.

```hcl
# /etc/vault.d/vault.hcl - Consul backend configuration

storage "consul" {
  address      = "127.0.0.1:8500"
  path         = "vault/"

  # Enable TLS for Consul communication
  scheme       = "https"
  tls_ca_file  = "/opt/vault/tls/consul-ca.crt"

  # ACL token with appropriate permissions
  token        = "your-consul-acl-token"

  # Service registration for discovery
  service      = "vault"
  service_tags = "active,standby"
}

# HA settings when using Consul
ha_storage "consul" {
  address      = "127.0.0.1:8500"
  path         = "vault/"
  scheme       = "https"
  token        = "your-consul-acl-token"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"
}

api_addr     = "https://vault.service.consul:8200"
cluster_addr = "https://vault-1.node.consul:8201"

ui = true
```

### Consul ACL Policy for Vault

Create a Consul ACL policy that grants Vault the minimum required permissions for storage operations.

```hcl
# vault-policy.hcl

# Key/value permissions for Vault storage
key_prefix "vault/" {
  policy = "write"
}

# Service registration permissions
service "vault" {
  policy = "write"
}

# Session permissions for leader election
session_prefix "" {
  policy = "write"
}

# Agent permissions for health checks
agent_prefix "" {
  policy = "read"
}
```

## Kubernetes Deployment with Helm

Deploying Vault HA on Kubernetes simplifies operations through the official Helm chart. The chart handles pod scheduling, service discovery, and rolling updates.

### Helm Values Configuration

Customize the Helm values to deploy a three-node Vault HA cluster with Raft storage.

```yaml
# values.yaml - Vault HA Helm configuration

global:
  enabled: true
  tlsDisable: false

server:
  # Run 3 replicas for HA
  ha:
    enabled: true
    replicas: 3

    # Raft configuration
    raft:
      enabled: true
      setNodeId: true

      config: |
        ui = true

        listener "tcp" {
          tls_disable = false
          address = "[::]:8200"
          cluster_address = "[::]:8201"
          tls_cert_file = "/vault/userconfig/vault-tls/tls.crt"
          tls_key_file = "/vault/userconfig/vault-tls/tls.key"
        }

        storage "raft" {
          path = "/vault/data"

          retry_join {
            leader_api_addr = "https://vault-0.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
          retry_join {
            leader_api_addr = "https://vault-1.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
          retry_join {
            leader_api_addr = "https://vault-2.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
        }

        service_registration "kubernetes" {}

        # Auto-unseal with AWS KMS
        seal "awskms" {
          region     = "us-east-1"
          kms_key_id = "alias/vault-unseal"
        }

  # Resource limits
  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m

  # Persistent storage
  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: "fast-ssd"

  # TLS configuration
  extraVolumes:
    - type: secret
      name: vault-tls
      path: /vault/userconfig/vault-tls

  # Pod anti-affinity for HA
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: vault
          topologyKey: kubernetes.io/hostname

# Enable Vault injector for sidecar injection
injector:
  enabled: true
  replicas: 2

# UI service
ui:
  enabled: true
  serviceType: LoadBalancer
```

### Deploy with Helm

Install Vault using the official HashiCorp Helm chart with your customized values.

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Create namespace
kubectl create namespace vault

# Create TLS secret (generate certificates beforehand)
kubectl create secret generic vault-tls \
  --namespace vault \
  --from-file=tls.crt=vault.crt \
  --from-file=tls.key=vault.key \
  --from-file=ca.crt=ca.crt

# Install Vault
helm install vault hashicorp/vault \
  --namespace vault \
  --values values.yaml

# Check pod status
kubectl get pods -n vault -w
```

## Load Balancing and Client Configuration

Distribute client requests across Vault nodes using a load balancer that supports health checks.

```mermaid
flowchart TB
    subgraph Clients
        A1[App 1]
        A2[App 2]
        A3[App 3]
    end

    LB[Load Balancer]

    subgraph Vault Cluster
        V1[Vault 1 - Active]
        V2[Vault 2 - Standby]
        V3[Vault 3 - Standby]
    end

    A1 --> LB
    A2 --> LB
    A3 --> LB

    LB --> V1
    LB --> V2
    LB --> V3
```

### HAProxy Configuration

Configure HAProxy to load balance Vault traffic with proper health checking to detect the active node.

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log stdout format raw local0
    maxconn 4096

defaults
    mode http
    log global
    option httplog
    option dontlognull
    timeout connect 5s
    timeout client 30s
    timeout server 30s

# Frontend for Vault API
frontend vault_frontend
    bind *:8200 ssl crt /etc/haproxy/certs/vault.pem
    default_backend vault_backend

# Backend with health checks
backend vault_backend
    balance roundrobin
    option httpchk GET /v1/sys/health?standbyok=true
    http-check expect status 200

    # Server entries with health checks
    server vault-1 vault-1.example.com:8200 check ssl verify required ca-file /etc/haproxy/certs/ca.crt
    server vault-2 vault-2.example.com:8200 check ssl verify required ca-file /etc/haproxy/certs/ca.crt
    server vault-3 vault-3.example.com:8200 check ssl verify required ca-file /etc/haproxy/certs/ca.crt

# Stats page for monitoring
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
```

### Nginx Load Balancer Configuration

Nginx provides an alternative load balancing option with stream-based TCP proxying for Vault.

```nginx
# /etc/nginx/nginx.conf

stream {
    upstream vault_cluster {
        # Use least connections for better distribution
        least_conn;

        server vault-1.example.com:8200 max_fails=3 fail_timeout=30s;
        server vault-2.example.com:8200 max_fails=3 fail_timeout=30s;
        server vault-3.example.com:8200 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 8200;
        proxy_pass vault_cluster;
        proxy_timeout 30s;
        proxy_connect_timeout 5s;
    }
}

http {
    # Health check endpoint for load balancer health
    server {
        listen 8080;

        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

## Monitoring and Alerting

Proper monitoring ensures you detect issues before they impact secret retrieval operations.

### Prometheus Metrics Configuration

Enable Vault telemetry and configure Prometheus to scrape Vault metrics from all nodes.

```yaml
# prometheus.yml - Vault monitoring configuration

global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'vault'
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
    scheme: https
    tls_config:
      ca_file: /etc/prometheus/vault-ca.crt
    bearer_token_file: /etc/prometheus/vault-token
    static_configs:
      - targets:
          - 'vault-1.example.com:8200'
          - 'vault-2.example.com:8200'
          - 'vault-3.example.com:8200'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '(.+):8200'
        replacement: '${1}'
```

### Critical Alerting Rules

Define Prometheus alerting rules for Vault HA cluster health and performance issues.

```yaml
# vault-alerts.yml

groups:
  - name: vault
    rules:
      # Alert when Vault is sealed
      - alert: VaultSealed
        expr: vault_core_unsealed == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vault instance is sealed"
          description: "Vault instance {{ $labels.instance }} has been sealed for more than 1 minute."

      # Alert when no leader exists
      - alert: VaultNoLeader
        expr: sum(vault_core_active) == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No active Vault leader"
          description: "No Vault instance is currently active as leader."

      # Alert on high request latency
      - alert: VaultHighLatency
        expr: histogram_quantile(0.99, rate(vault_core_handle_request_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Vault request latency is high"
          description: "99th percentile latency is above 1 second on {{ $labels.instance }}."

      # Alert when Raft cluster loses peers
      - alert: VaultRaftPeersLow
        expr: vault_raft_peers < 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Vault Raft cluster has fewer than expected peers"
          description: "Raft cluster has only {{ $value }} peers, expected 3."

      # Alert on token creation failures
      - alert: VaultTokenCreationFailures
        expr: rate(vault_token_create_count{error!=""}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Vault token creation failures detected"
          description: "Token creation errors occurring on {{ $labels.instance }}."
```

### Grafana Dashboard

Create a Grafana dashboard to visualize Vault cluster health, displaying key metrics for operational awareness.

```json
{
  "dashboard": {
    "title": "Vault HA Cluster",
    "panels": [
      {
        "title": "Cluster Status",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(vault_core_active)",
            "legendFormat": "Active Nodes"
          }
        ]
      },
      {
        "title": "Sealed Status",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(vault_core_unsealed)",
            "legendFormat": "Unsealed Nodes"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(vault_core_handle_request_count[5m])) by (instance)",
            "legendFormat": "{{ instance }}"
          }
        ]
      },
      {
        "title": "Request Latency (p99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(vault_core_handle_request_bucket[5m])) by (le, instance))",
            "legendFormat": "{{ instance }}"
          }
        ]
      }
    ]
  }
}
```

## Disaster Recovery and Backup

Implement backup strategies to protect against data loss and enable rapid recovery.

### Automated Raft Snapshots

Create a script to automate Raft snapshot backups and store them in secure remote storage.

```bash
#!/bin/bash
# /opt/vault/scripts/backup.sh
# Automated Vault Raft snapshot backup script

set -euo pipefail

# Configuration
VAULT_ADDR="${VAULT_ADDR:-https://vault.example.com:8200}"
BACKUP_DIR="/opt/vault/backups"
S3_BUCKET="vault-backups"
RETENTION_DAYS=30

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_FILE="${BACKUP_DIR}/vault_snapshot_${TIMESTAMP}.snap"

# Create backup directory if it does not exist
mkdir -p "${BACKUP_DIR}"

# Take Raft snapshot
echo "Taking Raft snapshot..."
vault operator raft snapshot save "${SNAPSHOT_FILE}"

# Verify snapshot
if [ ! -f "${SNAPSHOT_FILE}" ]; then
    echo "ERROR: Snapshot file not created"
    exit 1
fi

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "${SNAPSHOT_FILE}" "s3://${S3_BUCKET}/snapshots/vault_snapshot_${TIMESTAMP}.snap" \
    --sse AES256

# Clean up local old backups
echo "Cleaning up old local backups..."
find "${BACKUP_DIR}" -name "vault_snapshot_*.snap" -mtime +7 -delete

# Clean up old S3 backups
echo "Cleaning up old S3 backups..."
aws s3 ls "s3://${S3_BUCKET}/snapshots/" | \
    while read -r line; do
        create_date=$(echo "$line" | awk '{print $1}')
        file_name=$(echo "$line" | awk '{print $4}')
        if [[ -n "$file_name" ]]; then
            create_epoch=$(date -d "$create_date" +%s)
            current_epoch=$(date +%s)
            age_days=$(( (current_epoch - create_epoch) / 86400 ))
            if [[ $age_days -gt $RETENTION_DAYS ]]; then
                echo "Deleting old backup: $file_name"
                aws s3 rm "s3://${S3_BUCKET}/snapshots/${file_name}"
            fi
        fi
    done

echo "Backup completed successfully: ${SNAPSHOT_FILE}"
```

### Restore Procedure

Document and test the restore procedure to ensure rapid recovery during disaster scenarios.

```bash
#!/bin/bash
# /opt/vault/scripts/restore.sh
# Vault Raft snapshot restore script

set -euo pipefail

SNAPSHOT_FILE="${1:?Usage: restore.sh <snapshot_file>}"
VAULT_ADDR="${VAULT_ADDR:-https://vault.example.com:8200}"

# Verify snapshot file exists
if [ ! -f "${SNAPSHOT_FILE}" ]; then
    echo "ERROR: Snapshot file not found: ${SNAPSHOT_FILE}"
    exit 1
fi

echo "WARNING: Restoring Vault from snapshot will overwrite current data"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Restore the snapshot
echo "Restoring from snapshot: ${SNAPSHOT_FILE}"
vault operator raft snapshot restore -force "${SNAPSHOT_FILE}"

echo "Snapshot restored successfully"
echo "Verify cluster health with: vault status"
```

## Performance Tuning

Optimize Vault performance for high-throughput environments with proper configuration and resource allocation.

### Performance Configuration

Adjust Vault configuration parameters to handle increased load and reduce latency.

```hcl
# Performance tuning additions to vault.hcl

# Increase maximum request size for large secrets
max_request_size = 33554432  # 32MB

# Connection pool settings for storage backend
storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-node-1"

  # Performance tuning
  performance_multiplier = 1

  # Snapshot settings
  snapshot_threshold = 8192
  trailing_logs      = 10000
}

# Cache settings
cache {
  use_auto_auth_token = true
}

# Listener performance settings
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"

  # TLS performance settings
  tls_min_version = "tls12"
  tls_prefer_server_cipher_suites = true

  # HTTP settings
  max_request_duration = "90s"
}

# Telemetry for performance monitoring
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true

  # Detailed metrics
  usage_gauge_period        = "10m"
  maximum_gauge_cardinality = 500
}
```

### System-Level Tuning

Apply operating system tuning to support Vault's performance requirements.

```bash
#!/bin/bash
# System tuning for Vault HA nodes

# Increase file descriptor limits
cat >> /etc/security/limits.conf << EOF
vault soft nofile 65536
vault hard nofile 65536
vault soft nproc 65536
vault hard nproc 65536
EOF

# Network tuning
cat >> /etc/sysctl.conf << EOF
# Increase network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Increase connection tracking
net.netfilter.nf_conntrack_max = 1000000
net.netfilter.nf_conntrack_tcp_timeout_established = 86400

# Enable TCP fast open
net.ipv4.tcp_fastopen = 3

# Reduce TIME_WAIT sockets
net.ipv4.tcp_tw_reuse = 1
EOF

# Apply sysctl changes
sysctl -p

echo "System tuning applied successfully"
```

## Failover Testing

Regular failover testing ensures your HA configuration works when needed most.

### Automated Failover Test Script

Create a script to simulate leader failure and verify automatic failover behavior.

```bash
#!/bin/bash
# /opt/vault/scripts/failover-test.sh
# Vault HA failover testing script

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.example.com:8200}"

echo "=== Vault HA Failover Test ==="

# Get current leader
echo "Step 1: Identifying current leader..."
CURRENT_LEADER=$(vault operator raft list-peers -format=json | \
    jq -r '.data.config.servers[] | select(.leader == true) | .node_id')
echo "Current leader: ${CURRENT_LEADER}"

# Verify cluster health before test
echo "Step 2: Verifying cluster health..."
PEER_COUNT=$(vault operator raft list-peers -format=json | \
    jq '.data.config.servers | length')
echo "Peer count: ${PEER_COUNT}"

if [ "$PEER_COUNT" -lt 3 ]; then
    echo "ERROR: Cluster does not have enough peers for safe testing"
    exit 1
fi

# Step down the current leader
echo "Step 3: Forcing leader step-down..."
vault operator step-down

# Wait for new leader election
echo "Step 4: Waiting for leader election..."
sleep 10

# Get new leader
NEW_LEADER=$(vault operator raft list-peers -format=json | \
    jq -r '.data.config.servers[] | select(.leader == true) | .node_id')
echo "New leader: ${NEW_LEADER}"

# Verify leadership changed
if [ "$CURRENT_LEADER" == "$NEW_LEADER" ]; then
    echo "WARNING: Leadership did not change"
else
    echo "SUCCESS: Leadership transferred from ${CURRENT_LEADER} to ${NEW_LEADER}"
fi

# Verify cluster operations
echo "Step 5: Verifying cluster operations..."
vault secrets list > /dev/null && echo "Secrets engine accessible: OK"
vault token lookup > /dev/null && echo "Token operations: OK"

# Test write operation
TEST_PATH="secret/failover-test-$(date +%s)"
vault kv put "${TEST_PATH}" test=value > /dev/null && echo "Write operation: OK"
vault kv get "${TEST_PATH}" > /dev/null && echo "Read operation: OK"
vault kv delete "${TEST_PATH}" > /dev/null && echo "Delete operation: OK"

echo "=== Failover Test Completed Successfully ==="
```

## Best Practices Summary

Follow these guidelines to maintain a healthy and secure Vault HA deployment:

1. **Use Auto-Unseal** - Manual unsealing is error-prone and delays recovery
2. **Enable TLS Everywhere** - Encrypt all Vault communications, including cluster traffic
3. **Implement Proper Monitoring** - Alert on sealed status, no leader, and high latency
4. **Automate Backups** - Schedule regular Raft snapshots with off-site storage
5. **Test Failover Regularly** - Monthly failover drills ensure recovery procedures work
6. **Limit Root Token Usage** - Generate root tokens only when needed, revoke after use
7. **Use Performance Standbys** - Enable read scaling for high-read workloads (Enterprise)
8. **Document Recovery Procedures** - Maintain runbooks for common failure scenarios
9. **Separate Audit Logs** - Send audit logs to external systems for compliance
10. **Plan Capacity** - Monitor resource usage and scale before hitting limits

---

A properly configured Vault HA deployment provides the reliability that production secrets management demands. Start with integrated Raft storage for simplicity, implement auto-unseal for operational ease, and establish monitoring before going live. Regular testing of your failover procedures ensures you are prepared when real failures occur.
