# How to Configure Crossplane Compositions for Resource Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Infrastructure as Code

Description: Learn how to create Crossplane Compositions as reusable templates for infrastructure provisioning, enabling platform teams to define golden paths for resource configuration.

---

Compositions are Crossplane's template engine for infrastructure. Instead of having application teams learn AWS RDS parameters, subnet configurations, and security group rules, you create a Composition that packages all that complexity into a simple interface. Teams request a "database" and get a production-ready RDS instance with backups, encryption, and proper networking automatically configured.

A Composition defines how to translate a high-level resource (like "PostgreSQL database") into specific cloud resources (RDS instance, subnet group, parameter group, security group). It's the blueprint that platform teams create once and application teams use repeatedly.

## Understanding Composition Architecture

Compositions work with three key concepts:

**Composite Resource Definition (XRD)**: Defines the API schema for your custom resource
**Composition**: Implements the XRD by defining which managed resources to create
**Claim**: Namespaced resource that application teams create to request infrastructure when an XRD defines claim names

Think of XRDs as the interface, Compositions as the implementation, and Claims as the requests.

## Creating a Basic Composition

Start with a simple example that provisions an S3 bucket with standard settings. These examples use Crossplane's Pipeline mode with Function Patch and Transform, so the `function-patch-and-transform` Function must be installed first.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: s3bucket-standard
  labels:
    provider: aws
    type: storage
spec:
  compositeTypeRef:
    apiVersion: custom.example.com/v1alpha1
    kind: XObjectStorage
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: bucket
        base:
          apiVersion: s3.aws.m.upbound.io/v1beta1
          kind: Bucket
          spec:
            forProvider:
              region: us-west-2
            providerConfigRef:
              kind: ClusterProviderConfig
              name: default
      - name: public-access-block
        base:
          apiVersion: s3.aws.m.upbound.io/v1beta1
          kind: BucketPublicAccessBlock
          spec:
            forProvider:
              region: us-west-2
              blockPublicAcls: true
              blockPublicPolicy: true
              ignorePublicAcls: true
              restrictPublicBuckets: true
              bucketSelector:
                matchControllerRef: true
            providerConfigRef:
              kind: ClusterProviderConfig
              name: default
      - name: versioning
        base:
          apiVersion: s3.aws.m.upbound.io/v1beta1
          kind: BucketVersioning
          spec:
            forProvider:
              region: us-west-2
              versioningConfiguration:
                status: Enabled
              bucketSelector:
                matchControllerRef: true
            providerConfigRef:
              kind: ClusterProviderConfig
              name: default
      - name: encryption
        base:
          apiVersion: s3.aws.m.upbound.io/v1beta1
          kind: BucketServerSideEncryptionConfiguration
          spec:
            forProvider:
              region: us-west-2
              rule:
              - applyServerSideEncryptionByDefault:
                  sseAlgorithm: AES256
              bucketSelector:
                matchControllerRef: true
            providerConfigRef:
              kind: ClusterProviderConfig
              name: default
```

This Composition creates an S3 bucket and the related S3 configuration resources with sensible security defaults whenever someone creates an XObjectStorage resource.

## Building a Multi-Resource Composition

Real infrastructure requires multiple resources working together. Create a Composition for a complete database setup:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-production
  labels:
    provider: aws
    environment: production
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: subnet-group
        base:
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: SubnetGroup
          spec:
            forProvider:
              description: Subnet group for PostgreSQL
              region: us-west-2
              subnetIds:
              - subnet-abc123
              - subnet-def456
              - subnet-ghi789
      - name: parameter-group
        base:
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: ParameterGroup
          spec:
            forProvider:
              description: PostgreSQL 14 parameters
              family: postgres14
              region: us-west-2
              parameter:
              - name: log_min_duration_statement
                value: "1000"
              - name: max_connections
                value: "200"
      - name: rds-instance
        base:
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: Instance
          spec:
            forProvider:
              region: us-west-2
              engine: postgres
              engineVersion: "14.7"
              instanceClass: db.t3.large
              allocatedStorage: 100
              username: appuser
              autoGeneratePassword: true
              storageEncrypted: true
              publiclyAccessible: false
              skipFinalSnapshot: false
              backupRetentionPeriod: 7
              backupWindow: "03:00-04:00"
              maintenanceWindow: "sun:04:00-sun:05:00"
              dbSubnetGroupNameSelector:
                matchControllerRef: true
              parameterGroupNameSelector:
                matchControllerRef: true
            writeConnectionSecretToRef:
              name: postgres-production-connection
```

