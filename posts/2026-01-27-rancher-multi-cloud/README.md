# How to Manage Multiple Clouds with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Multi-Cloud, Kubernetes, Cloud Management, DevOps, AWS, GCP, Azure, Hybrid Cloud

Description: A comprehensive guide to managing multiple cloud environments with Rancher, covering cluster imports, cloud credentials, unified dashboards, and cross-cloud workload deployment strategies.

---

> "The cloud is not a place, it's a way of doing computing. Multi-cloud is not multiple places, it's computing without boundaries." - Werner Vogels

## Why Multi-Cloud Management Matters

Organizations increasingly adopt multi-cloud strategies to avoid vendor lock-in, optimize costs, and improve resilience. However, managing Kubernetes clusters across AWS, GCP, Azure, and on-premises environments creates operational complexity. Rancher provides a unified control plane to manage all your clusters from a single interface.

```mermaid
flowchart TB
    subgraph Rancher["Rancher Management Server"]
        UI[Unified Dashboard]
        API[Rancher API]
        Auth[Authentication]
    end

    subgraph AWS["Amazon Web Services"]
        EKS[EKS Cluster]
        EC2[EC2 Instances]
    end

    subgraph GCP["Google Cloud Platform"]
        GKE[GKE Cluster]
        GCE[GCE Instances]
    end

    subgraph Azure["Microsoft Azure"]
        AKS[AKS Cluster]
        AVM[Azure VMs]
    end

    subgraph OnPrem["On-Premises"]
        RKE[RKE2 Cluster]
        K3S[K3s Edge Clusters]
    end

    UI --> EKS
    UI --> GKE
    UI --> AKS
    UI --> RKE
    UI --> K3S
```

## Installing Rancher

Before managing multiple clouds, you need a Rancher management server. Here is how to deploy it on Kubernetes using Helm.

```bash
# Add the Rancher Helm repository
# This provides access to Rancher charts for installation
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable

# Update your local Helm chart repository cache
helm repo update

# Create a namespace for Rancher components
kubectl create namespace cattle-system

# Install cert-manager for TLS certificate management
# Rancher requires cert-manager for automated certificate handling
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready before proceeding
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=300s

# Install Rancher with your hostname and Let's Encrypt
# Replace hostname with your actual domain
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=admin@yourdomain.com \
  --set letsEncrypt.ingress.class=nginx

# Verify the installation completed successfully
kubectl -n cattle-system rollout status deploy/rancher
```

## Configuring Cloud Credentials

Rancher needs credentials to provision and manage clusters in each cloud provider. These credentials are stored securely and used for cluster lifecycle management.

### AWS Cloud Credentials

```yaml
# aws-cloud-credential.yaml
# This credential allows Rancher to create EKS clusters and EC2 instances
apiVersion: provisioning.cattle.io/v1
kind: CloudCredential
metadata:
  name: aws-credential
  namespace: fleet-default
spec:
  # AWS credentials for programmatic access
  # Use IAM roles with least privilege principle
  amazonec2credentialConfig:
    accessKey: "AKIAIOSFODNN7EXAMPLE"      # AWS Access Key ID
    secretKey: "wJalrXUtnFEMI/K7MDENG..."  # AWS Secret Access Key
    defaultRegion: "us-west-2"              # Default region for operations
```

### GCP Cloud Credentials

```yaml
# gcp-cloud-credential.yaml
# Service account credentials for GKE cluster management
apiVersion: provisioning.cattle.io/v1
kind: CloudCredential
metadata:
  name: gcp-credential
  namespace: fleet-default
spec:
  googlecredentialConfig:
    # Service account JSON key (base64 encoded)
    # Create a service account with Kubernetes Engine Admin role
    authEncodedJson: |
      {
        "type": "service_account",
        "project_id": "my-project-id",
        "private_key_id": "key-id",
        "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
        "client_email": "rancher@my-project-id.iam.gserviceaccount.com",
        "client_id": "123456789",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
      }
```

### Azure Cloud Credentials

