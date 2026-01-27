# How to Create Kubernetes Clusters with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rancher, RKE2, Cluster Management, DevOps, Cloud Native, Infrastructure

Description: A comprehensive guide to creating and managing Kubernetes clusters using Rancher, covering installation, RKE2 clusters, importing existing clusters, node pools, cluster templates, and cloud provider integration.

---

> Rancher transforms Kubernetes cluster management from a complex operational burden into a streamlined, visual experience. Whether you are provisioning new clusters or importing existing ones, Rancher provides a unified control plane for your entire Kubernetes estate.

## What is Rancher?

Rancher is an open-source container management platform that simplifies Kubernetes operations at scale. It provides a centralized management interface for creating, importing, and managing multiple Kubernetes clusters across any infrastructure - from bare metal to public clouds.

Key capabilities include:
- **Multi-cluster management** - Manage clusters across different providers from a single UI
- **RKE2 provisioning** - Deploy production-grade Kubernetes with Rancher Kubernetes Engine 2
- **Cluster templates** - Standardize cluster configurations across your organization
- **User authentication** - Integrate with LDAP, Active Directory, GitHub, and more
- **Role-based access control** - Fine-grained permissions for teams and projects

## Installing Rancher

Rancher can be deployed in several ways. The recommended production approach is running Rancher on a dedicated Kubernetes cluster.

### Prerequisites

Before installing Rancher, ensure you have:
- A Kubernetes cluster (K3s, RKE2, or any certified distribution)
- kubectl configured to access the cluster
- Helm 3 installed
- A valid domain name with DNS configured (for production)

### Option 1: Install Rancher with Helm (Recommended)

```bash
# Add the Rancher Helm repository
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest

# Update your Helm repositories
helm repo update

# Create a namespace for Rancher
kubectl create namespace cattle-system
```

For production deployments with cert-manager (recommended):

```bash
# Install cert-manager for automatic TLS certificate management
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml

# Add the Jetstack Helm repository for cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0

# Wait for cert-manager pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager \
  -n cert-manager --timeout=120s

# Install Rancher with Let's Encrypt certificates
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=admin@yourdomain.com \
  --set letsEncrypt.ingress.class=nginx
```

### Option 2: Install Rancher with Self-Signed Certificates (Development)

```bash
# Install Rancher with Rancher-generated self-signed certificates
# Suitable for testing and development environments
helm install rancher rancher-latest/rancher \
  --namespace cattle-system \
  --set hostname=rancher.local \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=rancher \
  --set replicas=1
```

### Option 3: Quick Start with Docker (Testing Only)

```bash
# Run Rancher as a single Docker container
# WARNING: Not recommended for production - data is not persistent by default
docker run -d --restart=unless-stopped \
  -p 80:80 -p 443:443 \
  --privileged \
  rancher/rancher:latest

# Access Rancher at https://localhost
# Retrieve the bootstrap password from container logs
docker logs $(docker ps -q --filter ancestor=rancher/rancher) 2>&1 | grep "Bootstrap Password:"
```

### Verify Installation

```bash
# Check Rancher deployment status
kubectl -n cattle-system rollout status deploy/rancher

# Verify all pods are running
kubectl -n cattle-system get pods

# Expected output:
# NAME                       READY   STATUS    RESTARTS   AGE
# rancher-7b9d7b6b8f-xxxxx   1/1     Running   0          5m
# rancher-7b9d7b6b8f-yyyyy   1/1     Running   0          5m
# rancher-7b9d7b6b8f-zzzzz   1/1     Running   0          5m
```

## Creating RKE2 Clusters

RKE2 (Rancher Kubernetes Engine 2) is a fully conformant Kubernetes distribution focused on security and compliance. It is the successor to RKE and the recommended way to provision clusters through Rancher.

### Understanding RKE2

RKE2 provides several advantages:
- **CIS Benchmark compliance** - Secure by default configuration
- **FIPS 140-2 compliance** - Available for regulated environments
- **Embedded etcd** - Simplified control plane management
- **Containerd runtime** - No Docker dependency

### Creating an RKE2 Cluster via Rancher UI

