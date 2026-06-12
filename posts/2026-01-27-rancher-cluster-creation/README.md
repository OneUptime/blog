# How to Create Kubernetes Clusters with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rancher, RKE, Cloud Provider, Cluster Management, DevOps, Infrastructure, Container Orchestration

Description: A comprehensive guide to creating Kubernetes clusters with Rancher, covering RKE vs imported clusters, cloud provider integration, custom cluster creation, and cluster provisioning strategies.

---

> "The best infrastructure is the one that gets out of your way and lets you focus on building what matters."

Rancher has become one of the most popular multi-cluster Kubernetes management platforms. Whether you are deploying clusters on bare metal, cloud providers, or importing existing clusters, Rancher provides a unified interface to manage them all. This guide walks through the different approaches to creating and managing Kubernetes clusters with Rancher.

## Understanding Rancher Cluster Types

Before diving into cluster creation, it is important to understand the different cluster types Rancher supports.

```mermaid
flowchart TB
    subgraph Rancher["Rancher Management Server"]
        UI[Rancher UI]
        API[Rancher API]
    end

    subgraph ClusterTypes["Cluster Types"]
        RKE1[RKE1 Clusters]
        RKE2[RKE2/K3s Clusters]
        Imported[Imported Clusters]
        Hosted[Hosted Providers]
    end

    subgraph Infrastructure["Infrastructure"]
        BM[Bare Metal]
        VM[Virtual Machines]
        Cloud[Cloud VMs]
        Managed[Managed K8s]
    end

    Rancher --> ClusterTypes
    RKE1 --> BM
    RKE1 --> VM
    RKE2 --> BM
    RKE2 --> VM
    RKE2 --> Cloud
    Hosted --> Managed
    Imported --> Managed
```

### Cluster Type Comparison

| Feature | RKE1 | RKE2/K3s | Imported | Hosted Provider |
|---------|------|----------|----------|-----------------|
| Full lifecycle management | Legacy only | Yes | No | Partial |
| Custom node configuration | Yes | Yes | No | Limited |
| etcd backup/restore | Yes | Yes | No | Provider-dependent |
| Certificate rotation | Yes | Yes | No | Provider-dependent |
| Upgrade control | Legacy only | Full | Limited | Limited |
| Best for | Existing RKE1 clusters | Modern deployments | Existing clusters | Cloud-native teams |

## RKE vs RKE2: Choosing Your Distribution

RKE (Rancher Kubernetes Engine) comes in two versions. Understanding when to use each is critical for long-term success. RKE1 reached end of life on July 31, 2025, and Rancher 2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters. Use RKE1 guidance only for maintaining existing legacy clusters; use RKE2 or K3s for new Rancher-managed clusters.

### RKE1: The Original

RKE1 is Docker-based and was battle-tested for years, but it should be treated as a legacy option.

```yaml
# rke-cluster.yml - RKE1 cluster configuration

# Defines a production-ready 3-node cluster with HA control plane

nodes:
  # Control plane node 1 - runs etcd, controlplane, and worker roles
  - address: 10.0.1.10
    user: ubuntu
    role: [controlplane, etcd, worker]
    ssh_key_path: ~/.ssh/id_rsa
    # Optionally specify Docker version
    docker_socket: /var/run/docker.sock

  # Control plane node 2 - provides HA for etcd and control plane
  - address: 10.0.1.11
    user: ubuntu
    role: [controlplane, etcd, worker]
    ssh_key_path: ~/.ssh/id_rsa

  # Control plane node 3 - third member for etcd quorum
  - address: 10.0.1.12
    user: ubuntu
    role: [controlplane, etcd, worker]
    ssh_key_path: ~/.ssh/id_rsa

# Kubernetes version to deploy
kubernetes_version: v1.28.4-rancher1-1

# Network plugin configuration - Calico for production workloads
network:
  plugin: calico
  options:
    # Use BGP for better performance in large clusters
    calico_cloud_provider: none

# Services configuration for API server, kubelet, etc.
services:
  etcd:
    # Enable automatic etcd snapshots for disaster recovery
    snapshot: true
    retention: "72h"
    creation: "12h"
    backup_config:
      enabled: true
      interval_hours: 12
      retention: 6

  kube-api:
    # Additional API server arguments
    extra_args:
      # Enable audit logging
      audit-log-path: /var/log/kube-audit/audit.log
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"

  kubelet:
    extra_args:
      # Resource reservation for system components
      system-reserved: cpu=200m,memory=512Mi
      kube-reserved: cpu=200m,memory=512Mi
```