```yaml
# azure-cloud-credential.yaml
# Service principal credentials for AKS management
apiVersion: provisioning.cattle.io/v1
kind: CloudCredential
metadata:
  name: azure-credential
  namespace: fleet-default
spec:
  azurecredentialConfig:
    clientId: "00000000-0000-0000-0000-000000000000"      # Application (client) ID
    clientSecret: "your-client-secret"                     # Client secret value
    subscriptionId: "00000000-0000-0000-0000-000000000000" # Azure subscription
    tenantId: "00000000-0000-0000-0000-000000000000"       # Directory (tenant) ID
    environment: "AzurePublicCloud"                        # Azure environment
```

## Provisioning Clusters Across Clouds

With credentials configured, you can provision managed Kubernetes clusters in each cloud provider directly from Rancher.

### Provisioning an EKS Cluster

```yaml
# eks-cluster.yaml
# Creates a managed EKS cluster in AWS with node groups
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-aws
  namespace: fleet-default
spec:
  cloudCredentialSecretName: aws-credential
  kubernetesVersion: v1.29.0+eks.1

  # EKS-specific configuration
  eksConfig:
    region: us-west-2
    amazonCredentialSecret: aws-credential

    # VPC and networking configuration
    subnets:
      - subnet-0123456789abcdef0
      - subnet-0123456789abcdef1
    securityGroups:
      - sg-0123456789abcdef0

    # Enable private API endpoint for security
    privateAccess: true
    publicAccess: true
    publicAccessSources:
      - "10.0.0.0/8"  # Restrict public access to known CIDRs

    # Managed node groups for workloads
    nodeGroups:
      - nodegroupName: general-workers
        instanceType: m5.xlarge
        desiredSize: 3
        minSize: 2
        maxSize: 10
        diskSize: 100
        labels:
          workload-type: general

      - nodegroupName: compute-intensive
        instanceType: c5.2xlarge
        desiredSize: 2
        minSize: 0
        maxSize: 20
        labels:
          workload-type: compute
```

### Provisioning a GKE Cluster

```yaml
# gke-cluster.yaml
# Creates a managed GKE cluster in Google Cloud
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-gcp
  namespace: fleet-default
spec:
  cloudCredentialSecretName: gcp-credential
  kubernetesVersion: v1.29.0+gke.1

  gkeConfig:
    projectID: my-project-id
    region: us-central1
    googleCredentialSecret: gcp-credential

    # Use VPC-native cluster for better networking
    ipAllocationPolicy:
      clusterIpv4CidrBlock: "/16"
      servicesIpv4CidrBlock: "/22"
      useIpAliases: true

    # Enable Workload Identity for secure pod authentication
    workloadIdentityConfig:
      workloadPool: "my-project-id.svc.id.goog"

    # Node pools configuration
    nodePools:
      - name: default-pool
        initialNodeCount: 3
        minNodeCount: 2
        maxNodeCount: 10
        autoscaling: true
        config:
          machineType: e2-standard-4
          diskSizeGb: 100
          diskType: pd-ssd
          imageType: COS_CONTAINERD
          labels:
            environment: production
          oauthScopes:
            - https://www.googleapis.com/auth/cloud-platform
```

### Provisioning an AKS Cluster

```yaml
# aks-cluster.yaml
# Creates a managed AKS cluster in Azure
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: production-azure
  namespace: fleet-default
spec:
  cloudCredentialSecretName: azure-credential
  kubernetesVersion: v1.29.0

  aksConfig:
    azureCredentialSecret: azure-credential
    resourceGroup: rancher-clusters-rg
    resourceLocation: eastus
    dnsPrefix: prod-azure-aks

    # Network configuration using Azure CNI
    networkPlugin: azure
    networkPolicy: calico
    loadBalancerSku: standard

    # Enable Azure AD integration for RBAC
    aadProfile:
      managed: true
      enableAzureRbac: true

    # Node pools
    nodePools:
      - name: systempool
        mode: System
        count: 3
        minCount: 2
        maxCount: 5
        vmSize: Standard_D4s_v3
        osDiskSizeGb: 128
        enableAutoScaling: true

      - name: workerpool
        mode: User
        count: 3
        minCount: 0
        maxCount: 20
        vmSize: Standard_D8s_v3
        osDiskSizeGb: 256
        enableAutoScaling: true
        nodeLabels:
          workload: applications
```

## Importing Existing Clusters

