# How to Run Crossplane in Docker for Cloud Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Crossplane, Kubernetes, Cloud Resources, Infrastructure as Code, AWS, GCP, Azure, DevOps

Description: Learn how to run Crossplane in a local Docker-based Kubernetes cluster to manage cloud resources declaratively.

---

Crossplane extends Kubernetes to manage cloud infrastructure. Instead of writing Terraform scripts or clicking through cloud consoles, you define AWS S3 buckets, RDS databases, or GCP storage as Kubernetes custom resources. Crossplane's controllers then reconcile those resources with your cloud provider. Running Crossplane locally in Docker lets you develop and test infrastructure definitions before applying them to production clusters.

This guide walks through setting up Crossplane in a Docker-based Kubernetes environment, installing cloud providers, and managing real cloud resources from your laptop.

## How Crossplane Works

Crossplane installs into any Kubernetes cluster as a set of controllers. You then install "providers" for each cloud platform you want to manage. These providers register Custom Resource Definitions (CRDs) for each cloud service. When you create a Kubernetes manifest for, say, an S3 bucket, the AWS provider picks it up and creates the actual bucket in AWS.

The beauty of this approach is that your infrastructure definitions live alongside your application manifests. You use kubectl, GitOps tools, and standard Kubernetes RBAC to manage everything.

## Setting Up a Local Kubernetes Cluster

Crossplane needs Kubernetes. The fastest way to get a local cluster running in Docker is with kind (Kubernetes IN Docker).

```bash
# Install kind if you do not have it
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Create a kind cluster for Crossplane
kind create cluster --name crossplane-dev --wait 5m
```

Verify the cluster is running.

```bash
# Check cluster nodes (they run as Docker containers)
kubectl get nodes
docker ps | grep crossplane
```

## Installing Crossplane

Install Crossplane using Helm, the standard method.

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

# Verify all Crossplane pods are running
kubectl get pods -n crossplane-system
```

You should see the Crossplane pod and the RBAC manager pod both in a Running state.

## Installing the AWS Provider

Crossplane providers are packaged as container images. Install the AWS provider to manage AWS resources.

```yaml
# aws-provider.yaml - Install the AWS provider for Crossplane
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.1.0
```

```bash
# Apply the provider manifest
kubectl apply -f aws-provider.yaml

# Wait for the provider to become healthy
kubectl get providers -w
```

## Configuring AWS Credentials

Crossplane needs credentials to interact with AWS. Create a Kubernetes secret with your AWS credentials and a ProviderConfig that references it.

```bash
# Create a credentials file
cat > aws-credentials.txt << 'EOF'
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
EOF

# Create a Kubernetes secret from the credentials file
kubectl create secret generic aws-secret \
  -n crossplane-system \
  --from-file=creds=./aws-credentials.txt

# Clean up the credentials file
rm aws-credentials.txt
```

```yaml
# provider-config.yaml - Configure the AWS provider with credentials
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-secret
      key: creds
```

```bash
# Apply the provider configuration
kubectl apply -f provider-config.yaml
```

## Creating Cloud Resources

Now you can create AWS resources using Kubernetes manifests. Here is an S3 bucket definition.

```yaml
# s3-bucket.yaml - Create an S3 bucket through Crossplane
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-crossplane-bucket
spec:
  forProvider:
    region: us-east-1
    tags:
      Environment: development
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

```bash
# Create the S3 bucket
kubectl apply -f s3-bucket.yaml

# Watch the resource status
kubectl get bucket my-crossplane-bucket -w

# Check detailed status including any errors
kubectl describe bucket my-crossplane-bucket
```

Crossplane will create the bucket in AWS and report its status back through the Kubernetes resource.

## Composing Resources with Compositions

Crossplane's real power comes from Compositions, which let you define reusable infrastructure templates. Create a composition that bundles an S3 bucket with a DynamoDB table.

```yaml
# composite-definition.yaml - Define a composite resource type
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xstoragebundles.custom.example.com
spec:
  group: custom.example.com
  names:
    kind: XStorageBundle
    plural: xstoragebundles
  claimNames:
    kind: StorageBundle
    plural: storagebundles
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
                  default: us-east-1
                environment:
                  type: string
                  enum: [development, staging, production]
```

```yaml
# composition.yaml - Define how the composite maps to actual resources
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: storage-bundle-aws
spec:
  compositeTypeRef:
    apiVersion: custom.example.com/v1alpha1
    kind: XStorageBundle
  resources:
    - name: storage-bucket
      base:
        apiVersion: s3.aws.upbound.io/v1beta1
        kind: Bucket
        spec:
          forProvider:
            region: us-east-1
            tags:
              ManagedBy: crossplane
      patches:
        - fromFieldPath: "spec.region"
          toFieldPath: "spec.forProvider.region"
        - fromFieldPath: "spec.environment"
          toFieldPath: "spec.forProvider.tags.Environment"
```

Now team members can create infrastructure with a simple claim.

```yaml
# storage-claim.yaml - Request a storage bundle
apiVersion: custom.example.com/v1alpha1
kind: StorageBundle
metadata:
  name: my-app-storage
  namespace: default
spec:
  region: us-east-1
  environment: development
```

```bash
# Apply all the definitions
kubectl apply -f composite-definition.yaml
kubectl apply -f composition.yaml
kubectl apply -f storage-claim.yaml

# Check the status
kubectl get storagebundle my-app-storage
kubectl get composite
```

## Cleaning Up Cloud Resources

Deleting the Kubernetes resource deletes the cloud resource. Crossplane manages the full lifecycle.

```bash
# Delete the S3 bucket (this removes it from AWS too)
kubectl delete bucket my-crossplane-bucket

# Delete a composite claim
kubectl delete storagebundle my-app-storage
```

## Developing with Docker Compose

For a more portable development setup, wrap the entire workflow in a script that uses kind and Docker.

```bash
#!/bin/bash
# setup-crossplane.sh - One-command Crossplane development environment

set -e

CLUSTER_NAME="crossplane-dev"

echo "Creating kind cluster..."
kind create cluster --name $CLUSTER_NAME --wait 5m

echo "Installing Crossplane..."
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update
helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --wait

echo "Installing AWS provider..."
kubectl apply -f aws-provider.yaml

echo "Waiting for provider to become healthy..."
kubectl wait --for=condition=healthy provider/provider-aws --timeout=120s

echo "Crossplane is ready. Configure your credentials and start creating resources."
```

## Tearing Down the Environment

When you are done, destroy the entire local environment with a single command.

```bash
# Delete the kind cluster - all containers and resources are removed
kind delete cluster --name crossplane-dev

# Verify Docker containers are gone
docker ps | grep crossplane
```

## Wrapping Up

Crossplane turns Kubernetes into a universal control plane for cloud infrastructure. Running it locally in Docker through kind gives you a safe, fast environment for developing infrastructure compositions and testing provider configurations. You get the full Crossplane experience, including reconciliation, drift detection, and composition, without touching a production cluster. Once your definitions are tested, they deploy identically to any Kubernetes cluster running Crossplane.