Deploy the cluster with RKE CLI:

```bash
# Deploy the Kubernetes cluster
# This process typically takes 10-15 minutes
rke up --config rke-cluster.yml

# The kubeconfig is generated automatically
export KUBECONFIG=$(pwd)/kube_config_rke-cluster.yml

# Verify cluster health
kubectl get nodes
kubectl get --raw='/readyz?verbose'
```

### RKE2: The Security-Focused Successor

RKE2 (also known as RKE Government) uses containerd instead of Docker and includes additional security hardening.

```yaml
# rke2-config.yaml - RKE2 server configuration
# Place this at /etc/rancher/rke2/config.yaml on your server nodes

# Token for joining nodes to the cluster
# Generate with: openssl rand -hex 32
token: your-secure-cluster-token

# TLS SAN for API server certificate
# Include all hostnames and IPs that will access the API
tls-san:
  - rancher.example.com
  - 10.0.1.10
  - 10.0.1.11
  - 10.0.1.12

# CNI plugin - Cilium offers eBPF-based networking
cni: cilium

# Enable secrets encryption at rest
secrets-encryption: true

# Write kubeconfig with appropriate permissions
write-kubeconfig-mode: "0644"

# Disable default components we want to customize
disable:
  - rke2-ingress-nginx  # We will deploy our own ingress

# Profile for CIS benchmark hardening
# Use "cis"; "cis-1.23" is deprecated in current RKE2 releases
profile: cis

# Kubelet arguments for resource management
kubelet-arg:
  - "max-pods=110"
  - "system-reserved=cpu=200m,memory=512Mi"
  - "kube-reserved=cpu=200m,memory=512Mi"

# etcd configuration for high availability
etcd-expose-metrics: true
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 10
```

Installation script for RKE2:

```bash
#!/bin/bash
# install-rke2-server.sh
# Installs RKE2 server on the first control plane node

set -euo pipefail

# Download and install RKE2
curl -sfL https://get.rke2.io | sh -

# Create configuration directory
mkdir -p /etc/rancher/rke2

# Copy configuration file (assumes config.yaml is prepared)
cp ./rke2-config.yaml /etc/rancher/rke2/config.yaml

# Enable and start RKE2 server
systemctl enable rke2-server.service
systemctl start rke2-server.service

# Wait for the cluster to be ready
echo "Waiting for cluster to initialize..."
sleep 60

# Configure kubectl
mkdir -p ~/.kube
cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
chmod 600 ~/.kube/config

# Add RKE2 binaries to PATH
export PATH=$PATH:/var/lib/rancher/rke2/bin
echo 'export PATH=$PATH:/var/lib/rancher/rke2/bin' >> ~/.bashrc

# Verify installation
kubectl get nodes
```

For additional server nodes (HA setup):

```yaml
# rke2-server-config.yaml for additional control plane nodes
# Place at /etc/rancher/rke2/config.yaml

# Join token - must match the server token
token: your-secure-cluster-token

# Address of the first server to join
server: https://10.0.1.10:9345

# This node will be a server (control plane) node
# For worker-only nodes, use the agent installation instead
```

## Cloud Provider Integration

Rancher excels at creating clusters across multiple cloud providers through a unified interface.

