# How to Manage AWS Resources with Crossplane and ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Crossplane, AWS

Description: Learn how to provision and manage AWS resources like RDS databases, S3 buckets, and VPCs using Crossplane and ArgoCD for a fully GitOps-driven infrastructure workflow.

---

Managing AWS infrastructure through kubectl feels strange at first. But once you see Crossplane in action with ArgoCD, it clicks: you define an S3 bucket as a Kubernetes manifest, commit it to Git, and ArgoCD syncs it through Crossplane to create the actual AWS resource. Your entire infrastructure - applications and cloud resources - lives in Git and deploys through the same pipeline.

This guide shows how to set up Crossplane with the AWS provider and manage common AWS resources through ArgoCD.

## Prerequisites

You need a Kubernetes cluster with ArgoCD installed. Then install Crossplane:

```bash
# Install Crossplane
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --wait
```

## Installing the AWS Provider

Install the Crossplane AWS provider:

```yaml
# crossplane/provider-aws.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-s3
spec:
  package: xpkg.upbound.io/upbound/provider-aws-s3:v1.1.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-rds
spec:
  package: xpkg.upbound.io/upbound/provider-aws-rds:v1.1.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-ec2
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.1.0
---
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws-iam
spec:
  package: xpkg.upbound.io/upbound/provider-aws-iam:v1.1.0
```

## Configuring AWS Credentials

Create an AWS IAM user or role for Crossplane, then configure the provider:

```yaml
# crossplane/aws-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: crossplane-system
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = YOUR_ACCESS_KEY
    aws_secret_access_key = YOUR_SECRET_KEY
---
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

For production, use IRSA (IAM Roles for Service Accounts) instead of static credentials:

```yaml
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: IRSA
```

## Managing S3 Buckets

Create an S3 bucket through Crossplane:

```yaml
# aws/s3/application-bucket.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: my-app-assets
  labels:
    app: my-application
    environment: production
spec:
  forProvider:
    region: us-east-1
    tags:
      Environment: production
      ManagedBy: crossplane
  providerConfigRef:
    name: default
---
apiVersion: s3.aws.upbound.io/v1beta1
kind: BucketVersioning
metadata:
  name: my-app-assets-versioning
spec:
  forProvider:
    region: us-east-1
    bucketRef:
      name: my-app-assets
    versioningConfiguration:
      - status: Enabled
---
apiVersion: s3.aws.upbound.io/v1beta1
kind: BucketServerSideEncryptionConfiguration
metadata:
  name: my-app-assets-encryption
spec:
  forProvider:
    region: us-east-1
    bucketRef:
      name: my-app-assets
    rule:
      - applyServerSideEncryptionByDefault:
          - sseAlgorithm: aws:kms
```

## Provisioning RDS Databases

Create a PostgreSQL RDS instance:

```yaml
# aws/rds/application-db.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: SubnetGroup
metadata:
  name: app-db-subnet-group
spec:
  forProvider:
    region: us-east-1
    description: "Subnet group for application database"
    subnetIdSelector:
      matchLabels:
        access: private
    tags:
      ManagedBy: crossplane
---
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: app-database
  labels:
    app: my-application
spec:
  forProvider:
    region: us-east-1
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.t3.medium
    allocatedStorage: 50
    maxAllocatedStorage: 200
    storageType: gp3
    storageEncrypted: true

    dbName: myapp
    username: admin
    # Password stored in a Kubernetes Secret
    passwordSecretRef:
      name: rds-master-password
      namespace: crossplane-system
      key: password

    dbSubnetGroupNameRef:
      name: app-db-subnet-group
    vpcSecurityGroupIdSelector:
      matchLabels:
        app: my-application
        type: database

    publiclyAccessible: false
    multiAz: true
    backupRetentionPeriod: 7
    deletionProtection: true
    skipFinalSnapshot: false
    finalSnapshotIdentifier: app-database-final

    tags:
      Environment: production
      ManagedBy: crossplane
  # Write connection details to a Kubernetes Secret
  writeConnectionSecretToRef:
    name: app-database-connection
    namespace: default
```

The `writeConnectionSecretToRef` automatically creates a Kubernetes Secret with the database connection details, which your application pods can consume.

## Creating VPC and Networking

Manage your entire VPC through Crossplane:

```yaml
# aws/networking/vpc.yaml
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: app-vpc
spec:
  forProvider:
    region: us-east-1
    cidrBlock: 10.0.0.0/16
    enableDnsHostnames: true
    enableDnsSupport: true
    tags:
      Name: app-vpc
      ManagedBy: crossplane
