# How to Configure Crossplane Managed Resources for Azure Storage Account Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Azure, Kubernetes, Infrastructure as Code, Storage, Cloud Native, GitOps

Description: Learn how to use Crossplane managed resources to provision and manage Azure Storage Accounts directly from your Kubernetes cluster.

---

Crossplane takes a different approach to infrastructure provisioning compared to tools like Terraform and Bicep. Instead of running a CLI tool or CI/CD pipeline to apply changes, Crossplane runs as a set of controllers inside your Kubernetes cluster. You define your infrastructure as Kubernetes custom resources, and Crossplane reconciles them against the actual cloud state continuously. This makes it a natural fit for teams that are already deep into Kubernetes and want to manage cloud resources the same way they manage workloads.

In this post, we will walk through provisioning an Azure Storage Account using Crossplane managed resources, covering everything from provider setup to creating composite resources for your team.

## Why Crossplane for Azure Resources

Before diving into the configuration, it is worth understanding when Crossplane makes sense. If your team already uses Kubernetes heavily and you want a single control plane for both workloads and infrastructure, Crossplane is compelling. It provides:

- Continuous reconciliation. If someone modifies a resource in the Azure portal, Crossplane will detect the drift and correct it.
- Kubernetes-native workflow. Use kubectl, GitOps tools like ArgoCD, and standard RBAC to manage cloud resources.
- Composability. Build higher-level abstractions using Composite Resources that hide cloud-specific details from application teams.

The tradeoff is complexity. You need a running Kubernetes cluster and the Crossplane controllers, which adds operational overhead compared to running `terraform apply` from a pipeline.

## Setting Up the Azure Provider

Crossplane uses providers to interact with cloud APIs. For Azure, you install the Upbound Azure provider (the official Crossplane provider for Azure).

First, install Crossplane itself into your Kubernetes cluster.

```bash
# Add the Crossplane Helm repository
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Install Crossplane into the crossplane-system namespace
helm install crossplane \
  crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --wait
```

Next, install the Azure provider. The following Kubernetes manifest tells Crossplane to download and install the Azure Storage provider.

```yaml
# azure-provider.yaml - Install the Upbound Azure Storage provider
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-azure-storage
spec:
  package: xpkg.upbound.io/upbound/provider-azure-storage:v1.0.0
  # Automatically create a ProviderConfig named "default"
  runtimeConfigRef:
    name: default
```

Apply it with kubectl.

```bash
# Install the Azure Storage provider
kubectl apply -f azure-provider.yaml

# Wait for the provider to become healthy
kubectl wait provider provider-azure-storage \
  --for=condition=Healthy \
  --timeout=300s
```

## Configuring Azure Credentials

Crossplane needs credentials to manage Azure resources. The recommended approach is using a Service Principal or Workload Identity. Here is how to set it up with a Service Principal.

```bash
# Create a service principal for Crossplane
az ad sp create-for-rbac \
  --name "crossplane-azure-provider" \
  --role Contributor \
  --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID> \
  --output json > azure-credentials.json
```

Create a Kubernetes secret from the credentials file and then a ProviderConfig that references it.

```yaml
# provider-config.yaml - Configure Azure credentials for Crossplane
apiVersion: v1
kind: Secret
metadata:
  name: azure-provider-creds
  namespace: crossplane-system
type: Opaque
stringData:
  credentials: |
    {
      "clientId": "<APP_ID>",
      "clientSecret": "<PASSWORD>",
      "subscriptionId": "<SUBSCRIPTION_ID>",
      "tenantId": "<TENANT_ID>"
    }
---
apiVersion: azure.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      name: azure-provider-creds
      namespace: crossplane-system
      key: credentials
```

## Creating a Resource Group

Before creating the storage account, you need a resource group. In Crossplane, this is just another managed resource.

```yaml
# resource-group.yaml - Azure Resource Group managed by Crossplane
apiVersion: azure.upbound.io/v1beta1
kind: ResourceGroup
metadata:
  name: rg-crossplane-storage
  # Annotations for tracking and organization
  annotations:
    crossplane.io/external-name: rg-crossplane-storage
spec:
  forProvider:
    location: "East US 2"
    tags:
      ManagedBy: crossplane
      Environment: production
  # Reference the default provider configuration
  providerConfigRef:
    name: default
```

## Provisioning the Storage Account

Now for the main event. The storage account managed resource maps closely to the Azure Resource Manager API for storage accounts. Every property you would set in an ARM template or Terraform has a corresponding field in the Crossplane spec.

```yaml
# storage-account.yaml - Azure Storage Account managed by Crossplane
apiVersion: storage.azure.upbound.io/v1beta2
kind: Account
metadata:
  name: stcrossplanedemo2026
  annotations:
    # The actual Azure resource name
    crossplane.io/external-name: stcrossplanedemo2026
spec:
  forProvider:
    # Reference the resource group by name
    resourceGroupNameRef:
      name: rg-crossplane-storage

    location: "East US 2"
    accountTier: Standard
    accountReplicationType: GRS     # Geo-redundant storage for production
    accountKind: StorageV2

    # Security configuration
    minTlsVersion: TLS1_2
    allowNestedItemsToBePublic: false
    enableHttpsTrafficOnly: true

    # Network rules - default deny with exceptions
    networkRules:
      - defaultAction: Deny
        bypass:
          - AzureServices       # Allow Azure services to access
        ipRules:
          - "203.0.113.0/24"   # Office IP range

    # Blob properties
    blobProperties:
      - deleteRetentionPolicy:
          - days: 30            # Keep deleted blobs for 30 days
        containerDeleteRetentionPolicy:
          - days: 14
        versioningEnabled: true

    # Identity for accessing other Azure services
    identity:
      - type: SystemAssigned

    tags:
      ManagedBy: crossplane
      Environment: production
      CostCenter: engineering

  # Write the connection details to a Kubernetes secret
  writeConnectionSecretToRef:
    name: storage-account-connection
    namespace: default

  providerConfigRef:
    name: default
```