```mermaid
flowchart LR
    subgraph Rancher["Rancher Server"]
        CC[Cluster Controller]
        NC[Node Controller]
    end

    subgraph CloudAPIs["Cloud Provider APIs"]
        AWS[AWS EC2/EKS]
        GCP[GCP GKE/Compute]
        Azure[Azure AKS/VMs]
        DO[DigitalOcean]
        Linode[Linode]
    end

    subgraph Clusters["Provisioned Clusters"]
        C1[Cluster 1]
        C2[Cluster 2]
        C3[Cluster 3]
    end

    CC --> CloudAPIs
    NC --> CloudAPIs
    CloudAPIs --> Clusters
```

### AWS Cloud Provider Configuration

```yaml
# aws-cloud-provider.yaml
# Cloud controller configuration for AWS integration
# Use this with the external AWS cloud controller manager.
# Use the AWS EBS CSI driver for dynamic EBS volume provisioning.

apiVersion: v1
kind: ConfigMap
metadata:
  name: cloud-provider-config
  namespace: kube-system
data:
  cloud.conf: |
    [Global]
    # AWS region where the cluster is deployed
    Zone=us-west-2a

    # VPC ID for the cluster - required for proper ENI allocation
    VPC=vpc-0123456789abcdef0

    # Subnet ID for control plane components
    SubnetID=subnet-0123456789abcdef0

    # Disable strict AWS metadata token requirement if needed
    DisableStrictZoneCheck=true

    # Role ARN for the cluster to assume (optional)
    # RoleARN=arn:aws:iam::123456789012:role/KubernetesClusterRole

    [ServiceOverride "ec2"]
    # Use custom endpoint for EC2 if needed (useful for private endpoints)
    # URL=https://ec2.us-west-2.amazonaws.com

    [ServiceOverride "elasticloadbalancing"]
    # Use custom endpoint for ELB if needed
    # URL=https://elasticloadbalancing.us-west-2.amazonaws.com
```

Rancher node template for AWS:

```yaml
# rancher-aws-node-template.yaml
# Defines the EC2 instance configuration for Rancher-managed nodes

apiVersion: rke-machine-config.cattle.io/v1
kind: Amazonec2Config
metadata:
  name: aws-production-template
  namespace: fleet-default
spec:
  # AWS region
  region: us-west-2

  # Availability zone
  zone: a

  # VPC and subnet configuration
  vpcId: vpc-0123456789abcdef0
  subnetId: subnet-0123456789abcdef0

  # Instance configuration
  instanceType: m5.xlarge
  rootSize: "100"  # GB

  # AMI - use an OS image supported by your Rancher/RKE2 version
  ami: ami-0123456789abcdef0

  # Security group for the nodes
  securityGroup:
    - k8s-nodes-sg

  # IAM instance profile for AWS integrations
  iamInstanceProfile: K8sNodeInstanceProfile

  # SSH configuration
  sshUser: ubuntu
  sshKeyContents: |
    ssh-rsa AAAAB3NzaC1yc2E... your-public-key

  # Enable detailed CloudWatch monitoring
  monitoring: true

  # Use spot instances for cost savings (optional)
  # requestSpotInstance: true
  # spotPrice: "0.10"

  # Tags for cost allocation and identification
  tags: Environment,Production,Team,Platform
```

### Creating an EKS Cluster via Rancher

```hcl
# rancher-eks-cluster.tf
# Creates a fully managed EKS cluster through Rancher

resource "rancher2_cluster" "production_eks" {
  name        = "production-eks"
  description = "Production EKS Cluster"

  eks_config_v2 {
    # AWS region for the cluster
    region = "us-west-2"

    # Kubernetes version
    kubernetes_version = "1.35"

    # Cloud credential for AWS access
    cloud_credential_id = "cattle-global-data:cc-aws-prod"

    # VPC configuration
    subnets = [
      "subnet-0123456789abcdef0", # Private subnet AZ-a
      "subnet-0123456789abcdef1", # Private subnet AZ-b
      "subnet-0123456789abcdef2", # Private subnet AZ-c
    ]
    security_groups = ["sg-0123456789abcdef0"]

    # Control plane logging
    logging_types = [
      "api",
      "audit",
      "authenticator",
      "controllerManager",
      "scheduler",
    ]

    # Enable private API endpoint
    private_access        = true
    public_access         = true
    public_access_sources = ["10.0.0.0/8"] # Restrict to internal networks

    # KMS encryption for secrets
    secrets_encryption = true
    kms_key            = "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"

    # Node groups configuration
    node_groups {
      name          = "general-purpose"
      instance_type = "m5.xlarge"
      desired_size  = 3
      min_size      = 2
      max_size      = 10
      disk_size     = 100
      labels = {
        "workload-type" = "general"
      }
    }

    node_groups {
      name          = "memory-optimized"
      instance_type = "r5.2xlarge"
      desired_size  = 2
      min_size      = 1
      max_size      = 5
      disk_size     = 200
      labels = {
        "workload-type" = "memory-intensive"
      }
    }
  }
}
```

