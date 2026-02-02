# How to Configure K3s High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: K3s, Kubernetes, High Availability, Cluster, DevOps, Infrastructure, etcd

Description: A comprehensive guide to configuring K3s for high availability, covering embedded etcd clusters, external datastores, load balancers, failover strategies, and production best practices for reliable Kubernetes deployments.

---

High availability separates development clusters from production-ready infrastructure. When your K3s cluster serves real users, a single point of failure becomes an unacceptable risk. This guide walks through every aspect of configuring K3s for high availability, from understanding the architecture to implementing bulletproof failover mechanisms.

K3s offers multiple paths to high availability, each with distinct trade-offs. Whether you choose embedded etcd or an external database, the principles remain the same: eliminate single points of failure, ensure automatic failover, and maintain data consistency across nodes. By the end of this guide, you will have a K3s cluster that survives node failures without manual intervention.

## Table of Contents

1. [Understanding K3s High Availability Architecture](#understanding-k3s-high-availability-architecture)
2. [High Availability Options in K3s](#high-availability-options-in-k3s)
3. [Planning Your HA Deployment](#planning-your-ha-deployment)
4. [Configuring Embedded etcd HA](#configuring-embedded-etcd-ha)
5. [Configuring External Database HA](#configuring-external-database-ha)
6. [Setting Up Load Balancers](#setting-up-load-balancers)
7. [Adding Worker Nodes](#adding-worker-nodes)
8. [Testing Failover Scenarios](#testing-failover-scenarios)
9. [Monitoring HA Cluster Health](#monitoring-ha-cluster-health)
10. [Backup and Recovery Strategies](#backup-and-recovery-strategies)
11. [Common HA Pitfalls and Solutions](#common-ha-pitfalls-and-solutions)
12. [Conclusion](#conclusion)

## Understanding K3s High Availability Architecture

High availability in Kubernetes means your cluster continues operating when individual components fail. For K3s, this requires redundancy at multiple layers: the API server, the datastore, and the load balancer.

```mermaid
graph TB
    subgraph "Client Layer"
        C1[kubectl]
        C2[Applications]
        C3[CI/CD Systems]
    end

    subgraph "Load Balancer Layer"
        LB[Load Balancer<br/>HAProxy / Nginx / Cloud LB]
    end

    subgraph "Control Plane Layer"
        S1[Server Node 1<br/>API Server + etcd]
        S2[Server Node 2<br/>API Server + etcd]
        S3[Server Node 3<br/>API Server + etcd]
    end

    subgraph "Worker Layer"
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
    end

    C1 --> LB
    C2 --> LB
    C3 --> LB
    LB --> S1
    LB --> S2
    LB --> S3
    S1 <--> S2
    S2 <--> S3
    S1 <--> S3
    S1 --> W1
    S1 --> W2
    S1 --> W3
    S2 --> W1
    S2 --> W2
    S2 --> W3
    S3 --> W1
    S3 --> W2
    S3 --> W3
```

### Key Components

**API Server**: Each server node runs a Kubernetes API server. The load balancer distributes requests across all healthy servers. If one server fails, clients automatically connect to the remaining servers.

**Datastore**: K3s stores cluster state in either embedded etcd or an external database. Both options support high availability, but with different characteristics.

**Load Balancer**: Sits in front of the API servers and directs traffic to healthy nodes. Critical for both kubectl access and worker node communication.

**Worker Nodes**: Connect through the load balancer to whichever server is available. Workers remain operational even when server nodes fail, as long as at least one server remains healthy.

### The Quorum Requirement

Both etcd and external databases require a quorum for writes. In a three-node cluster, two nodes must agree before committing changes. This means:

- Three nodes tolerate one failure
- Five nodes tolerate two failures
- Always use odd numbers to avoid split-brain scenarios

## High Availability Options in K3s

K3s supports two primary approaches to high availability. Each has distinct advantages depending on your infrastructure and operational requirements.

### Option 1: Embedded etcd (Recommended)

The embedded etcd approach bundles the datastore with K3s server nodes. This simplifies deployment and reduces external dependencies.

```mermaid
graph LR
    subgraph "Server 1"
        A1[K3s API Server]
        E1[(etcd)]
        A1 --- E1
    end

    subgraph "Server 2"
        A2[K3s API Server]
        E2[(etcd)]
        A2 --- E2
    end

    subgraph "Server 3"
        A3[K3s API Server]
        E3[(etcd)]
        A3 --- E3
    end

    E1 <--> E2
    E2 <--> E3
    E1 <--> E3
```

**Advantages:**
- Simpler architecture with fewer components to manage
- No external database infrastructure required
- Automatic clustering with K3s installation
- Lower latency for cluster operations

**Considerations:**
- Server nodes require more resources for etcd
- Backup and restore procedures differ from external databases
- etcd performance impacts API server performance

### Option 2: External Database

The external database approach uses PostgreSQL, MySQL, or another supported database for cluster state.

```mermaid
graph TB
    subgraph "Control Plane"
        S1[Server 1<br/>API Server Only]
        S2[Server 2<br/>API Server Only]
        S3[Server 3<br/>API Server Only]
    end

    subgraph "External Datastore"
        DB[(PostgreSQL / MySQL<br/>High Availability Cluster)]
    end

    S1 --> DB
    S2 --> DB
    S3 --> DB
```

**Advantages:**
- Leverage existing database infrastructure and expertise
- Familiar backup and restore procedures
- Can use managed database services from cloud providers
- Separates compute from storage concerns

**Considerations:**
- Requires maintaining or paying for database infrastructure
- Network latency between servers and database impacts performance
- Additional point of failure if database HA is not configured

## Planning Your HA Deployment

Before deploying, plan your infrastructure carefully. Mistakes here cascade into operational problems later.

### Hardware Requirements

Server nodes in an HA cluster need more resources than standalone deployments:

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| Server CPU | 2 cores | 4 cores | 8 cores |
| Server RAM | 4GB | 8GB | 16GB |
| Server Disk | 50GB SSD | 100GB SSD | 200GB NVMe |
| Load Balancer CPU | 1 core | 2 cores | 4 cores |
| Load Balancer RAM | 1GB | 2GB | 4GB |

### Network Requirements

Plan your IP addresses and ensure proper connectivity:

| Port | Protocol | Purpose | Required Between |
|------|----------|---------|------------------|
| 6443 | TCP | Kubernetes API | LB to Servers, Workers to LB |
| 2379 | TCP | etcd client | Servers only |
| 2380 | TCP | etcd peer | Servers only |
| 10250 | TCP | Kubelet API | All nodes |
| 8472 | UDP | Flannel VXLAN | All nodes |

### Example Network Layout

This code block shows a sample IP allocation for a production K3s HA cluster. Adjust the network ranges to match your environment.

```bash
# Network Planning Document
# Cluster Name: production-k3s

# Virtual IP for Load Balancer (floats between LB nodes)
VIP_ADDRESS="10.0.1.100"

# Load Balancer Nodes
LB_NODE_1="10.0.1.101"
LB_NODE_2="10.0.1.102"

# K3s Server Nodes (Control Plane)
SERVER_1="10.0.1.111"
SERVER_2="10.0.1.112"
SERVER_3="10.0.1.113"

# K3s Worker Nodes
WORKER_1="10.0.1.121"
WORKER_2="10.0.1.122"
WORKER_3="10.0.1.123"
WORKER_4="10.0.1.124"

# Kubernetes Internal Networks
POD_CIDR="10.42.0.0/16"
SERVICE_CIDR="10.43.0.0/16"
CLUSTER_DNS="10.43.0.10"
```

## Configuring Embedded etcd HA

The embedded etcd option provides the simplest path to high availability. Follow these steps to deploy a three-node HA cluster.

### Step 1: Prepare All Server Nodes

Run this preparation script on each server node before installing K3s. The script disables swap, loads required kernel modules, and configures networking parameters.

```bash
#!/bin/bash
# prepare-k3s-node.sh
# Run this script on all K3s server nodes before installation

set -e

echo "Preparing node for K3s HA deployment..."

# Disable swap - Kubernetes requires this
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

# Load required kernel modules for container networking
cat <<EOF | sudo tee /etc/modules-load.d/k3s.conf
br_netfilter
overlay
EOF

sudo modprobe br_netfilter
sudo modprobe overlay

# Configure kernel parameters for Kubernetes networking
cat <<EOF | sudo tee /etc/sysctl.d/99-k3s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system

# Install required packages
sudo apt-get update
sudo apt-get install -y curl wget open-iscsi nfs-common

echo "Node preparation complete!"
```

### Step 2: Generate Cluster Token

Create a secure token that all nodes will use to authenticate with each other. This token must be kept secret and used consistently across all nodes.

```bash
# Generate a cryptographically secure token
K3S_TOKEN=$(openssl rand -hex 32)
echo "Your K3s cluster token: $K3S_TOKEN"

# Save the token securely
echo "$K3S_TOKEN" > ~/.k3s-cluster-token
chmod 600 ~/.k3s-cluster-token

# You will need this token for:
# - All server node installations
# - All worker node installations
# - Cluster recovery operations
```

### Step 3: Install First Server Node

The first server initializes the etcd cluster. The --cluster-init flag tells K3s to create a new etcd cluster rather than joining an existing one.

```bash
# On the FIRST server node (10.0.1.111)
# This node bootstraps the etcd cluster

# Set environment variables
export K3S_TOKEN="your-generated-token-here"
export VIP_ADDRESS="10.0.1.100"
export NODE_IP="10.0.1.111"

# Install K3s with embedded etcd in cluster-init mode
curl -sfL https://get.k3s.io | sh -s - server \
    --cluster-init \
    --token="$K3S_TOKEN" \
    --node-ip="$NODE_IP" \
    --tls-san="$VIP_ADDRESS" \
    --tls-san="k3s.example.com" \
    --disable=traefik \
    --disable=servicelb \
    --write-kubeconfig-mode=644

# Wait for the node to be ready
echo "Waiting for K3s to start..."
sleep 30

# Verify the first node is running
sudo kubectl get nodes
```

### Step 4: Join Additional Server Nodes

The remaining servers join the existing etcd cluster. They connect to the first server to discover the cluster topology.

```bash
# On the SECOND and THIRD server nodes (10.0.1.112 and 10.0.1.113)
# These nodes join the existing etcd cluster

# Set environment variables
export K3S_TOKEN="your-generated-token-here"
export FIRST_SERVER="10.0.1.111"
export VIP_ADDRESS="10.0.1.100"
export NODE_IP="10.0.1.112"  # Change this for each server

# Install K3s and join the cluster
# The --server flag points to an existing server node
curl -sfL https://get.k3s.io | sh -s - server \
    --server="https://${FIRST_SERVER}:6443" \
    --token="$K3S_TOKEN" \
    --node-ip="$NODE_IP" \
    --tls-san="$VIP_ADDRESS" \
    --tls-san="k3s.example.com" \
    --disable=traefik \
    --disable=servicelb \
    --write-kubeconfig-mode=644

# Wait and verify
sleep 30
sudo kubectl get nodes
```

### Step 5: Verify etcd Cluster Health

After all server nodes are running, verify the etcd cluster is healthy and all members are participating.

```bash
# Check etcd member list
# This command shows all etcd nodes and their status
sudo k3s etcd-snapshot info

# Alternative method using etcdctl
# K3s includes etcdctl in the k3s binary
sudo k3s kubectl exec -n kube-system \
    $(sudo k3s kubectl get pods -n kube-system -l component=etcd -o name | head -1) \
    -- etcdctl member list \
    --cacert=/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
    --cert=/var/lib/rancher/k3s/server/tls/etcd/client.crt \
    --key=/var/lib/rancher/k3s/server/tls/etcd/client.key

# Check cluster endpoint health
sudo k3s kubectl get endpoints -n default kubernetes

# Verify all server nodes show control-plane role
sudo kubectl get nodes -o wide
# Expected output shows all three nodes with control-plane,etcd,master roles
```

## Configuring External Database HA

If you prefer using an external database, K3s supports PostgreSQL and MySQL. This section covers PostgreSQL setup.

### Step 1: Prepare PostgreSQL Database

Set up a PostgreSQL database with high availability. For production, use a managed service or configure PostgreSQL streaming replication.

```bash
# On your PostgreSQL server (or use a managed service)
# Create a database and user for K3s

sudo -u postgres psql <<EOF
-- Create dedicated user for K3s
CREATE USER k3s WITH PASSWORD 'your-secure-password-here';

-- Create database
CREATE DATABASE k3s OWNER k3s;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE k3s TO k3s;

-- Connect to the database and grant schema privileges
\c k3s
GRANT ALL ON SCHEMA public TO k3s;
EOF

# Verify the connection works
psql -h postgres.example.com -U k3s -d k3s -c "SELECT 1;"
```

### Step 2: Install K3s with External Database

Configure K3s to use the external PostgreSQL database instead of embedded etcd. The --datastore-endpoint flag specifies the connection string.

```bash
# On the FIRST server node
# No --cluster-init needed with external database

export K3S_TOKEN="your-generated-token-here"
export VIP_ADDRESS="10.0.1.100"
export NODE_IP="10.0.1.111"
export DB_CONNECTION="postgres://k3s:your-secure-password@postgres.example.com:5432/k3s"

# Install K3s with external database
curl -sfL https://get.k3s.io | sh -s - server \
    --token="$K3S_TOKEN" \
    --datastore-endpoint="$DB_CONNECTION" \
    --node-ip="$NODE_IP" \
    --tls-san="$VIP_ADDRESS" \
    --tls-san="k3s.example.com" \
    --disable=traefik \
    --disable=servicelb \
    --write-kubeconfig-mode=644

sleep 30
sudo kubectl get nodes
```

### Step 3: Join Additional Servers

Additional server nodes use the same datastore endpoint. They do not need to reference the first server since they share the database.

```bash
# On SECOND and THIRD server nodes
# Each server connects directly to the shared database

export K3S_TOKEN="your-generated-token-here"
export VIP_ADDRESS="10.0.1.100"
export NODE_IP="10.0.1.112"  # Change for each server
export DB_CONNECTION="postgres://k3s:your-secure-password@postgres.example.com:5432/k3s"

# Install K3s with external database
curl -sfL https://get.k3s.io | sh -s - server \
    --token="$K3S_TOKEN" \
    --datastore-endpoint="$DB_CONNECTION" \
    --node-ip="$NODE_IP" \
    --tls-san="$VIP_ADDRESS" \
    --tls-san="k3s.example.com" \
    --disable=traefik \
    --disable=servicelb \
    --write-kubeconfig-mode=644
```

## Setting Up Load Balancers

The load balancer distributes API requests across server nodes and provides a single entry point for the cluster.

### HAProxy Configuration

HAProxy provides robust layer 4 load balancing for the Kubernetes API. Install it on dedicated nodes separate from your K3s servers.

```bash
# Install HAProxy on load balancer nodes
sudo apt-get update
sudo apt-get install -y haproxy
```

Create the HAProxy configuration file. This configuration performs TCP load balancing with health checks to detect failed servers.

```bash
# /etc/haproxy/haproxy.cfg
# HAProxy configuration for K3s API high availability

global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Modern TLS settings
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384
    ssl-default-bind-options ssl-min-ver TLSv1.2

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 5s
    timeout client  50s
    timeout server  50s
    retries 3

# Statistics page for monitoring HAProxy health
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST

# Frontend receives all Kubernetes API traffic
frontend k3s_api
    bind *:6443
    mode tcp
    option tcplog
    default_backend k3s_servers

# Backend contains all K3s server nodes
# Health checks ensure traffic only goes to healthy servers
backend k3s_servers
    mode tcp
    balance roundrobin
    option tcp-check

    # Server definitions - adjust IPs for your environment
    # 'check' enables health checking
    # 'fall 3' marks server down after 3 failed checks
    # 'rise 2' marks server up after 2 successful checks
    server k3s-server-1 10.0.1.111:6443 check fall 3 rise 2
    server k3s-server-2 10.0.1.112:6443 check fall 3 rise 2
    server k3s-server-3 10.0.1.113:6443 check fall 3 rise 2
```

Enable and start HAProxy:

```bash
# Validate configuration syntax
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Enable HAProxy to start on boot
sudo systemctl enable haproxy

# Start HAProxy
sudo systemctl start haproxy

# Verify HAProxy is running
sudo systemctl status haproxy

# Check which servers are healthy
echo "show servers state" | sudo socat stdio /run/haproxy/admin.sock
```

### Load Balancer High Availability with Keepalived

A single load balancer becomes a single point of failure. Use Keepalived to run two load balancers with a floating virtual IP.

```mermaid
graph TB
    subgraph "Virtual IP: 10.0.1.100"
        VIP((VIP))
    end

    subgraph "Load Balancer 1 - Primary"
        LB1[HAProxy<br/>10.0.1.101<br/>Priority: 101]
    end

    subgraph "Load Balancer 2 - Backup"
        LB2[HAProxy<br/>10.0.1.102<br/>Priority: 100]
    end

    VIP --> LB1
    VIP -.-> LB2
    LB1 <--> |VRRP| LB2
```

Install and configure Keepalived on both load balancer nodes:

```bash
# Install keepalived on both LB nodes
sudo apt-get install -y keepalived
```

Configure the primary load balancer (LB1). This node has higher priority and will hold the VIP when healthy.

```bash
# /etc/keepalived/keepalived.conf on LB1 (Primary)
# This configuration makes LB1 the preferred VIP holder

global_defs {
    router_id LB1
    enable_script_security
    script_user root
}

# Health check script verifies HAProxy is running
vrrp_script check_haproxy {
    script "/usr/bin/killall -0 haproxy"
    interval 2
    weight 2
    fall 3
    rise 2
}

vrrp_instance K3S_VIP {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101

    # How often to send VRRP advertisements (seconds)
    advert_int 1

    # Authentication between VRRP peers
    authentication {
        auth_type PASS
        auth_pass your-vrrp-password
    }

    # The virtual IP address that floats between nodes
    virtual_ipaddress {
        10.0.1.100/24 dev eth0
    }

    # Use health check to influence priority
    track_script {
        check_haproxy
    }
}
```

Configure the backup load balancer (LB2). This node takes over the VIP when the primary fails.

```bash
# /etc/keepalived/keepalived.conf on LB2 (Backup)
# This node takes over when LB1 fails

global_defs {
    router_id LB2
    enable_script_security
    script_user root
}

vrrp_script check_haproxy {
    script "/usr/bin/killall -0 haproxy"
    interval 2
    weight 2
    fall 3
    rise 2
}

vrrp_instance K3S_VIP {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 100

    advert_int 1

    authentication {
        auth_type PASS
        auth_pass your-vrrp-password
    }

    virtual_ipaddress {
        10.0.1.100/24 dev eth0
    }

    track_script {
        check_haproxy
    }
}
```

Start Keepalived on both nodes:

```bash
# Enable and start keepalived
sudo systemctl enable keepalived
sudo systemctl start keepalived

# Verify the VIP is assigned (run on both nodes)
ip addr show eth0 | grep "10.0.1.100"

# Only the MASTER should show the VIP
```

## Adding Worker Nodes

Worker nodes run your application workloads. They connect through the load balancer VIP, ensuring they can reach the cluster even when individual servers fail.

Install K3s agent on each worker node. The --server flag points to the load balancer VIP, not individual server nodes.

```bash
# On each worker node
# Workers connect through the load balancer for high availability

export K3S_TOKEN="your-generated-token-here"
export VIP_ADDRESS="10.0.1.100"
export NODE_NAME="k3s-worker-1"  # Change for each worker

# Install K3s in agent mode
curl -sfL https://get.k3s.io | sh -s - agent \
    --server="https://${VIP_ADDRESS}:6443" \
    --token="$K3S_TOKEN" \
    --node-name="$NODE_NAME"

# Verify the agent is running
sudo systemctl status k3s-agent
```

Label worker nodes for workload scheduling:

```bash
# Run from a server node or anywhere with kubectl access

# Add worker role label
kubectl label node k3s-worker-1 node-role.kubernetes.io/worker=true
kubectl label node k3s-worker-2 node-role.kubernetes.io/worker=true
kubectl label node k3s-worker-3 node-role.kubernetes.io/worker=true

# Optionally add zone labels for topology-aware scheduling
kubectl label node k3s-worker-1 topology.kubernetes.io/zone=zone-a
kubectl label node k3s-worker-2 topology.kubernetes.io/zone=zone-b
kubectl label node k3s-worker-3 topology.kubernetes.io/zone=zone-c

# Verify all nodes are ready
kubectl get nodes -o wide
```

## Testing Failover Scenarios

A high availability cluster is only valuable if failover actually works. Test these scenarios before going to production.

### Test 1: Server Node Failure

Simulate a server node failure by stopping K3s on one server:

```bash
# On one server node, stop K3s
sudo systemctl stop k3s

# From another node, verify the cluster continues operating
kubectl get nodes
# The stopped node should show NotReady status

# Verify workloads continue running
kubectl get pods -A

# Create a test deployment to confirm the API is functional
kubectl create deployment test-ha --image=nginx --replicas=3
kubectl get pods -l app=test-ha

# Restart K3s on the failed node
sudo systemctl start k3s

# Verify the node rejoins
kubectl get nodes
```

### Test 2: Load Balancer Failover

Test that the backup load balancer takes over when the primary fails:

```bash
# On the primary load balancer (LB1)
# Stop HAProxy to trigger failover
sudo systemctl stop haproxy

# Observe the VIP move to LB2
# On LB2, check if it now holds the VIP
ip addr show eth0 | grep "10.0.1.100"

# Verify kubectl still works through the VIP
kubectl get nodes

# Restart HAProxy on LB1
sudo systemctl start haproxy

# The VIP should return to LB1 (higher priority)
# Watch the transition
watch -n 1 'ip addr show eth0 | grep "10.0.1.100"'
```

### Test 3: etcd Quorum Loss and Recovery

Test what happens when etcd loses quorum (only applicable to embedded etcd):

```bash
# WARNING: This test causes temporary cluster unavailability
# Only perform in non-production environments

# Stop K3s on two of three servers
# On server-2:
sudo systemctl stop k3s

# On server-3:
sudo systemctl stop k3s

# The remaining server cannot form quorum
# kubectl commands will timeout or fail
kubectl get nodes  # This will hang or error

# Restore quorum by starting one server
# On server-2:
sudo systemctl start k3s

# Cluster should recover within 30-60 seconds
sleep 60
kubectl get nodes
```

## Monitoring HA Cluster Health

Continuous monitoring catches problems before they cause outages. Set up alerts for these critical conditions.

### Essential Health Checks

Create a monitoring script that checks all HA components. Run this periodically with a monitoring system.

```bash
#!/bin/bash
# k3s-ha-health-check.sh
# Comprehensive health check for K3s HA cluster

set -e

echo "=== K3s HA Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check 1: All nodes ready
echo "Checking node status..."
NOT_READY=$(kubectl get nodes --no-headers | grep -v " Ready " | wc -l)
if [ "$NOT_READY" -gt 0 ]; then
    echo "WARNING: $NOT_READY nodes are not ready"
    kubectl get nodes | grep -v " Ready "
else
    echo "OK: All nodes are ready"
fi
echo ""

# Check 2: etcd cluster health (for embedded etcd)
echo "Checking etcd health..."
if sudo k3s etcd-snapshot info > /dev/null 2>&1; then
    ETCD_MEMBERS=$(sudo k3s etcd-snapshot info 2>/dev/null | grep -c "member" || echo "0")
    echo "OK: etcd cluster has $ETCD_MEMBERS members"
else
    echo "INFO: Using external database (etcd check skipped)"
fi
echo ""

# Check 3: API server responsiveness
echo "Checking API server..."
API_RESPONSE=$(kubectl get --raw='/healthz' 2>/dev/null || echo "failed")
if [ "$API_RESPONSE" = "ok" ]; then
    echo "OK: API server is healthy"
else
    echo "ERROR: API server health check failed"
fi
echo ""

# Check 4: System pods running
echo "Checking system pods..."
FAILED_PODS=$(kubectl get pods -n kube-system --no-headers | grep -v "Running\|Completed" | wc -l)
if [ "$FAILED_PODS" -gt 0 ]; then
    echo "WARNING: $FAILED_PODS system pods are not running"
    kubectl get pods -n kube-system | grep -v "Running\|Completed"
else
    echo "OK: All system pods are running"
fi
echo ""

# Check 5: Control plane component health
echo "Checking control plane components..."
for COMPONENT in scheduler controller-manager; do
    HEALTH=$(kubectl get --raw="/healthz/$COMPONENT" 2>/dev/null || echo "failed")
    if [ "$HEALTH" = "ok" ]; then
        echo "OK: $COMPONENT is healthy"
    else
        echo "ERROR: $COMPONENT health check failed"
    fi
done
echo ""

echo "=== Health check complete ==="
```

### Prometheus Alerting Rules

Configure Prometheus alerts for HA-specific conditions. These rules catch problems before they escalate.

```yaml
# k3s-ha-alerts.yaml
# Prometheus alerting rules for K3s HA cluster monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: k3s-ha-alerts
  namespace: monitoring
spec:
  groups:
  - name: k3s-high-availability
    rules:
    # Alert when fewer than 3 control plane nodes are ready
    - alert: K3sControlPlaneNodeDown
      expr: |
        count(kube_node_status_condition{condition="Ready",status="true"}
        * on(node) kube_node_role{role="control-plane"}) < 3
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "K3s control plane node is down"
        description: "Fewer than 3 control plane nodes are ready. HA may be compromised."

    # Alert when etcd has no leader
    - alert: EtcdNoLeader
      expr: etcd_server_has_leader == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "etcd cluster has no leader"
        description: "The etcd cluster cannot elect a leader. Cluster writes will fail."

    # Alert on etcd high latency
    - alert: EtcdHighLatency
      expr: histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "etcd fsync latency is high"
        description: "etcd disk operations are slow, which may impact cluster performance."

    # Alert when API server is unreachable
    - alert: KubernetesApiServerDown
      expr: up{job="kubernetes-apiservers"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kubernetes API server is down"
        description: "The Kubernetes API server is not responding to health checks."

    # Alert on certificate expiration
    - alert: K3sCertificateExpiringSoon
      expr: |
        (apiserver_client_certificate_expiration_seconds_count > 0) and
        (apiserver_client_certificate_expiration_seconds_bucket{le="604800"} > 0)
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "K3s certificate expiring within 7 days"
        description: "A K3s certificate will expire within 7 days. Plan rotation."
```

## Backup and Recovery Strategies

High availability protects against node failures, but not against data corruption or accidental deletions. Implement comprehensive backup strategies.

### Automated etcd Snapshots

Configure K3s to automatically create etcd snapshots on a schedule:

```bash
# Edit the K3s service configuration
# Add these flags to the K3s server command

# /etc/systemd/system/k3s.service.d/override.conf
[Service]
ExecStart=
ExecStart=/usr/local/bin/k3s server \
    --cluster-init \
    --etcd-snapshot-schedule-cron="0 */4 * * *" \
    --etcd-snapshot-retention=12 \
    --etcd-snapshot-dir=/var/lib/rancher/k3s/server/db/snapshots

# Reload systemd and restart K3s
sudo systemctl daemon-reload
sudo systemctl restart k3s

# Verify snapshot schedule is active
sudo k3s etcd-snapshot list
```

### Manual Backup Script

Create a comprehensive backup script that captures etcd data and critical configurations:

```bash
#!/bin/bash
# k3s-backup.sh
# Complete backup script for K3s HA cluster

BACKUP_DIR="/backup/k3s/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating K3s backup in $BACKUP_DIR"

# Create etcd snapshot
echo "Creating etcd snapshot..."
sudo k3s etcd-snapshot save \
    --name "manual-$(date +%Y%m%d-%H%M%S)" \
    --dir "$BACKUP_DIR/etcd"

# Backup K3s configuration
echo "Backing up K3s configuration..."
sudo cp -r /etc/rancher/k3s "$BACKUP_DIR/config"

# Backup TLS certificates
echo "Backing up TLS certificates..."
sudo cp -r /var/lib/rancher/k3s/server/tls "$BACKUP_DIR/tls"

# Export critical Kubernetes resources
echo "Exporting Kubernetes resources..."
mkdir -p "$BACKUP_DIR/resources"

# Export namespaces
kubectl get namespaces -o yaml > "$BACKUP_DIR/resources/namespaces.yaml"

# Export cluster-wide resources
for RESOURCE in clusterroles clusterrolebindings storageclasses persistentvolumes; do
    kubectl get $RESOURCE -o yaml > "$BACKUP_DIR/resources/$RESOURCE.yaml" 2>/dev/null || true
done

# Export resources from all namespaces
for NS in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
    mkdir -p "$BACKUP_DIR/resources/$NS"
    for RESOURCE in deployments services configmaps secrets ingresses; do
        kubectl get $RESOURCE -n $NS -o yaml > "$BACKUP_DIR/resources/$NS/$RESOURCE.yaml" 2>/dev/null || true
    done
done

# Create backup manifest
cat > "$BACKUP_DIR/manifest.txt" <<EOF
Backup Date: $(date)
K3s Version: $(k3s --version)
Node Count: $(kubectl get nodes --no-headers | wc -l)
Namespace Count: $(kubectl get namespaces --no-headers | wc -l)
EOF

# Compress backup
echo "Compressing backup..."
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "Backup complete: $BACKUP_DIR.tar.gz"
```

### Disaster Recovery Procedure

Document the steps to restore your cluster from backup:

```bash
#!/bin/bash
# k3s-restore.sh
# Disaster recovery procedure for K3s HA cluster
# WARNING: This will reset the cluster state to the backup point

SNAPSHOT_PATH="$1"

if [ -z "$SNAPSHOT_PATH" ]; then
    echo "Usage: $0 <snapshot-path>"
    echo "Example: $0 /backup/k3s/manual-20240115-120000"
    exit 1
fi

echo "=== K3s Disaster Recovery ==="
echo "Restoring from: $SNAPSHOT_PATH"
echo "WARNING: This will reset cluster state!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Stop K3s on all server nodes except this one
echo ""
echo "Step 1: Stop K3s on OTHER server nodes before proceeding"
echo "Run on other servers: sudo systemctl stop k3s"
read -p "Press Enter when other servers are stopped..."

# Step 2: Stop K3s on this node
echo ""
echo "Step 2: Stopping K3s on this node..."
sudo systemctl stop k3s

# Step 3: Restore from snapshot
echo ""
echo "Step 3: Restoring from snapshot..."
sudo k3s server \
    --cluster-reset \
    --cluster-reset-restore-path="$SNAPSHOT_PATH"

# Step 4: Start K3s
echo ""
echo "Step 4: Starting K3s..."
sudo systemctl start k3s

# Wait for recovery
echo "Waiting for cluster to recover..."
sleep 60

# Step 5: Verify recovery
echo ""
echo "Step 5: Verifying cluster health..."
kubectl get nodes
kubectl get pods -n kube-system

echo ""
echo "=== Recovery Complete ==="
echo ""
echo "Next steps:"
echo "1. On OTHER server nodes, remove old data:"
echo "   sudo rm -rf /var/lib/rancher/k3s/server/db"
echo "2. Start K3s on other servers:"
echo "   sudo systemctl start k3s"
echo "3. Verify all nodes rejoin the cluster"
```

## Common HA Pitfalls and Solutions

Learn from common mistakes that undermine K3s high availability deployments.

### Pitfall 1: Single Load Balancer

**Problem**: Using a single load balancer creates a single point of failure.

**Solution**: Always deploy at least two load balancers with Keepalived or use a cloud load balancer with built-in redundancy.

### Pitfall 2: Insufficient etcd Resources

**Problem**: etcd runs slowly or becomes unresponsive under load.

**Solution**: Use fast SSDs (preferably NVMe), ensure adequate RAM, and monitor etcd latency metrics.

```bash
# Check etcd disk performance
sudo fio --name=etcd-test --rw=write --bs=4k --size=100M \
    --numjobs=1 --time_based --runtime=10s \
    --filename=/var/lib/rancher/k3s/server/db/test.tmp

# etcd requires < 10ms fsync latency for reliable operation
```

### Pitfall 3: Network Partitions

**Problem**: Network issues cause split-brain scenarios or etcd quorum loss.

**Solution**: Use reliable networking, monitor connectivity between nodes, and consider dedicated network interfaces for cluster traffic.

```bash
# Test connectivity between all server nodes
for SERVER in 10.0.1.111 10.0.1.112 10.0.1.113; do
    echo "Testing $SERVER..."
    ping -c 3 $SERVER
    nc -zv $SERVER 6443
    nc -zv $SERVER 2379
done
```

### Pitfall 4: Ignoring Certificate Expiration

**Problem**: K3s certificates expire, causing cluster communication failures.

**Solution**: K3s automatically rotates certificates, but monitor expiration dates and ensure the rotation process works.

```bash
# Check certificate expiration dates
for CERT in /var/lib/rancher/k3s/server/tls/*.crt; do
    echo "=== $CERT ==="
    openssl x509 -in "$CERT" -noout -enddate
done
```

### Pitfall 5: No Regular Backup Testing

**Problem**: Backups exist but have never been tested for restoration.

**Solution**: Regularly test your backup and restore procedures in a non-production environment.

```bash
# Schedule monthly restore tests
# Create a test cluster and verify backups restore correctly
# Document any issues and update procedures
```

## Conclusion

Configuring K3s for high availability requires attention to every layer of the stack. From the control plane to the datastore to the load balancer, each component must be redundant and able to fail over automatically.

The key principles to remember:

**Use odd numbers for quorum-based systems**: Three servers provide fault tolerance for one failure. Five servers tolerate two failures. Never use even numbers for server node counts.

**Test failover before going to production**: A high availability configuration that has never been tested is just a hopeful configuration. Regularly simulate failures and verify recovery.

**Monitor everything**: You cannot fix problems you cannot see. Implement comprehensive monitoring and alerting for all HA components.

**Backup religiously**: High availability protects against node failures, not data loss. Maintain regular backups and test your restore procedures.

**Document your procedures**: When an incident occurs at 3 AM, clear documentation makes the difference between a quick recovery and a prolonged outage.

K3s makes Kubernetes accessible, but accessible does not mean simple. Production clusters demand production-grade practices. Invest the time to configure high availability correctly, and your cluster will serve you reliably when it matters most.

For monitoring your K3s clusters and ensuring you catch issues before they become outages, consider tools like OneUptime that provide comprehensive observability across your infrastructure. Visibility into cluster health, application performance, and infrastructure metrics in a single dashboard makes operating highly available Kubernetes significantly more manageable.

## Additional Resources

- [K3s High Availability Documentation](https://docs.k3s.io/installation/ha)
- [K3s Datastore Options](https://docs.k3s.io/installation/datastore)
- [etcd Documentation](https://etcd.io/docs/)
- [HAProxy Documentation](https://www.haproxy.org/documentation.html)
- [Keepalived Documentation](https://keepalived.readthedocs.io/)