1. Log in to Rancher and navigate to **Cluster Management**
2. Click **Create** and select **Custom** for infrastructure you manage
3. Configure the cluster settings:

```yaml
# Example cluster configuration (shown in Rancher UI)
# These settings are configured through the web interface

Cluster Name: production-cluster
Kubernetes Version: v1.28.5+rke2r1
Container Network: Calico

# Control Plane Configuration
Control Plane Pool:
  - Count: 3  # Odd number for etcd quorum
  - Machine Roles: etcd, control-plane

# Worker Pool Configuration
Worker Pool:
  - Count: 5
  - Machine Roles: worker
```

### Creating an RKE2 Cluster via API/CLI

```bash
# Create cluster configuration file
cat <<EOF > cluster-config.yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-cluster
  namespace: fleet-default
spec:
  # Kubernetes version to deploy
  kubernetesVersion: v1.28.5+rke2r1

  # Enable the local cluster agent
  enableNetworkPolicy: true

  # RKE2 specific configuration
  rkeConfig:
    # Machine pools define the node groups
    machinePools:
      # Control plane nodes - always use odd numbers (1, 3, 5)
      - name: control-plane-pool
        controlPlaneRole: true
        etcdRole: true
        quantity: 3
        machineConfigRef:
          kind: Amazonec2Config
          name: control-plane-config

      # Worker nodes - scale based on workload requirements
      - name: worker-pool
        workerRole: true
        quantity: 5
        machineConfigRef:
          kind: Amazonec2Config
          name: worker-config

    # Cluster networking configuration
    machineGlobalConfig:
      cni: calico
      # Disable default ingress controller if using custom one
      disable:
        - rke2-ingress-nginx

    # Additional manifests to deploy on cluster creation
    additionalManifest: |
      apiVersion: v1
      kind: Namespace
      metadata:
        name: monitoring
EOF

# Apply the cluster configuration
kubectl apply -f cluster-config.yaml
```

### Registering Nodes to the Cluster

After creating the cluster in Rancher, you need to register nodes:

```bash
# Rancher generates a registration command for each node role
# Run this on your control plane nodes (from Rancher UI)
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | \
  sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <your-cluster-token> \
  --etcd \
  --controlplane

# Run this on your worker nodes
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | \
  sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <your-cluster-token> \
  --worker
```

## Importing Existing Clusters

Rancher can manage any CNCF-conformant Kubernetes cluster, regardless of how it was provisioned. This includes EKS, GKE, AKS, and self-managed clusters.

### Import via Rancher UI

1. Navigate to **Cluster Management** and click **Import Existing**
2. Choose the cluster type (Generic, EKS, GKE, or AKS)
3. Enter a name for the cluster
4. Copy the generated kubectl command

### Import via kubectl Command

```bash
# Rancher generates an import manifest - apply it to your existing cluster
# This deploys the Rancher agent which connects back to Rancher server

# Option 1: Direct apply (if cluster has internet access)
kubectl apply -f https://rancher.yourdomain.com/v3/import/<cluster-token>.yaml

# Option 2: Download and apply (for air-gapped environments)
curl -fL https://rancher.yourdomain.com/v3/import/<cluster-token>.yaml -o import.yaml
kubectl apply -f import.yaml
```

### Import EKS Cluster with Full Management

```bash
# For EKS clusters, Rancher can provide full lifecycle management
# This requires AWS credentials configured in Rancher

# Create cloud credential in Rancher first, then:
cat <<EOF > eks-import.yaml
apiVersion: management.cattle.io/v3
kind: Cluster
metadata:
  name: my-eks-cluster
spec:
  eksConfig:
    # AWS region where EKS cluster exists
    region: us-west-2
    # Import existing cluster by name
    imported: true
    displayName: my-eks-cluster
    # Reference to cloud credential
    amazonCredentialSecret: cattle-global-data:cc-xxxxx
EOF

kubectl apply -f eks-import.yaml
```

### Verify Import Status

