# How to Use Crossplane with Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Crossplane, Infrastructure as Code, Cloud Native

Description: Use Crossplane with Rancher to manage cloud infrastructure resources directly from Kubernetes using CRDs for a fully cloud-native infrastructure management approach.

## Introduction

Crossplane extends Kubernetes to manage cloud infrastructure using the same Kubernetes API and tooling. Instead of using separate tools like Terraform or Pulumi, Crossplane allows you to provision AWS, Azure, GCP, and other cloud resources through Kubernetes manifests. This guide covers installing Crossplane on Rancher and using it to provision cloud resources alongside your Kubernetes workloads.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- Cloud provider credentials (AWS, Azure, or GCP)
- kubectl access

## Step 1: Install Crossplane

```bash
# Add Crossplane Helm repository

helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Install Crossplane
helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --wait

# Verify installation
kubectl get pods -n crossplane-system
kubectl get crds | grep crossplane.io | head -10
```

## Step 2: Install Cloud Providers

### AWS Providers

```yaml
# aws-provider.yaml - Install the AWS S3 and RDS providers
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v2.5.2
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-rds
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v2.5.3
```

```bash
kubectl apply -f aws-provider.yaml

# Wait for provider to be healthy
kubectl get providers
```

### Configure AWS Credentials

```bash
# Create AWS credentials file
cat > aws-credentials.ini <<'EOF'
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Create AWS credentials secret
kubectl create secret generic aws-credentials \
  --namespace crossplane-system \
  --from-file=creds=./aws-credentials.ini
```

```yaml
# aws-provider-config.yaml - Provider configuration
apiVersion: aws.m.upbound.io/v1beta1
kind: ClusterProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-credentials
      key: creds
```

## Step 3: Provision AWS Resources

### Create an S3 Bucket

S3 bucket names must be globally unique, so this example uses `generateName` and a label selector for the versioning resource.

```yaml
# s3-bucket.yaml - Provision S3 bucket via Crossplane
apiVersion: s3.aws.m.upbound.io/v1beta1
kind: Bucket
metadata:
  namespace: production
  generateName: my-app-storage-
  labels:
    app.kubernetes.io/name: my-app-storage
spec:
  forProvider:
    region: us-east-1
    tags:
      environment: production
      managed-by: crossplane
  providerConfigRef:
    name: default
    kind: ClusterProviderConfig
---
# BucketVersioning
apiVersion: s3.aws.m.upbound.io/v1beta1
kind: BucketVersioning
metadata:
  namespace: production
  name: my-app-storage-versioning
spec:
  forProvider:
    bucketSelector:
      matchLabels:
        app.kubernetes.io/name: my-app-storage
    region: us-east-1
    versioningConfiguration:
      status: Enabled
  providerConfigRef:
    name: default
    kind: ClusterProviderConfig
```

### Create an RDS Database

```yaml
# rds-instance.yaml - Provision RDS PostgreSQL via Crossplane
apiVersion: rds.aws.m.upbound.io/v1beta1
kind: Instance
metadata:
  name: production-db
  namespace: production
spec:
  forProvider:
    region: us-east-1
    instanceClass: db.t3.medium
    engine: postgres
    allocatedStorage: 20
    storageType: gp3
    username: dbadmin
    autoGeneratePassword: true
    passwordSecretRef:
      name: production-db-password
      key: password
    autoMinorVersionUpgrade: true
    backupRetentionPeriod: 7
    publiclyAccessible: false
    skipFinalSnapshot: true
    tags:
      environment: production
      managed-by: crossplane
  writeConnectionSecretToRef:
    name: rds-connection
  providerConfigRef:
    name: default
    kind: ClusterProviderConfig
```

For non-default VPCs, also set `dbSubnetGroupName` and the relevant VPC security groups explicitly.

## Step 4: Create Composite Resources (XRDs)

Crossplane's power comes from composites that bundle multiple resources:

```yaml
# xrd-database.yaml - Install the function, XRD, and Composition
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.8.2
---
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: postgresqlinstances.database.example.com
spec:
  scope: Namespaced
  defaultCompositionRef:
    name: postgresqlinstances.aws.database.example.com
  group: database.example.com
  names:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
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
                parameters:
                  type: object
                  properties:
                    storageGB:
                      type: integer
                      description: Size of storage in GB
                    tier:
                      type: string
                      enum: [small, medium, large]
                  required: [storageGB, tier]
                writeConnectionSecretToRef:
                  type: object
                  properties:
                    name:
                      type: string
              required: [parameters]
---
# composition.yaml - Composition (implementation)
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgresqlinstances.aws.database.example.com
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        writeConnectionSecretToRef:
          patches:
            - type: FromCompositeFieldPath
              fromFieldPath: spec.writeConnectionSecretToRef.name
              toFieldPath: name
        resources:
          - name: rdsInstance
            base:
              apiVersion: rds.aws.m.upbound.io/v1beta1
              kind: Instance
              spec:
                forProvider:
                  region: us-east-1
                  engine: postgres
                  storageType: gp3
                  username: dbadmin
                  autoGeneratePassword: true
                  passwordSecretRef:
                    name: placeholder
                    key: password
                  backupRetentionPeriod: 7
                  publiclyAccessible: false
                  skipFinalSnapshot: true
                providerConfigRef:
                  name: default
                  kind: ClusterProviderConfig
                writeConnectionSecretToRef:
                  name: placeholder
            patches:
              - type: FromCompositeFieldPath
                fromFieldPath: metadata.name
                toFieldPath: metadata.name
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.storageGB
                toFieldPath: spec.forProvider.allocatedStorage
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.tier
                toFieldPath: spec.forProvider.instanceClass
                transforms:
                  - type: map
                    map:
                      small: db.t3.small
                      medium: db.t3.medium
                      large: db.t3.large
              - type: FromCompositeFieldPath
                fromFieldPath: metadata.name
                toFieldPath: spec.forProvider.passwordSecretRef.name
                transforms:
                  - type: string
                    string:
                      type: Format
                      fmt: "%s-db-password"
              - type: FromCompositeFieldPath
                fromFieldPath: metadata.name
                toFieldPath: spec.writeConnectionSecretToRef.name
                transforms:
                  - type: string
                    string:
                      type: Format
                      fmt: "%s-rds-details"
            connectionDetails:
              - name: username
                type: FromConnectionSecretKey
                fromConnectionSecretKey: username
              - name: password
                type: FromConnectionSecretKey
                fromConnectionSecretKey: password
              - name: endpoint
                type: FromConnectionSecretKey
                fromConnectionSecretKey: endpoint
              - name: port
                type: FromConnectionSecretKey
                fromConnectionSecretKey: port
```

## Step 5: Provision Through the Composite API

```yaml
# postgres-instance.yaml - Request a PostgreSQL instance through the composite API
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: my-app-db
  namespace: production
spec:
  parameters:
    storageGB: 20
    tier: medium
  writeConnectionSecretToRef:
    name: my-app-db-connection
```

## Step 6: Use Crossplane with Rancher Fleet

Fleet deploys raw YAML manifests from Git repositories, so you typically commit the composite resource manifest alongside an optional `fleet.yaml` file.

```yaml
# fleet.yaml - Bundle settings for Crossplane resources managed by Fleet
defaultNamespace: production
```

```yaml
# postgresqlinstance.yaml - Fleet applies this raw manifest from the same Git repo path
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: team-db
spec:
  parameters:
    storageGB: 20
    tier: small
  writeConnectionSecretToRef:
    name: team-db-connection
```

## Conclusion

Crossplane brings infrastructure provisioning into the Kubernetes ecosystem, enabling platform teams to provide self-service infrastructure to development teams using familiar Kubernetes tools. Composite Resources abstract cloud-specific details, providing a consistent API regardless of the underlying cloud provider. In Rancher environments, Crossplane pairs well with GitOps workflows through Fleet, enabling teams to request infrastructure resources alongside their application deployments.