You can also import existing Kubernetes clusters into Rancher for unified management without reprovisioning them.

```bash
# Generate the import command from Rancher UI or API
# This command is retrieved from Rancher -> Cluster Management -> Import Existing

# On your existing cluster, apply the import manifest
# This installs the Rancher agent that connects back to the management server
kubectl apply -f https://rancher.yourdomain.com/v3/import/abc123.yaml

# For clusters behind a firewall, use the insecure option during initial setup
# Then configure proper TLS verification afterward
curl --insecure -sfL https://rancher.yourdomain.com/v3/import/abc123.yaml | kubectl apply -f -

# Verify the agent is running and connected
kubectl get pods -n cattle-system
kubectl get nodes
```

## Unified Dashboard and Management

Rancher provides a single pane of glass to manage all your clusters regardless of where they run.

```mermaid
flowchart LR
    subgraph Dashboard["Rancher Dashboard"]
        Overview[Cluster Overview]
        Workloads[Workload Management]
        Storage[Storage Classes]
        Network[Network Policies]
        RBAC[User & RBAC]
        Apps[App Catalog]
    end

    subgraph Clusters["Managed Clusters"]
        C1[AWS EKS]
        C2[GCP GKE]
        C3[Azure AKS]
        C4[On-Prem RKE2]
    end

    Overview --> C1
    Overview --> C2
    Overview --> C3
    Overview --> C4

    Workloads --> C1
    Workloads --> C2
    Workloads --> C3
    Workloads --> C4
```

### Cluster Roles and RBAC

Configure consistent access control across all clusters.

```yaml
# global-role-binding.yaml
# Grant users consistent permissions across all clusters
apiVersion: management.cattle.io/v3
kind: GlobalRoleBinding
metadata:
  name: platform-admin-binding
globalRoleName: admin
userName: platform-admin@company.com
---
# Cluster-specific role for development teams
apiVersion: management.cattle.io/v3
kind: ClusterRoleTemplateBinding
metadata:
  name: dev-team-aws-binding
  namespace: c-m-abc123  # Cluster ID
clusterName: c-m-abc123
roleTemplateName: cluster-member
userPrincipalName: local://dev-team-lead
---
# Project role for application teams
apiVersion: management.cattle.io/v3
kind: ProjectRoleTemplateBinding
metadata:
  name: app-team-project-binding
  namespace: p-xyz789  # Project ID
projectName: c-m-abc123:p-xyz789
roleTemplateName: project-owner
groupPrincipalName: local://app-team
```

## Cross-Cloud Workload Deployment with Fleet

Fleet is Rancher's GitOps engine that enables deploying workloads across multiple clusters from a single Git repository.

```mermaid
flowchart TB
    subgraph Git["Git Repository"]
        Manifests[Kubernetes Manifests]
        Helm[Helm Charts]
        Kustomize[Kustomize Overlays]
    end

    subgraph Fleet["Fleet Controller"]
        GitRepo[GitRepo Resource]
        Bundle[Bundles]
        Targets[Cluster Targets]
    end

    subgraph Clusters["Target Clusters"]
        AWS[AWS Cluster]
        GCP[GCP Cluster]
        Azure[Azure Cluster]
    end

    Manifests --> GitRepo
    Helm --> GitRepo
    Kustomize --> GitRepo

    GitRepo --> Bundle
    Bundle --> Targets

    Targets --> AWS
    Targets --> GCP
    Targets --> Azure
```

### Fleet GitRepo Configuration

```yaml
# fleet-gitrepo.yaml
# Defines the Git repository source for Fleet deployments
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: multi-cloud-apps
  namespace: fleet-default
spec:
  # Git repository containing your Kubernetes manifests
  repo: https://github.com/myorg/kubernetes-apps
  branch: main

  # Path to the fleet.yaml that defines deployment targets
  paths:
    - /apps/production
    - /apps/shared-services

  # Poll interval for changes (or use webhooks)
  pollingInterval: 30s

  # Target clusters by labels
  targets:
    - name: all-production
      clusterSelector:
        matchLabels:
          environment: production

    - name: aws-only
      clusterSelector:
        matchLabels:
          cloud: aws
          environment: production

    - name: edge-clusters
      clusterSelector:
        matchLabels:
          tier: edge
```