```bash
# Check cluster status in Rancher
kubectl get clusters.management.cattle.io -A

# View cluster conditions
kubectl describe cluster.management.cattle.io <cluster-name>

# Expected status after successful import:
# Conditions:
#   Type: Ready
#   Status: True
```

## Configuring Node Pools

Node pools allow you to group nodes with similar configurations and scale them independently. This is essential for managing different workload types efficiently.

### Creating Node Pool Templates

```yaml
# Define a node pool configuration for AWS
apiVersion: rke-machine-config.cattle.io/v1
kind: Amazonec2Config
metadata:
  name: worker-large-config
  namespace: fleet-default
spec:
  # AWS instance configuration
  ami: ami-0123456789abcdef0  # Amazon Linux 2 AMI
  instanceType: m5.xlarge
  region: us-west-2
  zone: a

  # Storage configuration
  rootSize: "100"           # 100 GB root volume
  volumeType: gp3

  # Networking
  vpcId: vpc-xxxxxxxx
  subnetId: subnet-xxxxxxxx
  securityGroup:
    - sg-xxxxxxxx

  # SSH access for debugging
  sshUser: ec2-user
  keypairName: rancher-nodes

  # IAM configuration for cloud provider integration
  iamInstanceProfile: rancher-node-profile

  # Tags for cost allocation and identification
  tags: "Environment=production,Team=platform,ManagedBy=rancher"
```

### Scaling Node Pools

```bash
# Scale a node pool using kubectl
# This increases the worker pool from 5 to 10 nodes
kubectl patch clusters.provisioning.cattle.io production-cluster \
  -n fleet-default \
  --type=json \
  -p='[{"op": "replace", "path": "/spec/rkeConfig/machinePools/1/quantity", "value": 10}]'

# Alternatively, use the Rancher API
curl -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 10}' \
  "https://rancher.yourdomain.com/v3/clusters/<cluster-id>/nodePools/<pool-id>"
```

### Auto-Scaling Node Pools

```yaml
# Configure cluster autoscaler for dynamic scaling
# Deploy this to your RKE2 cluster after creation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
        - name: cluster-autoscaler
          image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
          command:
            - ./cluster-autoscaler
            - --cloud-provider=rancher
            - --namespace=cattle-system
            # Minimum and maximum nodes per pool
            - --nodes=3:20:worker-pool
            # Scale down settings
            - --scale-down-delay-after-add=10m
            - --scale-down-unneeded-time=10m
          env:
            - name: RANCHER_URL
              value: "https://rancher.yourdomain.com"
            - name: RANCHER_TOKEN
              valueFrom:
                secretKeyRef:
                  name: rancher-credentials
                  key: token
```

## Creating Cluster Templates

Cluster templates (called RKE Templates in Rancher) enforce standardized configurations across all clusters in your organization. This ensures consistency and compliance.

### Define a Cluster Template

```yaml
# Create an RKE2 cluster template for production workloads
apiVersion: management.cattle.io/v3
kind: ClusterTemplate
metadata:
  name: production-standard
  namespace: cattle-global-data
spec:
  displayName: "Production Standard Template"
  description: "Standardized production cluster configuration with security hardening"

  # Template revision - allows versioning templates
  defaultRevisionId: production-standard:v1

---
apiVersion: management.cattle.io/v3
kind: ClusterTemplateRevision
metadata:
  name: production-standard-v1
  namespace: cattle-global-data
spec:
  clusterTemplateName: cattle-global-data:production-standard

  # Cluster configuration enforced by this template
  clusterConfig:
    kubernetesVersion: v1.28.5+rke2r1

    # Network configuration
    rkeConfig:
      machineGlobalConfig:
        cni: calico
        # Audit logging for compliance
        kube-apiserver-arg:
          - audit-log-path=/var/log/kubernetes/audit.log
          - audit-log-maxage=30
          - audit-log-maxbackup=10
          - audit-log-maxsize=100

      # Required machine pools - all clusters must have these
      machineSelectorConfig:
        - config:
            # Security hardening
            protect-kernel-defaults: true
            selinux: true

    # Default PSA configuration
    defaultPodSecurityAdmissionConfigurationTemplateName: rancher-restricted

  # Questions that users must answer when using this template
  questions:
    - variable: "rkeConfig.machinePools[0].quantity"
      label: "Number of Control Plane Nodes"
      description: "Must be 1, 3, or 5 for etcd quorum"
      type: enum
      default: "3"
      options:
        - "1"
        - "3"
        - "5"
      required: true

    - variable: "rkeConfig.machinePools[1].quantity"
      label: "Number of Worker Nodes"
      description: "Initial worker node count"
      type: int
      default: "3"
      min: 1
      max: 100
      required: true
```

