# How to Set Up Cross-Cloud Kubernetes Clusters with Anthos Multi-Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Google Cloud, Anthos, Multi-Cloud

Description: Learn how to set up and manage Kubernetes clusters across AWS and Azure using Google Anthos Multi-Cloud for unified control plane management.

---

Running Kubernetes clusters across multiple cloud providers creates flexibility and prevents vendor lock-in, but managing separate control planes is complex. Google Anthos Multi-Cloud solves this problem by providing a unified management layer for Kubernetes clusters running on AWS and Azure, all controlled from Google Cloud.

This guide walks you through setting up cross-cloud Kubernetes clusters using Anthos Multi-Cloud, giving you consistent operations across different cloud providers.

## Understanding Anthos Multi-Cloud Architecture

Anthos Multi-Cloud extends Google Kubernetes Engine (GKE) management to AWS and Azure. The architecture consists of three key components:

**Control Plane** - Runs in your AWS or Azure account but is managed by Google Cloud. This provides the Kubernetes API server, etcd, and other control plane components.

**Node Pools** - Worker nodes that run your workloads in your cloud provider account. You control the instance types, scaling, and networking.

**Hub Registration** - Connects clusters to Google Cloud for centralized management through Anthos, enabling features like Config Management and Service Mesh.

The control plane runs in your account for data sovereignty while Google manages the lifecycle, updates, and security patches.

## Prerequisites for Anthos Multi-Cloud

Before setting up Anthos Multi-Cloud clusters, you need:

```bash
# Install the gcloud CLI with Anthos components
gcloud components install kubectl gke-gcloud-auth-plugin

# Enable required APIs
gcloud services enable \
  gkemulticloud.googleapis.com \
  gkeconnect.googleapis.com \
  connectgateway.googleapis.com \
  cloudresourcemanager.googleapis.com

# Set your project
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
```

You also need an AWS or Azure account with appropriate permissions. For AWS, you need an IAM role that Anthos can assume. For Azure, you need a service principal.

## Setting Up Anthos Multi-Cloud on AWS

Create an AWS cluster using the gcloud CLI. First, create an AWS IAM role for Anthos:

```json
// aws-anthos-trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "accounts.google.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "accounts.google.com:sub": "service-PROJECT_NUMBER@gcp-sa-gkemulticloud.iam.gserviceaccount.com"
        }
      }
    }
  ]
}
```

Create the IAM role:

```bash
# Create the role
aws iam create-role \
  --role-name anthos-multi-cloud-role \
  --assume-role-policy-document file://aws-anthos-trust-policy.json

# Attach required policies
aws iam attach-role-policy \
  --role-name anthos-multi-cloud-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

aws iam attach-role-policy \
  --role-name anthos-multi-cloud-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonVPCFullAccess
```

Now create the Anthos cluster on AWS:

```bash
# Define cluster variables
export CLUSTER_NAME="anthos-aws-cluster"
export AWS_REGION="us-east-1"
export VPC_ID="vpc-xxxxx"
export SUBNET_IDS="subnet-xxxx,subnet-yyyy,subnet-zzzz"
export ROLE_ARN="arn:aws:iam::ACCOUNT_ID:role/anthos-multi-cloud-role"

# Create the cluster
gcloud container aws clusters create $CLUSTER_NAME \
  --location=us-west1 \
  --aws-region=$AWS_REGION \
  --cluster-version=1.29.0-gke.1 \
  --vpc-id=$VPC_ID \
  --subnet-ids=$SUBNET_IDS \
  --role-arn=$ROLE_ARN \
  --pod-address-cidr-blocks=10.244.0.0/16 \
  --service-address-cidr-blocks=10.96.0.0/16
```

The `--location` flag specifies where the cluster metadata is stored in Google Cloud, while `--aws-region` specifies where AWS resources are created.

Create a node pool for the cluster:

```bash
gcloud container aws node-pools create default-pool \
  --cluster=$CLUSTER_NAME \
  --location=us-west1 \
  --node-version=1.29.0-gke.1 \
  --min-nodes=1 \
  --max-nodes=5 \
  --instance-type=t3.medium \
  --root-volume-size=50 \
  --subnet-id=subnet-xxxx \
  --iam-instance-profile=arn:aws:iam::ACCOUNT_ID:instance-profile/anthos-node-profile
```

## Setting Up Anthos Multi-Cloud on Azure

For Azure, create a service principal that Anthos can use:

```bash
# Create Azure service principal
az ad sp create-for-rbac \
  --name anthos-multi-cloud-sp \
  --role Contributor \
  --scopes /subscriptions/SUBSCRIPTION_ID

# Note the appId, password, and tenant values
```

Create the Anthos cluster on Azure:

```bash
export CLUSTER_NAME="anthos-azure-cluster"
export AZURE_REGION="eastus"
export VNET_ID="/subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.Network/virtualNetworks/vnet"
export SUBNET_ID="/subscriptions/SUB_ID/resourceGroups/RG/providers/Microsoft.Network/virtualNetworks/vnet/subnets/default"

# Create Azure cluster
gcloud container azure clusters create $CLUSTER_NAME \
  --location=us-west1 \
  --azure-region=$AZURE_REGION \
  --cluster-version=1.29.0-gke.1 \
  --vnet-id=$VNET_ID \
  --pod-address-cidr-blocks=10.244.0.0/16 \
  --service-address-cidr-blocks=10.96.0.0/16 \
  --client-id=APP_ID \
  --tenant-id=TENANT_ID \
  --resource-group-id=/subscriptions/SUB_ID/resourceGroups/anthos-rg

# Create node pool
gcloud container azure node-pools create default-pool \
  --cluster=$CLUSTER_NAME \
  --location=us-west1 \
  --node-version=1.29.0-gke.1 \
  --min-nodes=1 \
  --max-nodes=5 \
  --vm-size=Standard_D2s_v3 \
  --subnet-id=$SUBNET_ID
```

## Accessing Your Cross-Cloud Clusters

Get credentials for your AWS cluster:

```bash
# Get kubeconfig for AWS cluster
gcloud container aws clusters get-credentials $CLUSTER_NAME \
  --location=us-west1

# Verify access
kubectl get nodes
```

For Azure clusters:

```bash
# Get kubeconfig for Azure cluster
gcloud container azure clusters get-credentials $CLUSTER_NAME \
  --location=us-west1

# Verify access
kubectl get nodes
```

## Managing Multiple Clusters with Anthos Config Management

Deploy consistent policies across all clusters using Anthos Config Management:

```yaml
# config-management.yaml
apiVersion: configmanagement.gke.io/v1
kind: ConfigManagement
metadata:
  name: config-management
spec:
  clusterName: anthos-aws-cluster
  git:
    syncRepo: https://github.com/your-org/anthos-config
    syncBranch: main
    secretType: none
    policyDir: "configs"
  sourceFormat: unstructured
```

Apply to all clusters:

```bash
# Apply to AWS cluster
kubectl --context=anthos-aws-cluster apply -f config-management.yaml

# Apply to Azure cluster
kubectl --context=anthos-azure-cluster apply -f config-management.yaml
```

## Setting Up Cross-Cluster Service Mesh

Enable Anthos Service Mesh across clouds:

```bash
# Enable mesh for AWS cluster
gcloud container hub mesh enable \
  --project=$PROJECT_ID

# Update cluster
gcloud container hub memberships update anthos-aws-cluster \
  --location=us-west1 \
  --update-labels=mesh=enabled
```

Install the service mesh control plane:

```bash
# Install Anthos Service Mesh
asmcli install \
  --project_id $PROJECT_ID \
  --cluster_name anthos-aws-cluster \
  --cluster_location us-west1 \
  --fleet_id $PROJECT_ID \
  --output_dir ./asm-output \
  --enable_all \
  --ca mesh_ca
```

## Monitoring and Cost Management

View all clusters in the Google Cloud Console under Anthos. Each cluster reports metrics, costs, and status regardless of where it runs.

Set up budget alerts:

```bash
# Create budget for all Anthos resources
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Anthos Multi-Cloud Budget" \
  --budget-amount=5000USD \
  --threshold-rule=percent=80 \
  --threshold-rule=percent=100
```

Monitor cluster health:

```bash
# Get cluster status
gcloud container aws clusters describe $CLUSTER_NAME \
  --location=us-west1

# View node pool status
gcloud container aws node-pools list \
  --cluster=$CLUSTER_NAME \
  --location=us-west1
```

## Upgrading Cross-Cloud Clusters

Anthos manages cluster upgrades centrally:

```bash
# List available versions
gcloud container get-server-config \
  --location=us-west1 \
  --format="yaml(validMasterVersions)"

# Upgrade AWS cluster
gcloud container aws clusters update $CLUSTER_NAME \
  --location=us-west1 \
  --cluster-version=1.30.0-gke.1

# Upgrade node pool
gcloud container aws node-pools update default-pool \
  --cluster=$CLUSTER_NAME \
  --location=us-west1 \
  --node-version=1.30.0-gke.1
```

Google handles the upgrade process, ensuring control plane compatibility and minimizing disruption.

## Conclusion

Anthos Multi-Cloud provides a powerful solution for running Kubernetes across AWS and Azure with unified management from Google Cloud. You get consistent operations, centralized policy management, and cross-cloud service mesh capabilities while maintaining data sovereignty in each cloud provider.

The key benefits are reduced operational complexity, consistent tooling across clouds, and the ability to migrate workloads between providers without changing your management approach. This makes multi-cloud Kubernetes practical for organizations that need flexibility without sacrificing control.