### Fleet Bundle for Cross-Cloud Deployment

```yaml
# fleet.yaml (in your Git repo)
# Defines how applications are deployed to different cluster groups
defaultNamespace: production

# Helm values overrides per cluster group
helm:
  releaseName: myapp
  chart: ./charts/myapp

  # Default values for all clusters
  values:
    replicaCount: 3
    image:
      repository: myorg/myapp
      tag: v1.2.0

# Target-specific overrides
targetCustomizations:
  # AWS-specific configuration
  - name: aws-clusters
    clusterSelector:
      matchLabels:
        cloud: aws
    helm:
      values:
        # Use AWS-specific storage class
        persistence:
          storageClass: gp3
        # AWS load balancer annotations
        service:
          annotations:
            service.beta.kubernetes.io/aws-load-balancer-type: nlb
            service.beta.kubernetes.io/aws-load-balancer-scheme: internal

  # GCP-specific configuration
  - name: gcp-clusters
    clusterSelector:
      matchLabels:
        cloud: gcp
    helm:
      values:
        persistence:
          storageClass: premium-rwo
        service:
          annotations:
            cloud.google.com/load-balancer-type: Internal

  # Azure-specific configuration
  - name: azure-clusters
    clusterSelector:
      matchLabels:
        cloud: azure
    helm:
      values:
        persistence:
          storageClass: managed-premium
        service:
          annotations:
            service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

## Multi-Cloud Networking

Enable cross-cloud communication between clusters using Submariner or service mesh.

```yaml
# submariner-broker.yaml
# Deploy Submariner broker for cross-cluster networking
apiVersion: submariner.io/v1alpha1
kind: Broker
metadata:
  name: submariner-broker
  namespace: submariner-broker
spec:
  # Enable service discovery across clusters
  globalnetEnabled: true
  globalnetCIDRRange: 242.0.0.0/8
  defaultGlobalnetClusterSize: 65536
---
# Join each cluster to the Submariner broker
apiVersion: submariner.io/v1alpha1
kind: Submariner
metadata:
  name: submariner
  namespace: submariner-operator
spec:
  broker: k8s
  brokerK8sApiServer: https://broker.example.com:6443
  brokerK8sApiServerToken: "token"
  brokerK8sRemoteNamespace: submariner-broker

  # Cluster identification
  clusterID: aws-production

  # Network configuration
  serviceCIDR: 10.96.0.0/12
  clusterCIDR: 10.244.0.0/16

  # Gateway configuration
  natEnabled: true
  cableDriver: libreswan
```

### Cross-Cloud Service Export

```yaml
# service-export.yaml
# Export a service for discovery in other clusters
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: api-service
  namespace: production
---
# The service being exported
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  selector:
    app: api
  ports:
    - port: 8080
      targetPort: 8080
```

```yaml
# service-import.yaml
# Import the service in consuming clusters
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceImport
metadata:
  name: api-service
  namespace: production
spec:
  type: ClusterSetIP
  ports:
    - port: 8080
      protocol: TCP
```

## Monitoring Multi-Cloud Clusters

Deploy consistent monitoring across all clusters using Rancher's monitoring stack.

```yaml
# monitoring-config.yaml
# Enable Rancher Monitoring on each cluster
apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: rancher-charts
spec:
  gitRepo: https://git.rancher.io/charts
  gitBranch: release-v2.8
---
# Install monitoring stack
apiVersion: catalog.cattle.io/v1
kind: App
metadata:
  name: rancher-monitoring
  namespace: cattle-monitoring-system
spec:
  chart:
    metadata:
      name: rancher-monitoring
    spec:
      chart: rancher-monitoring
      sourceRef:
        kind: ClusterRepo
        name: rancher-charts
  values:
    prometheus:
      prometheusSpec:
        # Retain metrics for 30 days
        retention: 30d
        # Storage configuration
        storageSpec:
          volumeClaimTemplate:
            spec:
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 100Gi

        # External labels for cross-cluster identification
        externalLabels:
          cluster: "{{ .ClusterName }}"
          cloud: "{{ .ClusterLabels.cloud }}"

    grafana:
      persistence:
        enabled: true
        size: 10Gi