### Using Templates to Create Clusters

```bash
# Create a cluster from a template via API
cat <<EOF > cluster-from-template.yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: team-alpha-production
  namespace: fleet-default
  annotations:
    # Reference the cluster template
    field.cattle.io/clusterTemplateRevision: "cattle-global-data:production-standard-v1"
spec:
  # Template parameters - answers to template questions
  rkeConfig:
    machinePools:
      - name: control-plane
        controlPlaneRole: true
        etcdRole: true
        quantity: 3
        machineConfigRef:
          kind: Amazonec2Config
          name: cp-config
      - name: workers
        workerRole: true
        quantity: 5
        machineConfigRef:
          kind: Amazonec2Config
          name: worker-config
EOF

kubectl apply -f cluster-from-template.yaml
```

### Enforcing Template Usage

```yaml
# Require all clusters to use approved templates
# Configure this in Rancher global settings
apiVersion: management.cattle.io/v3
kind: Setting
metadata:
  name: cluster-template-enforcement
value: "true"  # All new clusters must use a template
```

## Cloud Provider Integration

Rancher integrates with major cloud providers to provision and manage infrastructure automatically. This enables features like dynamic node provisioning, load balancer integration, and persistent volume support.

### AWS Integration

```yaml
# Create AWS cloud credential in Rancher
apiVersion: v1
kind: Secret
metadata:
  name: aws-cloud-credential
  namespace: cattle-global-data
  labels:
    cattle.io/creator: "norman"
type: Opaque
stringData:
  # AWS credentials for Rancher to provision infrastructure
  amazonec2credentialConfig-accessKey: "AKIAIOSFODNN7EXAMPLE"
  amazonec2credentialConfig-secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  amazonec2credentialConfig-defaultRegion: "us-west-2"

---
# Node template for AWS EC2 instances
apiVersion: rke-machine-config.cattle.io/v1
kind: Amazonec2Config
metadata:
  name: aws-production-nodes
  namespace: fleet-default
spec:
  ami: ""  # Leave empty to use Rancher's default AMI
  instanceType: m5.2xlarge
  region: us-west-2
  zone: a

  # VPC configuration
  vpcId: vpc-0123456789abcdef0
  subnetId: subnet-0123456789abcdef0
  securityGroup:
    - sg-0123456789abcdef0

  # Enable detailed monitoring
  monitoring: true

  # Use spot instances for cost savings (worker nodes only)
  requestSpotInstance: false
  spotPrice: "0.10"

  # EBS-optimized instances for better storage performance
  ebsOptimized: true

  # IAM role for cloud provider integration
  iamInstanceProfile: KubernetesNodeRole
```

### Azure Integration

```yaml
# Create Azure cloud credential
apiVersion: v1
kind: Secret
metadata:
  name: azure-cloud-credential
  namespace: cattle-global-data
type: Opaque
stringData:
  azurecredentialConfig-clientId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  azurecredentialConfig-clientSecret: "your-client-secret"
  azurecredentialConfig-subscriptionId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  azurecredentialConfig-tenantId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

---
# Node template for Azure VMs
apiVersion: rke-machine-config.cattle.io/v1
kind: AzureConfig
metadata:
  name: azure-production-nodes
  namespace: fleet-default
spec:
  # Azure region
  location: westus2

  # VM configuration
  size: Standard_D4s_v3
  image: canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest

  # Networking
  vnet: production-vnet
  subnet: kubernetes-subnet
  resourceGroup: kubernetes-rg

  # Storage
  storageType: Premium_LRS
  diskSize: "100"

  # Availability
  availabilitySet: kubernetes-avset
```

