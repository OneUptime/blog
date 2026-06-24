# How to Connect Portainer to an AWS EKS Cluster - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, AWS, EKS, Kubernetes, Cloud

Description: Connect Portainer to an Amazon EKS cluster for visual Kubernetes management using kubeconfig or the Portainer Agent.

## Introduction

Amazon EKS (Elastic Kubernetes Service) is AWS's managed Kubernetes service. Connecting it to Portainer provides a visual interface for managing EKS workloads without requiring team members to learn `kubectl` and AWS IAM. This guide covers the legacy kubeconfig import workflow and the manual agent method.

## Prerequisites

- AWS CLI installed and configured with appropriate permissions
- An existing EKS cluster
- `kubectl` installed
- Portainer running and accessible
- Portainer Business Edition if you plan to use kubeconfig import
- An EKS cluster that can provision `LoadBalancer` services if you plan to use kubeconfig import

## Step 1: Get EKS Kubeconfig

```bash
# Update kubeconfig for your EKS cluster

aws eks update-kubeconfig \
  --region us-east-1 \
  --name my-eks-cluster \
  --kubeconfig eks-portainer.kubeconfig

# Verify connectivity
kubectl --kubeconfig=eks-portainer.kubeconfig cluster-info
kubectl --kubeconfig=eks-portainer.kubeconfig get nodes
```

## Step 2: Create a Portainer Service Account in EKS

```bash
# Apply service account and RBAC
kubectl --kubeconfig=eks-portainer.kubeconfig apply -f - << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: portainer

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: portainer-sa
  namespace: portainer

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: portainer-sa-crb
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: portainer-sa
    namespace: portainer
EOF

# Create a token for the service account
kubectl --kubeconfig=eks-portainer.kubeconfig \
  create token portainer-sa -n portainer
```

## Step 3: Build Service Account Kubeconfig

```bash
# Get cluster endpoint
CLUSTER_ENDPOINT=$(aws eks describe-cluster \
  --name my-eks-cluster \
  --region us-east-1 \
  --query "cluster.endpoint" \
  --output text)

# Get cluster CA certificate
CLUSTER_CA=$(aws eks describe-cluster \
  --name my-eks-cluster \
  --region us-east-1 \
  --query "cluster.certificateAuthority.data" \
  --output text)

# Get a fresh service account token
SA_TOKEN=$(kubectl --kubeconfig=eks-portainer.kubeconfig \
  create token portainer-sa -n portainer)

# Create kubeconfig for Portainer
cat > portainer-eks.kubeconfig << EOF
apiVersion: v1
kind: Config
clusters:
- name: eks-cluster
  cluster:
    server: $CLUSTER_ENDPOINT
    certificate-authority-data: $CLUSTER_CA
users:
- name: portainer-sa
  user:
    token: $SA_TOKEN
contexts:
- name: portainer-eks
  context:
    cluster: eks-cluster
    user: portainer-sa
current-context: portainer-eks
EOF

# Verify the service account kubeconfig works
kubectl --kubeconfig=portainer-eks.kubeconfig get namespaces
```

## Step 4: Import EKS into Portainer

This import workflow is a legacy Portainer Business Edition feature. Portainer uses the kubeconfig to connect to the cluster, then deploy and configure the Portainer Agent on the cluster.

### Via UI

1. Go to **Environments** → **Add environment** → **Kubernetes** → **Start Wizard**
2. Under **More options**, select **Import**
3. Click **Select a file** and upload `portainer-eks.kubeconfig`
4. Name: "EKS US-East Production"
5. Click **Connect**

### Via API

Portainer's current official API documentation does not document a supported API workflow for importing a Kubernetes environment from a kubeconfig file. For EKS kubeconfig import, use the UI flow above.

## Method 2: Deploy Portainer Agent in EKS

For better Portainer integration, Portainer's current documentation uses a generated YAML manifest for this workflow rather than an agent-only Helm chart:

```bash
# In Portainer: Environments -> Add environment -> Kubernetes -> Start Wizard
# Under More options, select Agent and choose either:
# - Kubernetes via load balancer
# - Kubernetes via node port
#
# Copy the generated kubectl apply command from Portainer and run it
# against your EKS cluster, then verify the agent resources:
kubectl get svc,pods -n portainer --kubeconfig=eks-portainer.kubeconfig
```

Use the load balancer address on port `9001` or a node address on port `30778` when completing the environment in Portainer. Do not include a protocol prefix.

## EKS-Specific Considerations

### IAM Authentication

EKS uses AWS IAM for the kubeconfig that `aws eks update-kubeconfig` generates, but Portainer import requires a self-contained kubeconfig with embedded credentials. The standard EKS kubeconfig uses an `exec` authentication plugin (`aws eks get-token`), so generate a service-account-based kubeconfig instead. On EKS, these service account tokens are time-bound, so create the kubeconfig right before importing it into Portainer.

### Private Cluster Access

If your EKS cluster is private (API endpoint not publicly accessible):

```bash
# Option 1: Run Portainer in the same VPC
# Option 2: Use Portainer Agent (inside cluster, no direct API server access needed from Portainer)
# Option 3: Use AWS VPN or Direct Connect to access the private endpoint
```

## Conclusion

Connecting EKS to Portainer provides a visual layer over Amazon's Kubernetes management. The key EKS-specific considerations are that kubeconfig import needs a self-contained kubeconfig with cluster-admin credentials and that EKS service account tokens are time-bound. For private EKS clusters, the Portainer Agent method is the recommended approach since Portainer doesn't need direct access to the Kubernetes API server from outside the VPC.
