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
**Claim**: Instance of an XRD that application teams create to request infrastructure

Think of XRDs as the interface, Compositions as the implementation, and Claims as the requests.

## Creating a Basic Composition

Start with a simple example that provisions an S3 bucket with standard settings:

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
  resources:
  - name: bucket
    base:
      apiVersion: s3.aws.crossplane.io/v1beta1
      kind: Bucket
      spec:
        forProvider:
          acl: private
          publicAccessBlockConfiguration:
            blockPublicAcls: true
            blockPublicPolicy: true
            ignorePublicAcls: true
            restrictPublicBuckets: true
          versioning:
            status: Enabled
          serverSideEncryptionConfiguration:
            rules:
            - applyServerSideEncryptionByDefault:
                sseAlgorithm: AES256
        providerConfigRef:
          name: default
```

This Composition creates a single S3 bucket with sensible security defaults whenever someone creates an XObjectStorage resource.

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
  resources:
  - name: subnet-group
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: DBSubnetGroup
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
      apiVersion: rds.aws.crossplane.io/v1alpha1
      kind: DBParameterGroup
      spec:
        forProvider:
          description: PostgreSQL 14 parameters
          family: postgres14
          region: us-west-2
          parameters:
          - name: shared_buffers
            value: "256MB"
          - name: max_connections
            value: "200"
  - name: rds-instance
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
      spec:
        forProvider:
          region: us-west-2
          engine: postgres
          engineVersion: "14.7"
          dbInstanceClass: db.t3.large
          allocatedStorage: 100
          storageEncrypted: true
          publiclyAccessible: false
          skipFinalSnapshot: false
          backupRetentionPeriod: 7
          preferredBackupWindow: "03:00-04:00"
          preferredMaintenanceWindow: "sun:04:00-sun:05:00"
        writeConnectionSecretToRef:
          namespace: crossplane-system
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
  resources:
  - name: rds-instance
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
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
      toFieldPath: spec.forProvider.dbInstanceClass
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
  toFieldPath: spec.forProvider.dbInstanceClass
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
      multiply: 1
      type: int64
```

The size patch maps user-friendly names to actual instance classes. This abstracts cloud-specific details from users.

## Creating Connection Secret Patches

Expose database connection details to application namespaces:

```yaml
resources:
- name: rds-instance
  base:
    apiVersion: database.aws.crossplane.io/v1beta1
    kind: RDSInstance
    spec:
      writeConnectionSecretToRef:
        namespace: crossplane-system
  patches:
  - type: FromCompositeFieldPath
    fromFieldPath: spec.writeConnectionSecretToRef.name
    toFieldPath: spec.writeConnectionSecretToRef.name
  - type: FromCompositeFieldPath
    fromFieldPath: spec.writeConnectionSecretToRef.namespace
    toFieldPath: spec.writeConnectionSecretToRef.namespace
  connectionDetails:
  - name: username
    fromConnectionSecretKey: username
  - name: password
    fromConnectionSecretKey: password
  - name: endpoint
    fromConnectionSecretKey: endpoint
  - name: port
    fromConnectionSecretKey: port
```

This allows application teams to specify where connection secrets should be created.

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
  resources:
  - name: rds-instance
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
      spec:
        forProvider:
          dbInstanceClass: db.t3.micro
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
  resources:
  - name: rds-instance
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
      spec:
        forProvider:
          dbInstanceClass: db.r5.large
          allocatedStorage: 100
          backupRetentionPeriod: 30
          multiAZ: true
```

Users select Compositions via labels in their Claims.

## Implementing Resource References

Link resources within Compositions using references:

```yaml
resources:
- name: security-group
  base:
    apiVersion: ec2.aws.crossplane.io/v1beta1
    kind: SecurityGroup
    spec:
      forProvider:
        region: us-west-2
        description: Security group for RDS
        groupName: ""
- name: rds-instance
  base:
    apiVersion: database.aws.crossplane.io/v1beta1
    kind: RDSInstance
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
  resources:
  - name: rds
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
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
  resources:
  - name: cloudsql
    base:
      apiVersion: database.gcp.crossplane.io/v1beta1
      kind: CloudSQLInstance
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
  # Updated resources...
```

Use labels and annotations to track versions and document changes.

## Conclusion

Compositions transform Crossplane from a collection of cloud resource CRDs into a platform engineering tool. By creating well-designed Compositions, platform teams build golden paths that application teams can use without cloud expertise. Compositions encapsulate complexity, enforce best practices, and enable self-service infrastructure provisioning through simple, declarative APIs.
