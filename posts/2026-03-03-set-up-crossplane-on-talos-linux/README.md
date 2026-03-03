# How to Set Up Crossplane on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Crossplane, Kubernetes, Infrastructure as Code, Cloud Management

Description: A complete guide to installing and configuring Crossplane on Talos Linux for managing cloud infrastructure directly from your Kubernetes cluster.

---

Crossplane turns your Kubernetes cluster into a universal control plane for cloud infrastructure. Instead of writing Terraform or CloudFormation templates, you define cloud resources as Kubernetes custom resources. When you run Crossplane on Talos Linux, you get an immutable, API-driven operating system managing an infrastructure control plane that can provision resources across AWS, Azure, GCP, and dozens of other providers.

This guide covers everything from installing Crossplane on Talos Linux to provisioning your first cloud resource.

## What Makes Crossplane and Talos Linux a Good Combination

Talos Linux strips away everything unnecessary from the operating system. There is no shell, no SSH, and no way to manually configure the node. Everything goes through the Kubernetes API. Crossplane follows the same philosophy for cloud infrastructure - everything is a Kubernetes resource managed through the API. The two tools share a common design principle: declarative configuration managed through APIs.

This means your entire stack, from the operating system up through cloud infrastructure, follows the same GitOps workflow. You declare what you want, and the system converges to that state.

## Prerequisites

Before starting, confirm you have the following:

- A Talos Linux cluster with at least 3 control plane nodes for production use
- kubectl configured to communicate with your cluster
- Helm v3 installed locally
- Credentials for at least one cloud provider (AWS, GCP, or Azure)
- Sufficient cluster resources (Crossplane recommends at least 2 CPU cores and 2GB RAM for the controller)

## Installing Crossplane

Crossplane is installed via its official Helm chart. Start by adding the repository and creating a namespace.

```bash
# Add the Crossplane Helm repository
helm repo add crossplane-stable https://charts.crossplane.io/stable

# Update local chart cache
helm repo update

# Create the crossplane-system namespace
kubectl create namespace crossplane-system

# Install Crossplane
helm install crossplane \
  crossplane-stable/crossplane \
  --namespace crossplane-system \
  --set args='{"--enable-usages"}'
```

Wait for the installation to complete and verify the pods are running.

```bash
# Check Crossplane pod status
kubectl get pods -n crossplane-system

# You should see two pods running:
# crossplane (the main controller)
# crossplane-rbac-manager

# Verify the Crossplane CRDs are installed
kubectl get crds | grep crossplane
```

## Installing a Provider

Crossplane uses providers to interact with cloud platforms. Let us install the AWS provider as an example.

```yaml
# aws-provider.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.1.0
  # Revision activation policy determines when new versions become active
  revisionActivationPolicy: Automatic
```

```bash
# Install the AWS S3 provider
kubectl apply -f aws-provider.yaml

# Watch the provider install progress
kubectl get providers -w

# Wait until the INSTALLED and HEALTHY columns both show True
```

For a more comprehensive AWS setup, you can install the provider family that covers multiple services.

```yaml
# aws-provider-family.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-family-aws
spec:
  package: xpkg.upbound.io/upbound/provider-family-aws:v1.1.0
```

## Configuring Provider Credentials

The provider needs credentials to manage cloud resources. Create a Kubernetes secret with your AWS credentials.

```bash
# Create a credentials file
cat > aws-credentials.txt << 'EOF'
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

# Create the Kubernetes secret
kubectl create secret generic aws-creds \
  -n crossplane-system \
  --from-file=credentials=./aws-credentials.txt

# Clean up the local credentials file
rm aws-credentials.txt
```

Now create a ProviderConfig that references this secret.

```yaml
# provider-config.yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-creds
      key: credentials
```

```bash
# Apply the provider configuration
kubectl apply -f provider-config.yaml
```

## Creating Your First Cloud Resource

With the provider configured, you can now create cloud resources using Kubernetes manifests. Let us create an S3 bucket.

```yaml
# s3-bucket.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-talos-crossplane-bucket
spec:
  forProvider:
    region: us-east-1
    tags:
      ManagedBy: crossplane
      Environment: production
  providerConfigRef:
    name: default
```

```bash
# Create the S3 bucket
kubectl apply -f s3-bucket.yaml

# Check the status of the bucket resource
kubectl get bucket my-talos-crossplane-bucket

# Get detailed information about the provisioning status
kubectl describe bucket my-talos-crossplane-bucket
```

The bucket will be created in AWS, and Crossplane will continuously reconcile its state. If someone deletes or modifies the bucket outside of Kubernetes, Crossplane will detect the drift and restore it to the desired state.

## Building Composite Resources

Raw managed resources are useful, but the real power of Crossplane comes from Compositions. These let you define templates that bundle multiple cloud resources together.

```yaml
# composite-definition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.custom.example.com
spec:
  group: custom.example.com
  names:
    kind: XDatabase
    plural: xdatabases
  claimNames:
    kind: Database
    plural: databases
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
                region:
                  type: string
                  description: "AWS region for the database"
                storageGB:
                  type: integer
                  description: "Storage size in gigabytes"
              required:
                - region
                - storageGB
```

Then create a Composition that maps this definition to actual cloud resources.

```yaml
# composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-composition
spec:
  compositeTypeRef:
    apiVersion: custom.example.com/v1alpha1
    kind: XDatabase
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            engine: postgres
            engineVersion: "15"
            instanceClass: db.t3.medium
            allocatedStorage: 20
            skipFinalSnapshot: true
      patches:
        - fromFieldPath: "spec.region"
          toFieldPath: "spec.forProvider.region"
        - fromFieldPath: "spec.storageGB"
          toFieldPath: "spec.forProvider.allocatedStorage"
```

## Talos-Specific Considerations

Running Crossplane on Talos Linux requires a few things to keep in mind. Since Talos does not have a traditional filesystem you can write to, all configuration must live in Kubernetes resources. This actually works in your favor with Crossplane, since everything is already a Kubernetes object.

Make sure your Talos machine configuration allows adequate resources for the Crossplane controllers. If you are running a smaller cluster, adjust the resource requests.

```bash
# Check current resource usage for Crossplane pods
kubectl top pods -n crossplane-system

# If needed, patch the deployment to adjust resources
kubectl patch deployment crossplane \
  -n crossplane-system \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/memory", "value": "512Mi"}]'
```

Network policies on Talos should allow the Crossplane controllers to reach your cloud provider APIs. Verify outbound connectivity from the crossplane-system namespace.

## GitOps Integration

Crossplane works naturally with GitOps tools like Flux or ArgoCD. Store your Crossplane manifests in a Git repository and let your GitOps tool apply them automatically.

```bash
# Example directory structure for GitOps
# infrastructure/
#   providers/
#     aws-provider.yaml
#     provider-config.yaml
#   compositions/
#     database-composition.yaml
#   claims/
#     production-database.yaml
```

This gives you version control, pull request reviews, and audit trails for all infrastructure changes, all managed through the same Kubernetes API that Talos Linux uses for everything else.

## Wrapping Up

Crossplane on Talos Linux creates a fully API-driven stack from the operating system to cloud infrastructure. You define your desired state in YAML, commit it to Git, and let the controllers handle the rest. The immutable nature of Talos means your control plane nodes are hardened by default, and Crossplane extends that declarative model to every cloud resource your applications depend on. Start with a single provider and a few managed resources, then gradually build up compositions as your team becomes comfortable with the workflow.
