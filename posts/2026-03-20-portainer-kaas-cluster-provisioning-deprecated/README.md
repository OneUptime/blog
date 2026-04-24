# How Portainer KaaS Cluster Provisioning Worked (Deprecated in 2.30)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, KaaS, Kubernetes, Deprecated, Cloud Provisioning, History

Description: A historical overview of Portainer's Kubernetes-as-a-Service cluster provisioning feature for cloud providers, which was deprecated in Portainer 2.30.

---

Portainer Business Edition at one time offered a KaaS (Kubernetes-as-a-Service) cluster provisioning feature that allowed operators to create Kubernetes clusters on major cloud providers - including Amazon EKS, Azure AKS, and Google GKE - directly from the Portainer UI. This feature was deprecated in Portainer 2.30. Here's how it worked.

## What Was KaaS Provisioning?

The KaaS provisioning feature allowed Portainer operators to provision fully-managed Kubernetes clusters without leaving the Portainer interface. Once provisioned, the clusters were automatically registered as Kubernetes environments in Portainer, ready for application deployment.

## Supported Cloud Providers

- **Civo Kubernetes** - via API token credentials
- **Akamai Connected Cloud / Linode Kubernetes Engine (LKE)** - via API token credentials
- **DigitalOcean Kubernetes (DOKS)** - via API token credentials
- **Google GKE** - via service account key JSON
- **Amazon EKS** - via IAM access key/secret key credentials
- **Azure AKS** - via service principal credentials

## How Provisioning Worked

1. **Credentials setup** - Add cloud provider API credentials under **Settings > Shared credentials**
2. **Cluster configuration** - Select provider, region, node type, and node count
3. **Provisioning** - Portainer called the cloud provider's API to create the cluster
4. **Auto-registration** - Once the cluster was ready, it appeared as a Kubernetes environment in Portainer

The cluster creation UI collected:

```text
Provider: Amazon EKS
Region: us-east-1
Cluster Name: production-k8s
Kubernetes Version: 1.28
Node Groups:
  - Name: workers
    Instance Type: t3.medium
    Min Nodes: 2
    Max Nodes: 10
    Desired Nodes: 3
```

## Why It Was Deprecated

1. **Cloud provider API drift** - EKS, AKS, and GKE APIs evolve rapidly; keeping the Portainer provisioner current was costly
2. **Limited customization** - The Portainer UI offered a subset of cluster configuration options versus native cloud tools
3. **Better alternatives** - Terraform, Pulumi, and cloud-native CLI tools (eksctl, az aks, gcloud container) provide richer provisioning experiences
4. **Focus shift** - Portainer's strength is managing existing environments, not provisioning cloud infrastructure

## Migration Path

For teams that were using KaaS provisioning:

```bash
# Create an EKS cluster using eksctl (recommended replacement)

eksctl create cluster \
  --name production-k8s \
  --region us-east-1 \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10

# Update local kubeconfig for kubectl if needed
aws eks update-kubeconfig --name production-k8s --region us-east-1
```

For Azure AKS:

```bash
az aks create \
  --resource-group my-rg \
  --name production-k8s \
  --node-count 3 \
  --node-vm-size Standard_D2_v3 \
  --enable-managed-identity \
  --generate-ssh-keys

az aks get-credentials --resource-group my-rg --name production-k8s
```

After creating the cluster with native tools, you can still manage it through Portainer by adding it as a Kubernetes environment through a supported onboarding method such as the Edge Agent or Agent. Kubeconfig import remains available, but Portainer documents it as a legacy option with additional requirements.

## What Replaced It

Common replacements for cluster provisioning are dedicated infrastructure-as-code tools:

- **Terraform** with cloud-specific providers for repeatable, version-controlled cluster provisioning
- **Crossplane** for Kubernetes-native infrastructure management
- **Cluster API (CAPI)** for declarative Kubernetes cluster lifecycle management

Once clusters are provisioned and connected, Portainer can still manage applications running on them; only the KaaS-specific provisioning workflow is gone.

## Summary

The KaaS provisioning feature in Portainer was a convenience feature that simplified cluster creation for operators who preferred to stay within the Portainer UI. Its removal reflects a sensible product decision: focus Portainer on what it does best - managing containerized applications - and defer infrastructure provisioning to dedicated tools.