## Custom Cluster Creation

For maximum control, Rancher allows creating custom clusters where you provide your own infrastructure.

```mermaid
sequenceDiagram
    participant Admin as Administrator
    participant Rancher as Rancher Server
    participant Node as Target Nodes

    Admin->>Rancher: Create Custom Cluster
    Rancher->>Admin: Generate Registration Command
    Admin->>Node: Run Registration Command
    Node->>Rancher: Register with Agent
    Rancher->>Node: Deploy Kubernetes Components
    Node->>Rancher: Report Node Ready
    Rancher->>Admin: Cluster Available
```

### Step 1: Create the Cluster in Rancher

```yaml
# rancher-custom-cluster.yaml
# Defines a custom cluster where nodes are manually registered

apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: custom-production
  namespace: fleet-default
spec:
  displayName: Custom Production Cluster
  kubernetesVersion: v1.35.5+rke2r1

  # RKE2 configuration for custom clusters
  rkeConfig:
    # Machine global configuration
    machineGlobalConfig:
      # CNI plugin
      cni: calico

      # Disable default ingress - we deploy our own
      disable:
        - rke2-ingress-nginx

      # Enable secrets encryption
      secrets-encryption: true

      # Audit logging configuration
      kube-apiserver-arg:
        - audit-log-path=/var/log/kube-audit/audit.log
        - audit-log-maxage=30
        - audit-log-maxbackup=10
        - audit-log-maxsize=100

    # etcd configuration
    etcd:
      # Enable automatic snapshots
      snapshotScheduleCron: "0 */6 * * *"
      snapshotRetention: 10

      # S3 backup for disaster recovery
      s3:
        bucket: k8s-etcd-backups
        region: us-west-2
        folder: custom-production
        cloudCredentialSecretName: cattle-global-data:cc-aws-backup

    # Upgrade strategy
    upgradeStrategy:
      controlPlaneDrainOptions:
        enabled: true
        gracePeriod: 60
        timeout: 300
      workerDrainOptions:
        enabled: true
        gracePeriod: 60
        timeout: 300
      controlPlaneConcurrency: "1"
      workerConcurrency: "10%"

    # Machine selector configuration for different node roles
    machineSelectorConfig:
      - config:
          # Configuration for control plane nodes
          kubelet-arg:
            - system-reserved=cpu=500m,memory=1Gi
            - kube-reserved=cpu=500m,memory=1Gi
        machineLabelSelector:
          matchLabels:
            node-role: control-plane

      - config:
          # Configuration for worker nodes
          kubelet-arg:
            - system-reserved=cpu=200m,memory=512Mi
            - kube-reserved=cpu=200m,memory=512Mi
            - max-pods=110
        machineLabelSelector:
          matchLabels:
            node-role: worker
```

### Step 2: Register Nodes

After creating the cluster, Rancher provides a registration command. Here is a script to automate node registration:

```bash
#!/bin/bash
# register-node.sh
# Registers a node with the Rancher-managed custom cluster

set -euo pipefail

# Configuration - replace with values from the Rancher registration command
RANCHER_URL="https://rancher.example.com"
TOKEN="token-xxxxx:xxxxxxxxxxxx"
CA_CHECKSUM="sha256-checksum-from-rancher"  # Leave empty if Rancher did not include one
NODE_ROLE="${1:-worker}"  # control-plane, etcd, or worker

# Validate node role
case $NODE_ROLE in
  control-plane|etcd|worker|all)
    echo "Registering node with role: $NODE_ROLE"
    ;;
  *)
    echo "Invalid role. Use: control-plane, etcd, worker, or all"
    exit 1
    ;;
esac

# Build role flags and node labels
ROLE_FLAGS=()
LABELS=()
if [[ "$NODE_ROLE" == "all" ]]; then
  ROLE_FLAGS=(--etcd --controlplane --worker)
  LABELS=(--label node-role=all)
elif [[ "$NODE_ROLE" == "control-plane" ]]; then
  ROLE_FLAGS=(--controlplane --etcd)
  LABELS=(--label node-role=control-plane)
else
  ROLE_FLAGS=(--"$NODE_ROLE")
  LABELS=(--label node-role="$NODE_ROLE")
fi

# Pre-flight checks
echo "Running pre-flight checks..."

# Check network connectivity to Rancher
if ! curl -sk "$RANCHER_URL/healthz" > /dev/null; then
  echo "ERROR: Cannot reach Rancher server at $RANCHER_URL"
  exit 1
fi

# Check required ports
for port in 6443 9345 10250; do
  if netstat -tuln | grep -q ":$port "; then
    echo "WARNING: Port $port is already in use"
  fi
done

# Register the node with Rancher System Agent
echo "Registering node with Rancher..."
INSTALL_ARGS=(
  --server "$RANCHER_URL"
  --label cattle.io/os=linux
  --token "$TOKEN"
)

if [[ -n "$CA_CHECKSUM" ]]; then
  INSTALL_ARGS+=(--ca-checksum "$CA_CHECKSUM")
fi

curl -fL "$RANCHER_URL/system-agent-install.sh" | \
  sudo sh -s - "${INSTALL_ARGS[@]}" "${ROLE_FLAGS[@]}" "${LABELS[@]}"

echo "Node registration initiated. Check Rancher UI for status."
```

### Step 3: Post-Registration Configuration

```yaml
# post-registration-config.yaml
# Apply after nodes are registered and cluster is ready

---
# Priority classes for workload scheduling
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-system
value: 1000000
globalDefault: false
description: "Critical system components that must not be preempted"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 100000
globalDefault: false
description: "High priority production workloads"

---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: default-priority
value: 10000
globalDefault: true
description: "Default priority for standard workloads"

---
# Resource quotas for namespaces
apiVersion: v1
kind: ResourceQuota
metadata:
  name: default-quota
  namespace: production
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    persistentvolumeclaims: "50"
    services.loadbalancers: "10"

---
# Limit ranges for containers
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: "1"
        memory: 2Gi
      defaultRequest:
        cpu: 100m
        memory: 256Mi
      type: Container
```

## Cluster Provisioning Best Practices

### Network Architecture

```mermaid
flowchart TB
    subgraph External["External Access"]
        Internet[Internet]
        VPN[Corporate VPN]
    end

    subgraph LoadBalancers["Load Balancers"]
        GLB[Global Load Balancer]
        NLB1[NLB - Region 1]
        NLB2[NLB - Region 2]
    end

    subgraph Cluster1["Production Cluster"]
        CP1[Control Plane VIP]
        W1[Worker Nodes]
        subgraph Networking1["Pod Network"]
            SVC1[Service CIDR]
            POD1[Pod CIDR]
        end
    end

    subgraph Cluster2["DR Cluster"]
        CP2[Control Plane VIP]
        W2[Worker Nodes]
        subgraph Networking2["Pod Network"]
            SVC2[Service CIDR]
            POD2[Pod CIDR]
        end
    end

    Internet --> GLB
    VPN --> GLB
    GLB --> NLB1
    GLB --> NLB2
    NLB1 --> CP1
    NLB2 --> CP2
    CP1 --> W1
    CP2 --> W2
    W1 --> Networking1
    W2 --> Networking2
```

### High Availability Configuration