This creates a production-grade database with proper networking, parameters, and backup configuration.

## Using Patches for Dynamic Configuration

Patches let you map fields from the Claim to managed resources, making Compositions dynamic:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-flexible
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
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
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: Instance
          spec:
            forProvider:
              region: us-west-2
              engine: postgres
              storageEncrypted: true
        patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.storageGB
          toFieldPath: spec.forProvider.allocatedStorage
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.version
          toFieldPath: spec.forProvider.engineVersion
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.instanceClass
          toFieldPath: spec.forProvider.instanceClass
        - type: FromCompositeFieldPath
          fromFieldPath: metadata.labels
          toFieldPath: spec.forProvider.tags
```

Now users can specify storage size, version, and instance class when creating a database, and those values flow through to the RDS instance.

## Implementing Transform Patches

Transform patches modify values during patching:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.size
  toFieldPath: spec.forProvider.instanceClass
  transforms:
  - type: map
    map:
      small: db.t3.medium
      medium: db.t3.large
      large: db.r5.xlarge
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.storageGB
  toFieldPath: spec.forProvider.allocatedStorage
  transforms:
  - type: math
    math:
      type: multiply
      multiply: 1
```

The size patch maps user-friendly names to actual instance classes. This abstracts cloud-specific details from users.

## Creating Connection Secret Patches

Expose database connection details to application namespaces:

```yaml
resources:
- name: rds-instance
  base:
    apiVersion: rds.aws.m.upbound.io/v1beta1
    kind: Instance
    spec:
      writeConnectionSecretToRef:
        name: postgres-connection
  patches:
  - type: FromCompositeFieldPath
    fromFieldPath: spec.writeConnectionSecretToRef.name
    toFieldPath: spec.writeConnectionSecretToRef.name
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

This allows application teams to specify the connection secret name.

## Using Composition Selection

Allow multiple Composition implementations for the same XRD:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-development
  labels:
    environment: development
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
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
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: Instance
          spec:
            forProvider:
              instanceClass: db.t3.micro
              allocatedStorage: 20
              backupRetentionPeriod: 1
              skipFinalSnapshot: true
---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-production
  labels:
    environment: production
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
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
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: Instance
          spec:
            forProvider:
              instanceClass: db.r5.large
              allocatedStorage: 100
              backupRetentionPeriod: 30
              multiAz: true
```

Users select Compositions with a `compositionSelector.matchLabels` block in their composite resources or Claims.

## Implementing Resource References

Link resources within Compositions using references:

```yaml
resources:
- name: security-group
  base:
    apiVersion: ec2.aws.m.upbound.io/v1beta1
    kind: SecurityGroup
    spec:
      forProvider:
        region: us-west-2
        description: Security group for RDS
        name: postgres-rds
- name: rds-instance
  base:
    apiVersion: rds.aws.m.upbound.io/v1beta1
    kind: Instance
    spec:
      forProvider:
        region: us-west-2
        vpcSecurityGroupIdSelector:
          matchControllerRef: true
```

The `matchControllerRef: true` selector links the RDS instance to the security group created by this Composition.

## Creating Multi-Cloud Compositions

Build Compositions that can target different clouds:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-aws
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: rds
        base:
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: Instance
---
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-gcp
  labels:
    provider: gcp
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      - name: cloudsql
        base:
          apiVersion: sql.gcp.m.upbound.io/v1beta1
          kind: DatabaseInstance
```

Users select the provider through composition selection.

## Versioning Compositions

Manage Composition changes over time:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-production-v2
  labels:
    version: v2
    environment: production
  annotations:
    crossplane.io/composition-description: "Version 2: Added multi-AZ support"
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance
  mode: Pipeline
  # Updated pipeline...
```

Use labels and annotations to track versions and document changes.

## Conclusion

Compositions transform Crossplane from a collection of cloud resource CRDs into a platform engineering tool. By creating well-designed Compositions, platform teams build golden paths that application teams can use without cloud expertise. Compositions encapsulate complexity, enforce best practices, and enable self-service infrastructure provisioning through simple, declarative APIs.
