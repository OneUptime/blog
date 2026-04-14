# How to Install Dapr on Amazon EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, EKS, AWS, Kubernetes, Installation

Description: Install Dapr on Amazon EKS using Helm with high-availability mode, and configure IAM Roles for Service Accounts for secure AWS service integration.

---

## Prerequisites

```bash
# Install AWS CLI and configure credentials
aws configure

# Install eksctl
brew install eksctl

# Install Dapr CLI
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Create an EKS Cluster

```bash
eksctl create cluster \
  --name dapr-eks \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type m5.xlarge \
  --nodes 3 \
  --with-oidc \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name dapr-eks
```

## Install Dapr with Helm

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

kubectl create namespace dapr-system

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --wait

dapr status -k
```

## Configure IRSA for Dapr Components

Use IAM Roles for Service Accounts (IRSA) so Dapr components can access AWS services:

```bash
# Create an IAM policy for SQS access
aws iam create-policy \
  --policy-name DaprSQSPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["sqs:*"],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:my-queue"
    }]
  }'

# Create IRSA service account
eksctl create iamserviceaccount \
  --name dapr-app-sa \
  --namespace default \
  --cluster dapr-eks \
  --region us-east-1 \
  --attach-policy-arn arn:aws:iam::123456789012:policy/DaprSQSPolicy \
  --approve
```

## Configure Dapr SNS/SQS Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
```

```bash
kubectl apply -f sqs-pubsub.yaml
```

## Annotate Application Deployment

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-port: "8080"
    spec:
      serviceAccountName: dapr-app-sa
```

## Summary

Dapr on Amazon EKS with Helm and HA mode is well-suited for production microservice workloads. IRSA provides keyless AWS authentication for Dapr components accessing services like SQS, SNS, and DynamoDB. Use eksctl for streamlined cluster creation with OIDC enabled from the start.
