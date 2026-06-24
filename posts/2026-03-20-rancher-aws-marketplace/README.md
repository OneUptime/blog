# How to Use Rancher with AWS Marketplace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AWS, Marketplace

Description: Learn how to deploy and manage Rancher through AWS Marketplace, including subscription activation, EKS deployment, and billing integration.

## Introduction

AWS Marketplace offers Rancher deployment options for Amazon EKS with billing consolidated on your AWS invoice. For the AWS Marketplace PAYG deployment, Rancher is installed by using the Marketplace-provided OCI Helm chart and billing components. This guide covers subscribing to Rancher on AWS Marketplace, preparing Amazon EKS, deploying the Marketplace chart, and managing the lifecycle of your Marketplace deployment.

## Prerequisites

- An AWS account with billing and AWS Marketplace access
- `aws`, `kubectl`, `helm`, and `eksctl` CLIs installed and configured
- IAM permissions for EKS, EC2, IAM, Amazon ECR, Route 53, and AWS Marketplace metering
- A public DNS name for the Rancher hostname

## Step 1: Subscribe to Rancher on AWS Marketplace

1. Navigate to the [AWS Marketplace Rancher listing](https://aws.amazon.com/marketplace/pp/prodview-f2bvszurj2p2c).
2. Click **Subscribe** and accept the terms for the offer.
3. Review the **Usage Information** in the listing, because the Marketplace repository name and chart version are provided there.
4. Complete the subscription flow for the offer before installing anything into EKS.

## Step 2: Create an EKS Cluster for Rancher

```bash
# Create a dedicated EKS cluster for Rancher management.
# Use a Kubernetes version validated for your Rancher version.
export EKS_VERSION="replace-with-supported-eks-version"

eksctl create cluster \
  --name rancher-management \
  --version "${EKS_VERSION}" \
  --region us-east-1 \
  --nodegroup-name rancher-ng \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 5 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig \
  --name rancher-management \
  --region us-east-1
```

## Step 3: Install an Ingress Controller and Configure DNS

The AWS Marketplace chart example uses an ingress class named `nginx`, so the commands below install `ingress-nginx`.

```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

kubectl wait --for=condition=Available \
  deployment/ingress-nginx-controller \
  -n ingress-nginx \
  --timeout=120s

# Get the ingress load balancer hostname
kubectl get service ingress-nginx-controller -n ingress-nginx

# Example values for Route 53
export HOSTED_ZONE_ID=Z1234567890EXAMPLE
export LOAD_BALANCER_DNS_NAME=example-1234567890.us-east-1.elb.amazonaws.com

# Once an address appears, create your DNS record pointing to it
# AWS Route 53:
aws route53 change-resource-record-sets \
  --hosted-zone-id "${HOSTED_ZONE_ID}" \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"rancher.example.com.\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"${LOAD_BALANCER_DNS_NAME}\"}]
      }
    }]
  }"
```

## Step 4: Prepare IAM for AWS Marketplace Metering

```bash
# Variables used by the Marketplace billing adapter
export CLUSTER_NAME=rancher-management
export REGION=us-east-1
export ROLE_NAME=rancher-csp-iam-role

# Confirm the cluster OIDC issuer
aws eks describe-cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --query cluster.identity.oidc.issuer \
  --output text

# Associate an IAM OIDC provider if one is not already present
eksctl utils associate-iam-oidc-provider \
  --cluster $CLUSTER_NAME \
  --region $REGION \
  --approve

# Create the IAM role used by the Marketplace billing adapter
eksctl create iamserviceaccount \
  --name rancher-csp-billing-adapter \
  --namespace cattle-csp-billing-adapter-system \
  --cluster $CLUSTER_NAME \
  --region $REGION \
  --role-name $ROLE_NAME \
  --role-only \
  --attach-policy-arn arn:aws:iam::aws:policy/AWSMarketplaceMeteringFullAccess \
  --approve
```

## Step 5: Deploy Rancher from the Marketplace

```bash
# Values from your AWS account and the AWS Marketplace listing
export HOST_NAME=rancher.example.com
export AWS_ACCOUNT_ID=123456789012
export ROLE_NAME=rancher-csp-iam-role
export BOOTSTRAP_PASSWORD="change-this-password"
export CHART_VERSION="replace-with-chart-version-from-usage-information"
export MARKETPLACE_REPOSITORY="replace-with-repository-from-usage-information"

# Log Helm into the AWS Marketplace ECR
aws --region us-east-1 ecr get-login-password \
  | helm registry login --username AWS \
    --password-stdin 709825985650.dkr.ecr.us-east-1.amazonaws.com

# Install the Marketplace chart
helm install -n cattle-rancher-csp-deployer-system rancher-cloud --create-namespace \
  oci://709825985650.dkr.ecr.us-east-1.amazonaws.com/suse/${MARKETPLACE_REPOSITORY}/rancher-cloud-helm/rancher-cloud \
  --version ${CHART_VERSION} \
  --set rancherHostname=${HOST_NAME} \
  --set rancherServerURL=https://${HOST_NAME} \
  --set rancherReplicas=3 \
  --set rancherBootstrapPassword=${BOOTSTRAP_PASSWORD} \
  --set rancherIngressClassName=nginx \
  --set global.aws.accountNumber=${AWS_ACCOUNT_ID} \
  --set global.aws.roleName=${ROLE_NAME}

# Verify the deployment
helm status rancher-cloud -n cattle-rancher-csp-deployer-system
kubectl rollout status deployment/rancher -n cattle-system --timeout=10m
```

## Step 6: Log in to Rancher

After the Helm installation completes:

1. Open `https://rancher.example.com`.
2. Log in with the bootstrap password you set during installation.
3. Continue with the normal Rancher initialization flow.

For the AWS Marketplace PAYG deployment, billing is handled by the Marketplace components deployed with the chart rather than a separate activation step in the Rancher UI.

## Step 7: Verify the Marketplace Billing Components

```bash
# Verify the Marketplace billing adapter components
kubectl get deployments -n cattle-csp-billing-adapter-system

# Verify the Rancher deployment
kubectl get deployments -n cattle-system
```

The `cattle-csp-billing-adapter-system` namespace should contain the Marketplace billing adapter and usage operator. Product information and upgrade metadata can take about an hour to appear in support configuration after installation or upgrade.

## Step 8: Scaling and Updates

```bash
# Scale the EKS node group for more Rancher capacity
eksctl scale nodegroup \
  --cluster rancher-management \
  --name rancher-ng \
  --nodes 5 \
  --wait

# Update Rancher to a new Marketplace chart version
export UPGRADED_CHART_VERSION="replace-with-new-chart-version-from-usage-information"

helm upgrade -n cattle-rancher-csp-deployer-system rancher-cloud \
  oci://709825985650.dkr.ecr.us-east-1.amazonaws.com/suse/${MARKETPLACE_REPOSITORY}/rancher-cloud-helm/rancher-cloud \
  --version "${UPGRADED_CHART_VERSION}" \
  --set rancherHostname=${HOST_NAME} \
  --set rancherServerURL=https://${HOST_NAME} \
  --set rancherReplicas=3 \
  --set rancherIngressClassName=nginx \
  --set global.aws.accountNumber=${AWS_ACCOUNT_ID} \
  --set global.aws.roleName=${ROLE_NAME}
```

## Conclusion

Deploying Rancher through AWS Marketplace simplifies procurement and billing by consolidating charges on your AWS invoice while still using Amazon EKS for the management cluster. The Marketplace OCI chart adds the billing components required for the PAYG flow, and the EKS-based deployment keeps the Rancher management plane on managed Kubernetes infrastructure. This approach is useful for teams that want AWS-native procurement and billing without giving up a standard EKS-based Rancher deployment model.