### Google Cloud Integration

```yaml
# Create GCP cloud credential
apiVersion: v1
kind: Secret
metadata:
  name: gcp-cloud-credential
  namespace: cattle-global-data
type: Opaque
stringData:
  googlecredentialConfig-authEncodedJson: |
    {
      "type": "service_account",
      "project_id": "your-project-id",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "rancher@your-project.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }

---
# Node template for GCP instances
apiVersion: rke-machine-config.cattle.io/v1
kind: GoogleConfig
metadata:
  name: gcp-production-nodes
  namespace: fleet-default
spec:
  # GCP project and zone
  project: your-project-id
  zone: us-central1-a

  # Machine configuration
  machineType: n2-standard-4
  diskSize: 100
  diskType: pd-ssd

  # Networking
  network: default
  subnetwork: default

  # Image
  machineImage: projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20240126

  # Preemptible for cost savings (use for non-critical workloads)
  preemptible: false
```

### Configuring In-Cluster Cloud Provider

```yaml
# Enable cloud provider integration for RKE2 clusters
# This enables LoadBalancer services and dynamic persistent volumes
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: aws-production
  namespace: fleet-default
spec:
  kubernetesVersion: v1.28.5+rke2r1
  rkeConfig:
    machineGlobalConfig:
      # Enable AWS cloud provider
      cloud-provider-name: aws

    # Cloud provider configuration
    chartValues:
      rke2-cloud-provider:
        # AWS-specific settings
        cloudControllerManager:
          enabled: true

    # Additional manifests for cloud provider
    additionalManifest: |
      apiVersion: storage.k8s.io/v1
      kind: StorageClass
      metadata:
        name: gp3
        annotations:
          storageclass.kubernetes.io/is-default-class: "true"
      provisioner: ebs.csi.aws.com
      parameters:
        type: gp3
        encrypted: "true"
      volumeBindingMode: WaitForFirstConsumer
      allowVolumeExpansion: true
```

## Best Practices Summary

Following these best practices will help you build a reliable, secure, and maintainable Rancher-managed Kubernetes infrastructure:

### Installation and Architecture

- **Deploy Rancher on a dedicated cluster** - Keep management plane separate from workloads
- **Use high availability setup** - Run 3 Rancher replicas minimum for production
- **Implement proper TLS** - Use cert-manager with Let's Encrypt or your organization's CA
- **Back up Rancher regularly** - Use Rancher's backup operator or Velero

### Cluster Provisioning

- **Use RKE2 for new clusters** - It provides better security defaults than RKE1
- **Always use odd numbers for control plane nodes** - 3 or 5 nodes ensure etcd quorum
- **Separate control plane and worker nodes** - Never run workloads on control plane nodes
- **Use cluster templates** - Enforce organizational standards consistently

### Node Management

- **Create dedicated node pools per workload type** - Separate system, application, and data workloads
- **Implement node auto-scaling** - Use cluster autoscaler for dynamic capacity
- **Use spot or preemptible instances wisely** - Only for fault-tolerant, stateless workloads
- **Label nodes consistently** - Enable proper workload scheduling

### Security

- **Enable RBAC from the start** - Use Rancher's project and namespace isolation
- **Integrate with your identity provider** - LDAP, Active Directory, or OIDC
- **Apply Pod Security Standards** - Use restricted PSA for most workloads
- **Rotate credentials regularly** - Both Rancher and cloud provider credentials

### Operations

- **Monitor cluster health** - Use Rancher's built-in monitoring or integrate with OneUptime
- **Implement GitOps workflows** - Use Fleet for declarative cluster management
- **Document your templates** - Include descriptions and validation in cluster templates
- **Test upgrades in staging** - Always validate Kubernetes version upgrades before production

---

Rancher simplifies Kubernetes cluster management at scale, but the real power comes from combining it with proper observability. Monitor your Rancher-managed clusters with [OneUptime](https://oneuptime.com) to get complete visibility into cluster health, application performance, and infrastructure costs across your entire Kubernetes estate.