Apply both resources.

```bash
# Apply the resource group and storage account
kubectl apply -f resource-group.yaml
kubectl apply -f storage-account.yaml

# Watch the resources being provisioned
kubectl get managed -w
```

The `-w` flag watches for changes. You will see the resources transition through states like `Creating` before settling on `True` for the `Ready` condition.

## Adding Blob Containers

Storage accounts are not very useful without containers. You can create blob containers as separate managed resources that reference the storage account.

```yaml
# blob-containers.yaml - Create containers in the storage account
apiVersion: storage.azure.upbound.io/v1beta1
kind: Container
metadata:
  name: raw-data
spec:
  forProvider:
    storageAccountNameRef:
      name: stcrossplanedemo2026
    containerAccessType: private   # No anonymous access
  providerConfigRef:
    name: default
---
apiVersion: storage.azure.upbound.io/v1beta1
kind: Container
metadata:
  name: processed-data
spec:
  forProvider:
    storageAccountNameRef:
      name: stcrossplanedemo2026
    containerAccessType: private
  providerConfigRef:
    name: default
---
apiVersion: storage.azure.upbound.io/v1beta1
kind: Container
metadata:
  name: archive
spec:
  forProvider:
    storageAccountNameRef:
      name: stcrossplanedemo2026
    containerAccessType: private
  providerConfigRef:
    name: default
```

## Building a Composite Resource

The real power of Crossplane shows up when you create Composite Resources (XRs). These let you define a higher-level abstraction that bundles multiple resources together. Application teams request a "storage bucket" without needing to know the Azure-specific details.

First, define the CompositeResourceDefinition (XRD) - this is like a schema for your custom resource.

```yaml
# xrd-storage.yaml - Define the StorageBucket composite resource schema
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xstoragebuckets.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XStorageBucket
    plural: xstoragebuckets
  claimNames:
    kind: StorageBucket
    plural: storagebuckets
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                # Simple parameters for the application team
                location:
                  type: string
                  default: "East US 2"
                environment:
                  type: string
                  enum: ["dev", "staging", "production"]
                containers:
                  type: array
                  items:
                    type: string
                  description: "List of blob container names to create"
              required:
                - environment
```

Then create the Composition that maps these simple parameters to actual Azure resources.

```yaml
# composition-storage.yaml - Map StorageBucket claims to Azure resources
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: azure-storage-bucket
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XStorageBucket
  resources:
    # Resource Group
    - name: resource-group
      base:
        apiVersion: azure.upbound.io/v1beta1
        kind: ResourceGroup
        spec:
          forProvider:
            location: "East US 2"
          providerConfigRef:
            name: default
      patches:
        - fromFieldPath: spec.location
          toFieldPath: spec.forProvider.location

    # Storage Account
    - name: storage-account
      base:
        apiVersion: storage.azure.upbound.io/v1beta2
        kind: Account
        spec:
          forProvider:
            accountTier: Standard
            accountReplicationType: LRS
            accountKind: StorageV2
            minTlsVersion: TLS1_2
            enableHttpsTrafficOnly: true
          providerConfigRef:
            name: default
      patches:
        - fromFieldPath: spec.location
          toFieldPath: spec.forProvider.location
        # Use GRS for production, LRS for everything else
        - type: FromCompositeFieldPath
          fromFieldPath: spec.environment
          toFieldPath: spec.forProvider.accountReplicationType
          transforms:
            - type: map
              map:
                dev: LRS
                staging: ZRS
                production: GRS
```

Now application teams can request storage with a simple claim.

```yaml
# my-app-storage.yaml - A team requests storage for their application
apiVersion: platform.example.com/v1alpha1
kind: StorageBucket
metadata:
  name: my-app-data
  namespace: my-app-team
spec:
  environment: production
  location: "East US 2"
  containers:
    - uploads
    - exports
    - backups
```

## Checking Resource Status

Crossplane managed resources have conditions that tell you what is happening. Here are the key commands for troubleshooting.

```bash
# List all managed Azure resources
kubectl get managed

# Get detailed status of the storage account
kubectl describe account stcrossplanedemo2026

# Check events for troubleshooting
kubectl get events --field-selector involvedObject.name=stcrossplanedemo2026

# View the connection secret that was created
kubectl get secret storage-account-connection -o yaml
```

## Drift Detection in Action

One of Crossplane's standout features is continuous reconciliation. If someone changes the storage account in the Azure portal - say, disabling HTTPS-only traffic - Crossplane will detect the drift within its polling interval (default: 10 minutes for most providers) and revert the change.

You can verify this by manually modifying a property in the Azure portal and watching Crossplane fix it.

```bash
# Watch the storage account for changes
kubectl get account stcrossplanedemo2026 -w
```

## Wrapping Up

Crossplane managed resources provide a Kubernetes-native way to provision and manage Azure Storage Accounts. The setup requires more initial investment than Terraform - you need a running cluster, the Crossplane controllers, and provider packages. But the payoff is continuous reconciliation, Kubernetes-native access control, and the ability to build platform abstractions using Composite Resources. For teams that are already running Kubernetes and want to extend the same operational model to their cloud infrastructure, Crossplane is a strong choice.