---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: private-subnet-1a
  labels:
    access: private
spec:
  forProvider:
    region: us-east-1
    availabilityZone: us-east-1a
    cidrBlock: 10.0.1.0/24
    vpcIdRef:
      name: app-vpc
    mapPublicIpOnLaunch: false
    tags:
      Name: private-1a
      access: private
---
apiVersion: ec2.aws.upbound.io/v1beta1
kind: Subnet
metadata:
  name: private-subnet-1b
  labels:
    access: private
spec:
  forProvider:
    region: us-east-1
    availabilityZone: us-east-1b
    cidrBlock: 10.0.2.0/24
    vpcIdRef:
      name: app-vpc
    mapPublicIpOnLaunch: false
    tags:
      Name: private-1b
      access: private
```

## Building Compositions for Self-Service

Crossplane Compositions let you create higher-level abstractions. Define a "Database" claim that teams can use without knowing RDS details:

```yaml
# crossplane/compositions/database-composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.myorg.io
spec:
  group: myorg.io
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
                size:
                  type: string
                  enum: [small, medium, large]
                  description: "Database size"
                engine:
                  type: string
                  enum: [postgres, mysql]
                  default: postgres
              required:
                - size
---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-database
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: myorg.io/v1alpha1
    kind: XDatabase
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-east-1
            storageEncrypted: true
            publiclyAccessible: false
            multiAz: true
            backupRetentionPeriod: 7
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.engine
          toFieldPath: spec.forProvider.engine
        - type: FromCompositeFieldPath
          fromFieldPath: spec.size
          toFieldPath: spec.forProvider.instanceClass
          transforms:
            - type: map
              map:
                small: db.t3.small
                medium: db.t3.medium
                large: db.r5.large
```

Now teams can request a database with a simple claim:

```yaml
# apps/api-service/database.yaml
apiVersion: myorg.io/v1alpha1
kind: Database
metadata:
  name: api-database
  namespace: api
spec:
  size: medium
  engine: postgres
```

## ArgoCD Application for AWS Resources

Manage all AWS resources through an ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: aws-infrastructure
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/myorg/gitops-repo.git
    targetRevision: main
    path: aws
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      # Crossplane resources can take time to provision
      - RespectIgnoreDifferences=true
  ignoreDifferences:
    - group: rds.aws.upbound.io
      kind: Instance
      jsonPointers:
        - /spec/forProvider/engineVersion
```

## Handling Sync Waves for Dependencies

AWS resources often have dependencies. Use sync waves to control creation order:

```yaml
# Wave 0: VPC and networking
apiVersion: ec2.aws.upbound.io/v1beta1
kind: VPC
metadata:
  name: app-vpc
  annotations:
    argocd.argoproj.io/sync-wave: "0"
# ...

---
# Wave 1: Security groups (depend on VPC)
apiVersion: ec2.aws.upbound.io/v1beta1
kind: SecurityGroup
metadata:
  name: db-security-group
  annotations:
    argocd.argoproj.io/sync-wave: "1"
# ...

---
# Wave 2: RDS (depends on subnets and security groups)
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: app-database
  annotations:
    argocd.argoproj.io/sync-wave: "2"
# ...
```

For a broader overview of using Crossplane with ArgoCD, see our guide on [GitOps infrastructure with Crossplane and ArgoCD](https://oneuptime.com/blog/post/2026-02-09-gitops-infrastructure-crossplane-argocd/view). Use OneUptime to monitor the health and availability of your Crossplane-provisioned AWS resources alongside your application metrics.

## Best Practices

1. **Use IRSA for authentication** - Avoid static AWS credentials. Use IAM Roles for Service Accounts.
2. **Enable deletion protection** - Set `deletionProtection: true` on critical resources like RDS and S3.
3. **Use Compositions** - Abstract complex resource combinations into simple claims.
4. **Manage sync waves carefully** - AWS resource creation order matters. Use sync waves.
5. **Monitor Crossplane health** - Track Crossplane provider health and resource readiness.
6. **Tag everything** - Use consistent tags across all AWS resources for cost tracking and compliance.
7. **Start with non-critical resources** - Begin with S3 buckets before moving to databases and networking.

Crossplane and ArgoCD together give you a fully GitOps-driven AWS infrastructure management workflow. Define resources in YAML, commit to Git, and ArgoCD handles the rest through Crossplane.