```yaml
# ha-cluster-config.yaml
# Production-ready HA configuration for Rancher-managed clusters

apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: ha-production
  namespace: fleet-default
spec:
  displayName: HA Production Cluster
  kubernetesVersion: v1.35.5+rke2r1
  cloudCredentialSecretName: cattle-global-data:cc-aws-prod

  rkeConfig:
    machineGlobalConfig:
      cni: cilium

      # API server HA configuration
      tls-san:
        - k8s-api.example.com  # Load balancer DNS
        - 10.0.1.100           # Load balancer VIP

      # Disable cloud controller if managing manually
      disable-cloud-controller: true

      # etcd HA settings
      etcd-expose-metrics: true

    # Separate machine pools for control plane and workers
    machinePools:
      - name: control-plane-pool
        controlPlaneRole: true
        etcdRole: true
        workerRole: false
        quantity: 3  # Always odd number for etcd quorum
        drainBeforeDelete: true
        machineConfigRef:
          kind: Amazonec2Config
          name: cp-machine-config

      - name: worker-pool-general
        controlPlaneRole: false
        etcdRole: false
        workerRole: true
        quantity: 5
        drainBeforeDelete: true
        machineConfigRef:
          kind: Amazonec2Config
          name: worker-machine-config

      - name: worker-pool-compute
        controlPlaneRole: false
        etcdRole: false
        workerRole: true
        quantity: 3
        drainBeforeDelete: true
        labels:
          node-type: compute-optimized
        taints:
          - key: node-type
            value: compute
            effect: NoSchedule
        machineConfigRef:
          kind: Amazonec2Config
          name: compute-machine-config

    # Upgrade strategy
    upgradeStrategy:
      controlPlaneConcurrency: "1"
      workerConcurrency: "10%"
```

### Importing Existing Clusters

For clusters not provisioned by Rancher, you can import them for unified management.

```bash
#!/bin/bash
# import-cluster.sh
# Imports an existing Kubernetes cluster into Rancher

set -euo pipefail

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:xxxxxxxxxxxxxxxxxxxxxxx"
CLUSTER_NAME="imported-gke-prod"

# Create import cluster request
echo "Creating import cluster in Rancher..."
CLUSTER_RESPONSE=$(curl -sk "$RANCHER_URL/v3/clusters" \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cluster",
    "name": "'"$CLUSTER_NAME"'",
    "description": "Imported GKE Production Cluster",
    "labels": {
      "environment": "production",
      "provider": "gke"
    }
  }')

CLUSTER_ID=$(echo "$CLUSTER_RESPONSE" | jq -r '.id')
echo "Created cluster with ID: $CLUSTER_ID"

# Get the import manifest URL
echo "Fetching import manifest..."
sleep 5  # Wait for registration token

MANIFEST_URL=$(curl -sk "$RANCHER_URL/v3/clusters/$CLUSTER_ID/clusterregistrationtokens" \
  -H "Authorization: Bearer $RANCHER_TOKEN" | \
  jq -r '.data[0].manifestUrl')

echo "Import manifest URL: $MANIFEST_URL"

# Apply the manifest to the target cluster
# Ensure kubectl is configured for the target cluster
echo "Applying import manifest to target cluster..."
kubectl apply -f "$MANIFEST_URL"

echo ""
echo "Cluster import initiated."
echo "The cluster will appear in Rancher once the agent connects."
echo "This typically takes 1-2 minutes."
```

### Agent Configuration for Imported Clusters

```yaml
# Configure these as Rancher agent environment variables when importing.
agentEnvVars:
  # Configure agent HTTP proxy if needed
  - name: HTTP_PROXY
    value: http://proxy.example.com:3128
  - name: HTTPS_PROXY
    value: http://proxy.example.com:3128
  - name: NO_PROXY
    value: localhost,127.0.0.1,10.0.0.0/8,.cluster.local

  # Agent logging level
  - name: CATTLE_LOG_LEVEL
    value: info
```

## Monitoring Your Rancher Clusters