```

### Federated Prometheus for Multi-Cloud

```yaml
# prometheus-federation.yaml
# Central Prometheus that federates metrics from all clusters
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: central-prometheus
  namespace: monitoring
spec:
  replicas: 2
  retention: 90d

  # Scrape from each cluster's Prometheus
  additionalScrapeConfigs:
    name: federation-config
    key: prometheus-federation.yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: federation-config
  namespace: monitoring
stringData:
  prometheus-federation.yaml: |
    # Federate from AWS cluster
    - job_name: 'federate-aws'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{job=~".+"}'
      static_configs:
        - targets:
            - prometheus.aws-cluster.example.com:9090
          labels:
            federated_cluster: aws-production

    # Federate from GCP cluster
    - job_name: 'federate-gcp'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{job=~".+"}'
      static_configs:
        - targets:
            - prometheus.gcp-cluster.example.com:9090
          labels:
            federated_cluster: gcp-production

    # Federate from Azure cluster
    - job_name: 'federate-azure'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{job=~".+"}'
      static_configs:
        - targets:
            - prometheus.azure-cluster.example.com:9090
          labels:
            federated_cluster: azure-production
```

## Disaster Recovery Across Clouds

Implement backup and restore strategies for multi-cloud resilience.

```yaml
# backup-schedule.yaml
# Velero backup schedule for cross-cloud DR
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    # Include critical namespaces
    includedNamespaces:
      - production
      - staging

    # Exclude system namespaces
    excludedNamespaces:
      - kube-system
      - cattle-system

    # Storage location (S3-compatible)
    storageLocation: default

    # Snapshot volumes
    snapshotVolumes: true

    # Retain backups for 30 days
    ttl: 720h

    # Label selector for specific resources
    labelSelector:
      matchLabels:
        backup: enabled
---
# Backup storage location for cross-cloud access
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: multi-cloud-backups
    prefix: rancher-clusters
  config:
    region: us-west-2
    # Cross-cloud accessible S3-compatible storage
    s3ForcePathStyle: "true"
```

## Best Practices for Multi-Cloud Management

```mermaid
flowchart TB
    subgraph Practices["Multi-Cloud Best Practices"]
        Consistency[Consistent Configuration]
        GitOps[GitOps Workflows]
        Security[Unified Security Policies]
        Observability[Centralized Observability]
        Automation[Automated Operations]
    end

    subgraph Implementation["Implementation"]
        I1[Use Fleet for deployments]
        I2[Standardize on Kubernetes versions]
        I3[Implement OPA/Gatekeeper]
        I4[Deploy OneUptime monitoring]
        I5[Automate cluster lifecycle]
    end

    Consistency --> I1
    Consistency --> I2
    GitOps --> I1
    Security --> I3
    Observability --> I4
    Automation --> I5
```

### Key Recommendations

1. **Standardize Kubernetes Versions** - Keep all clusters within one minor version to ensure compatibility
2. **Use GitOps** - Deploy workloads through Fleet to maintain consistency and auditability
3. **Centralize Authentication** - Configure SAML/OIDC through Rancher for unified identity management
4. **Implement Policy Enforcement** - Use OPA Gatekeeper across all clusters for consistent security policies
5. **Monitor Everything** - Deploy unified observability with tools like [OneUptime](https://oneuptime.com) for cross-cloud visibility
6. **Automate Backups** - Implement Velero with cross-cloud storage for disaster recovery
7. **Plan for Failure** - Test failover procedures regularly between clouds

## Conclusion

Managing multiple clouds with Rancher transforms operational complexity into streamlined simplicity. By centralizing cluster management, implementing GitOps with Fleet, and maintaining consistent policies across AWS, GCP, Azure, and on-premises environments, you achieve true multi-cloud agility without sacrificing control.

For comprehensive monitoring of your multi-cloud Kubernetes infrastructure, consider [OneUptime](https://oneuptime.com) - an open-source observability platform that provides unified visibility across all your clusters, regardless of where they run.

---

Start small by importing your existing clusters into Rancher, then gradually adopt Fleet for cross-cloud deployments. The journey to effective multi-cloud management is iterative - focus on consistency and automation from day one.
