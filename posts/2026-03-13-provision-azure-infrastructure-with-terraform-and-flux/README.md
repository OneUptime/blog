# How to Provision Azure Infrastructure with Terraform and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, Azure, GitOps, Kubernetes, Infrastructure as Code

Description: Provision Azure infrastructure using Terraform via the Tofu Controller with Flux CD for fully GitOps-managed cloud resource provisioning on Azure.

---

## Introduction

Provisioning Azure infrastructure through the Tofu Controller and Flux brings GitOps principles to Terraform on Azure. Resource groups, virtual networks, AKS clusters, and Azure SQL databases all become continuously reconciled Kubernetes resources. When infrastructure drifts from the desired state-whether from manual console changes or failed partial updates-the Tofu Controller detects and corrects the drift automatically.

The Azure Terraform provider (`hashicorp/azurerm`) is one of the most comprehensive cloud providers available, covering virtually every Azure service. This guide provisions a production-grade Azure environment including a Resource Group, Virtual Network, AKS cluster, and Azure SQL database, chaining them together using Terraform output secrets.

## Prerequisites

- Tofu Controller installed via Flux
- Azure service principal credentials configured as a Kubernetes Secret
- A Git repository with Terraform modules
- `kubectl` and `flux` CLIs installed

## Step 1: Configure Azure Credentials Secret

```bash
# Create Azure credentials secret for the Tofu Controller runner pods
kubectl create secret generic terraform-azure-credentials \
  --namespace flux-system \
  --from-literal=ARM_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --from-literal=ARM_CLIENT_SECRET="your-service-principal-secret" \
  --from-literal=ARM_SUBSCRIPTION_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --from-literal=ARM_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Step 2: Provision the Resource Group and Virtual Network

```yaml
# infrastructure/terraform/azure/01-networking.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: azure-production-networking
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/azure/networking
  workspace: azure-production-networking
  approvePlan: "manual"

  backendConfig:
    customConfiguration: |
      backend "azurerm" {
        resource_group_name  = "terraform-state-rg"
        storage_account_name = "myorgtfstate"
        container_name       = "tfstate"
        key                  = "production/azure/networking/terraform.tfstate"
      }

  runnerPodTemplate:
    spec:
      env:
        - name: ARM_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_CLIENT_ID
        - name: ARM_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_CLIENT_SECRET
        - name: ARM_SUBSCRIPTION_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_SUBSCRIPTION_ID
        - name: ARM_TENANT_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_TENANT_ID

  vars:
    - name: location
      value: "East US"
    - name: resource_group_name
      value: "production-rg"
    - name: vnet_address_space
      value: '["10.0.0.0/16"]'
    - name: aks_subnet_prefix
      value: "10.0.1.0/24"
    - name: db_subnet_prefix
      value: "10.0.2.0/24"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: azure-networking-outputs
    outputs:
      - resource_group_name
      - vnet_id
      - vnet_name
      - aks_subnet_id
      - db_subnet_id
```

## Step 3: Provision the AKS Cluster

```yaml
# infrastructure/terraform/azure/02-aks.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: azure-production-aks
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/azure/aks
  workspace: azure-production-aks
  approvePlan: "manual"
  runnerTerminationGracePeriodSeconds: 2400  # 40 minutes for AKS provisioning

  backendConfig:
    customConfiguration: |
      backend "azurerm" {
        resource_group_name  = "terraform-state-rg"
        storage_account_name = "myorgtfstate"
        container_name       = "tfstate"
        key                  = "production/azure/aks/terraform.tfstate"
      }

  runnerPodTemplate:
    spec:
      env:
        - name: ARM_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_CLIENT_ID
        - name: ARM_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_CLIENT_SECRET
        - name: ARM_SUBSCRIPTION_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_SUBSCRIPTION_ID
        - name: ARM_TENANT_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_TENANT_ID

  varsFrom:
    - kind: Secret
      name: azure-networking-outputs
      varsKeys:
        - resource_group_name
        - aks_subnet_id

  vars:
    - name: cluster_name
      value: production-aks
    - name: kubernetes_version
      value: "1.29.2"
    - name: node_vm_size
      value: Standard_D4s_v5
    - name: node_count
      value: "3"
    - name: enable_auto_scaling
      value: "true"
    - name: min_count
      value: "2"
    - name: max_count
      value: "10"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: azure-aks-outputs
    outputs:
      - cluster_name
      - kube_config_raw
      - oidc_issuer_url
      - kubelet_identity_object_id
```

## Step 4: Provision Azure SQL Database

```yaml
# infrastructure/terraform/azure/03-database.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: azure-production-database
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/azure/sql
  workspace: azure-production-database
  approvePlan: "manual"

  backendConfig:
    customConfiguration: |
      backend "azurerm" {
        resource_group_name  = "terraform-state-rg"
        storage_account_name = "myorgtfstate"
        container_name       = "tfstate"
        key                  = "production/azure/database/terraform.tfstate"
      }

  runnerPodTemplate:
    spec:
      env:
        - name: ARM_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_CLIENT_ID
        - name: ARM_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_CLIENT_SECRET
        - name: ARM_SUBSCRIPTION_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_SUBSCRIPTION_ID
        - name: ARM_TENANT_ID
          valueFrom:
            secretKeyRef:
              name: terraform-azure-credentials
              key: ARM_TENANT_ID

  varsFrom:
    - kind: Secret
      name: azure-networking-outputs
      varsKeys:
        - resource_group_name
        - db_subnet_id
    - kind: Secret
      name: terraform-production-sensitive-vars
      varsKeys:
        - sql_admin_password

  vars:
    - name: server_name
      value: production-sql-server
    - name: database_name
      value: production-appdb
    - name: sku_name
      value: GP_Gen5_4
    - name: max_size_gb
      value: "250"
    - name: zone_redundant
      value: "true"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: azure-database-outputs
    outputs:
      - server_fqdn
      - database_name
      - connection_string
```

## Step 5: Create Flux Kustomization

```yaml
# clusters/my-cluster/terraform/azure-infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: azure-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/terraform/azure
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: tofu-controller
```

## Best Practices

- Use `ARM_*` environment variables injected via `runnerPodTemplate.spec.env` for Azure provider authentication rather than passing them as Terraform variables. The Azure provider reads these environment variables automatically.
- Use the Azure `azurerm` backend for state storage when provisioning Azure resources, pointing to an Azure Storage Account in a dedicated "terraform-state" resource group that Terraform does not manage.
- Enable the AKS OIDC issuer and Workload Identity on AKS clusters. Use the `oidc_issuer_url` output to configure Kubernetes workloads with Azure AD Workload Identity, eliminating the need for service principal secrets in applications.
- Apply Azure Policy through Terraform to enforce compliance guardrails (e.g., required resource tags, allowed VM sizes, required encryption).

## Conclusion

A complete Azure infrastructure stack is now provisioned through Terraform modules managed by the Tofu Controller and Flux CD. Resource groups, virtual networks, AKS clusters, and Azure SQL databases are all defined declaratively in Git and continuously reconciled. The chain of output secrets connects dependent resources without manual coordination.