Once your clusters are provisioned, monitoring becomes critical. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Kubernetes clusters managed by Rancher.

```bash
# Install the OneUptime Kubernetes Agent Helm chart
helm repo add oneuptime https://helm-chart.oneuptime.com
helm repo update

helm install kubernetes-agent oneuptime/kubernetes-agent \
  --namespace oneuptime-agent \
  --create-namespace \
  --set oneuptime.url="https://oneuptime.com" \
  --set oneuptime.apiKey="your-oneuptime-api-key" \
  --set clusterName="rancher-production"

# Verify the agent pods
kubectl get pods -n oneuptime-agent
```

Set up cluster health monitoring:

```bash
# Confirm the API server readiness endpoint
kubectl get --raw='/readyz?verbose'

# Confirm DNS is resolving inside the cluster
kubectl run dns-check --rm -i --restart=Never --image=busybox:1.36 -- \
  nslookup kubernetes.default.svc.cluster.local

# Confirm the OneUptime agent is collecting from the cluster
kubectl get pods -n oneuptime-agent
```

## Troubleshooting Common Issues

### Cluster Provisioning Failures

```bash
#!/bin/bash
# diagnose-cluster.sh
# Diagnostic script for Rancher cluster provisioning issues

echo "=== Rancher Agent Logs ==="
kubectl -n cattle-system logs -l app=cattle-cluster-agent --tail=100

echo ""
echo "=== Node Conditions ==="
kubectl get nodes -o custom-columns=\
'NAME:.metadata.name,READY:.status.conditions[?(@.type=="Ready")].status,DISK:.status.conditions[?(@.type=="DiskPressure")].status,MEMORY:.status.conditions[?(@.type=="MemoryPressure")].status,PID:.status.conditions[?(@.type=="PIDPressure")].status'

echo ""
echo "=== System Component Status ==="
kubectl -n kube-system get pods --field-selector=status.phase!=Running

echo ""
echo "=== Recent Events ==="
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20

echo ""
echo "=== etcd Health (if accessible) ==="
kubectl -n kube-system exec etcd-$(hostname) -- etcdctl endpoint health 2>/dev/null || echo "etcd not accessible from this node"
```

### Network Connectivity Issues

```yaml
# network-diagnostics.yaml
# Deploy network diagnostic pods

apiVersion: v1
kind: Pod
metadata:
  name: network-debug
  namespace: default
spec:
  containers:
    - name: debug
      image: nicolaka/netshoot
      command: ["sleep", "3600"]
      securityContext:
        capabilities:
          add: ["NET_ADMIN", "SYS_PTRACE"]
  hostNetwork: false
  dnsPolicy: ClusterFirst
```

Run network diagnostics:

```bash
# Test cluster DNS
kubectl exec -it network-debug -- nslookup kubernetes.default

# Test external connectivity
kubectl exec -it network-debug -- curl -I https://rancher.example.com

# Check pod-to-pod connectivity across nodes
kubectl exec -it network-debug -- ping -c 3 <pod-ip-on-different-node>

# Verify service discovery
kubectl exec -it network-debug -- curl -I http://kube-dns.kube-system.svc.cluster.local:9153/metrics
```

## Conclusion

Rancher provides a powerful and flexible platform for creating and managing Kubernetes clusters across any infrastructure. Whether you choose RKE for full control, leverage cloud provider integrations for managed infrastructure, or import existing clusters for unified management, Rancher streamlines the operational complexity of multi-cluster Kubernetes.

Key takeaways:

- **RKE2 is the recommended choice** for new deployments due to its security hardening and containerd runtime
- **Cloud provider integrations** simplify infrastructure provisioning while maintaining Rancher's management benefits
- **Custom clusters** offer maximum flexibility for existing infrastructure or specific requirements
- **Proper monitoring** with tools like [OneUptime](https://oneuptime.com) is essential for maintaining cluster health and reliability

Start with a clear understanding of your requirements, choose the right cluster type, and build automation from day one. Your future self will thank you when scaling to dozens of clusters becomes a routine operation rather than a crisis response.
