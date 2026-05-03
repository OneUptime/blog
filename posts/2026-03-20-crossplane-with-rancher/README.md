# How to Use Crossplane with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Crossplane, Kubernetes, Infrastructure as Code, Cloud Provider, GitOps

Description: Install Crossplane on Rancher to manage cloud infrastructure resources using Kubernetes-native custom resources and compositions.

## Introduction

Crossplane extends Kubernetes to manage external infrastructure-cloud databases, storage buckets, VPCs-as Kubernetes custom resources. Running Crossplane on Rancher enables a unified control plane where both application workloads and the cloud resources they depend on are managed through the same Kubernetes API.

## Prerequisites

- Rancher cluster with sufficient RBAC permissions
- Cloud provider credentials (AWS, GCP, or Azure)
- `helm` and `kubectl` configured

## Step 1: Install Crossplane

```bash
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace
```

## Step 2: Verify Crossplane is Running

```bash
kubectl get pods -n crossplane-system
kubectl get crds | grep crossplane
```

## Step 3: Install the AWS Provider

```yaml
# aws-provider.yaml

apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: upbound-provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v2.5.3
```

```bash
kubectl apply -f aws-provider.yaml

# Wait for the provider to be ready
kubectl get providers
```

## Step 4: Configure AWS Credentials

```bash
# Create credentials file
cat > aws-credentials.txt << 'EOF'
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
EOF

kubectl create secret generic aws-credentials \
  -n crossplane-system \
  --from-file=credentials=aws-credentials.txt
```

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
      name: aws-credentials
      key: credentials
```

## Step 5: Create an S3 Bucket as a Kubernetes Resource

```yaml
# s3-bucket.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-app-data-bucket
spec:
  forProvider:
    region: us-east-1
    tags:
      Environment: production
      ManagedBy: crossplane
  providerConfigRef:
    name: default
```

```bash
kubectl apply -f s3-bucket.yaml

# Check bucket provisioning status
kubectl get bucket my-app-data-bucket
kubectl describe bucket my-app-data-bucket
```

## Step 6: Create a Composition for Self-Service Databases

Compositions create higher-level abstractions for platform teams to offer to developers. Crossplane v2 requires Compositions to use `mode: Pipeline` with composition functions, so first install the patch-and-transform function:

```yaml
# function-patch-and-transform.yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.10.4
```

```bash
kubectl apply -f function-patch-and-transform.yaml
```

Then define the Composition:

```yaml
# database-composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database.aws.platform.example.org
spec:
  compositeTypeRef:
    apiVersion: platform.example.org/v1alpha1
    kind: Database
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-east-1
                  engine: postgres
                  engineVersion: "15"
                  instanceClass: db.t3.medium
                  allocatedStorage: 20
```

## Conclusion

Crossplane on Rancher creates a platform-as-a-product experience where developers can request cloud resources (S3 buckets, RDS instances, Redis clusters) using familiar `kubectl apply` commands. Operations teams define Compositions that enforce security and compliance requirements, while developers get self-service access within those guardrails.
