# How to Set Up Crossplane Compositions for Self-Service Kubernetes Infrastructure Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Infrastructure-as-Code

Description: Learn how to build Crossplane Compositions that enable self-service infrastructure provisioning, allowing developers to create databases, storage, and other resources using simple Kubernetes custom resources.

---

Self-service infrastructure changes how teams work. Instead of waiting for ops teams to provision resources, developers create what they need using familiar Kubernetes APIs. Crossplane makes this possible by turning cloud resources into Kubernetes objects managed through compositions.

A composition defines how high-level resource requests map to actual cloud infrastructure. Developers request a database using a simple custom resource. Crossplane handles the underlying cloud API calls to create RDS instances, networking, backups, and monitoring.

This guide shows you how to build compositions that provide safe, self-service infrastructure provisioning for your teams.

## Understanding Crossplane Architecture

Crossplane extends Kubernetes with two key concepts: managed resources and composite resources. Managed resources are direct representations of cloud resources like S3 buckets or RDS instances. Composite resources are higher-level abstractions that bundle multiple managed resources together.

Compositions connect these layers. They define how a composite resource request turns into specific managed resources. Think of compositions as templates that platform teams create once and developers use repeatedly.

## Installing Crossplane and Providers

Start by installing Crossplane in your cluster:

```bash
# Add Crossplane Helm repo
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Install Crossplane
helm install crossplane \
  crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace

# Wait for Crossplane to be ready
kubectl wait --for=condition=Available deployment/crossplane \
  --namespace crossplane-system \
  --timeout=300s
```

Install the AWS provider to manage AWS resources:

```yaml
# provider-aws.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws:v0.47.0
```

Apply the provider:

```bash
kubectl apply -f provider-aws.yaml

# Wait for provider to be healthy
kubectl wait --for=condition=Healthy provider/provider-aws --timeout=300s
```

Configure AWS credentials:

```bash
# Create credentials file
cat > aws-credentials.txt <<EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
EOF

# Create secret
kubectl create secret generic aws-creds \
  -n crossplane-system \
  --from-file=creds=./aws-credentials.txt

# Create ProviderConfig
cat <<EOF | kubectl apply -f -
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
      key: creds
EOF
```

## Creating Your First Composition

Build a composition that lets developers request PostgreSQL databases without knowing RDS details. Start with the composite resource definition:

```yaml
# xrd-postgres.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqlinstances.database.example.com
spec:
  group: database.example.com
  names:
    kind: XPostgreSQLInstance
    plural: xpostgresqlinstances
  claimNames:
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
                    description: "Storage size in GB"
                    default: 20
                    minimum: 20
                    maximum: 1000
                  instanceClass:
                    type: string
                    description: "Instance size: small, medium, or large"
                    enum:
                    - small
                    - medium
                    - large
                    default: small
                  region:
                    type: string
                    description: "AWS region"
                    default: us-west-2
                required:
                - storageGB
            required:
            - parameters
          status:
            type: object
            properties:
              address:
                type: string
              port:
                type: string
```

This XRD defines what developers can request. They specify storage size, instance class, and region. The status shows connection details after provisioning.

Now create the composition that implements the XRD:

```yaml
# composition-postgres.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.aws.database.example.com
  labels:
    provider: aws
    database: postgresql
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance

  resources:
  # Security group for RDS
  - name: rds-security-group
    base:
      apiVersion: ec2.aws.upbound.io/v1beta1
      kind: SecurityGroup
      spec:
        forProvider:
          region: us-west-2
          description: "Security group for RDS instance"
          ingress:
          - fromPort: 5432
            toPort: 5432
            protocol: tcp
            cidrBlocks:
            - "10.0.0.0/8"
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region

  # DB subnet group
  - name: rds-subnet-group
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: SubnetGroup
      spec:
        forProvider:
          region: us-west-2
          description: "Subnet group for RDS"
          subnetIds:
          - subnet-abc123
          - subnet-def456
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region

  # RDS instance
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          region: us-west-2
          engine: postgres
          engineVersion: "15.4"
          instanceClass: db.t3.micro
          allocatedStorage: 20
          dbName: appdb
          username: dbadmin
          passwordSecretRef:
            name: postgres-password
            namespace: crossplane-system
            key: password
          publiclyAccessible: false
          skipFinalSnapshot: true
          vpcSecurityGroupIdSelector:
            matchControllerRef: true
          dbSubnetGroupNameSelector:
            matchControllerRef: true
    patches:
    # Map storage size
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.storageGB
      toFieldPath: spec.forProvider.allocatedStorage

    # Map instance class to RDS instance types
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.instanceClass
      toFieldPath: spec.forProvider.instanceClass
      transforms:
      - type: map
        map:
          small: db.t3.micro
          medium: db.t3.medium
          large: db.r5.large

    # Map region
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region

    # Set status fields
    - type: ToCompositeFieldPath
      fromFieldPath: status.atProvider.address
      toFieldPath: status.address
    - type: ToCompositeFieldPath
      fromFieldPath: status.atProvider.port
      toFieldPath: status.port

    connectionDetails:
    - name: endpoint
      fromConnectionSecretKey: endpoint
    - name: port
      fromConnectionSecretKey: port
    - name: username
      fromConnectionSecretKey: username
    - name: password
      fromConnectionSecretKey: password
```

Apply both resources:

```bash
kubectl apply -f xrd-postgres.yaml
kubectl apply -f composition-postgres.yaml
```

## Using the Composition as a Developer

Developers now provision databases using simple claims:

```yaml
# postgres-claim.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: my-app-db
  namespace: default
spec:
  parameters:
    storageGB: 50
    instanceClass: medium
    region: us-west-2
  compositionSelector:
    matchLabels:
      provider: aws
  writeConnectionSecretToRef:
    name: my-app-db-connection
```

Apply the claim:

```bash
kubectl apply -f postgres-claim.yaml
```

Crossplane creates all underlying resources. Check the status:

```bash
kubectl get postgresqlinstance my-app-db

# Watch progress
kubectl get managed

# Get connection details
kubectl get secret my-app-db-connection -o yaml
```

The connection secret contains everything needed to connect to the database.

## Building Advanced Compositions with Multiple Environments

Support different environments with composition selectors:

```yaml
# composition-postgres-prod.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.aws.production
  labels:
    provider: aws
    database: postgresql
    environment: production
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance

  resources:
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres
          engineVersion: "15.4"
          instanceClass: db.r5.large
          multiAz: true  # Production uses multi-AZ
          backupRetentionPeriod: 30  # 30 days of backups
          storageEncrypted: true
          deletionProtection: true
          # Additional production settings
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.storageGB
      toFieldPath: spec.forProvider.allocatedStorage
    # More patches...
```

Developers select the environment:

```yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: prod-app-db
spec:
  parameters:
    storageGB: 100
    instanceClass: large
  compositionSelector:
    matchLabels:
      provider: aws
      environment: production
  writeConnectionSecretToRef:
    name: prod-db-connection
```

The production composition adds multi-AZ deployment, longer backup retention, and encryption automatically.

## Creating Compositions with Conditional Logic

Use patch transforms for conditional resource creation:

```yaml
# composition-postgres-conditional.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.aws.conditional
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance

  resources:
  # Read replica (only created if replicas > 0)
  - name: rds-replica
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres
          replicateSourceDb: ""  # Set via patch
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.enableReplica
      toFieldPath: metadata.annotations[crossplane.io/external-name]
      transforms:
      - type: string
        string:
          fmt: "%s-replica"

    # Only create if replica is requested
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.enableReplica
      toFieldPath: spec.forProvider.replicateSourceDb
      policy:
        fromFieldPath: Required

  # CloudWatch alarm for high CPU
  - name: cpu-alarm
    base:
      apiVersion: cloudwatch.aws.upbound.io/v1beta1
      kind: MetricAlarm
      spec:
        forProvider:
          comparisonOperator: GreaterThanThreshold
          evaluationPeriods: 2
          metricName: CPUUtilization
          namespace: AWS/RDS
          period: 300
          statistic: Average
          threshold: 80
          alarmDescription: "RDS CPU above 80%"
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.region
      toFieldPath: spec.forProvider.region
```

## Building Storage Compositions

Create a composition for S3 buckets with lifecycle policies:

```yaml
# xrd-bucket.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xobjectstorages.storage.example.com
spec:
  group: storage.example.com
  names:
    kind: XObjectStorage
    plural: xobjectstorages
  claimNames:
    kind: ObjectStorage
    plural: objectstorages
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
                  lifecycleDays:
                    type: integer
                    description: "Days before transitioning to cheaper storage"
                    default: 90
                  publicAccess:
                    type: boolean
                    description: "Allow public read access"
                    default: false
                required:
                - lifecycleDays
```

Implementation composition:

```yaml
# composition-bucket.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xobjectstorages.aws
spec:
  compositeTypeRef:
    apiVersion: storage.example.com/v1alpha1
    kind: XObjectStorage

  resources:
  - name: s3-bucket
    base:
      apiVersion: s3.aws.upbound.io/v1beta1
      kind: Bucket
      spec:
        forProvider:
          region: us-west-2
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.name
      toFieldPath: spec.forProvider.bucket
      transforms:
      - type: string
        string:
          fmt: "app-%s"

  - name: bucket-lifecycle
    base:
      apiVersion: s3.aws.upbound.io/v1beta1
      kind: BucketLifecycleConfiguration
      spec:
        forProvider:
          bucketSelector:
            matchControllerRef: true
          rule:
          - id: transition-to-ia
            status: Enabled
            transition:
            - days: 90
              storageClass: STANDARD_IA
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.lifecycleDays
      toFieldPath: spec.forProvider.rule[0].transition[0].days

  - name: bucket-public-access-block
    base:
      apiVersion: s3.aws.upbound.io/v1beta1
      kind: BucketPublicAccessBlock
      spec:
        forProvider:
          bucketSelector:
            matchControllerRef: true
          blockPublicAcls: true
          blockPublicPolicy: true
          ignorePublicAcls: true
          restrictPublicBuckets: true
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.publicAccess
      toFieldPath: spec.forProvider.blockPublicPolicy
      transforms:
      - type: convert
        convert:
          toType: bool
      - type: match
        match:
          patterns:
          - type: literal
            literal: true
            result: false
          - type: literal
            literal: false
            result: true
```

Developers request storage:

```yaml
apiVersion: storage.example.com/v1alpha1
kind: ObjectStorage
metadata:
  name: user-uploads
spec:
  parameters:
    lifecycleDays: 60
    publicAccess: true
```

## Implementing Composition Functions

Composition functions add dynamic logic:

```yaml
# composition-with-function.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.with-functions
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
          apiVersion: rds.aws.upbound.io/v1beta1
          kind: Instance
          spec:
            forProvider:
              engine: postgres

  - step: auto-ready
    functionRef:
      name: function-auto-ready
```

This uses composition functions for more complex transformations than patches support.

## Summary

Crossplane compositions enable true self-service infrastructure. Platform teams define compositions once, encoding best practices and organizational standards. Developers then provision resources using simple Kubernetes custom resources without needing to understand cloud-specific details. The composition layer handles security groups, networking, monitoring, backups, and all operational concerns automatically. This pattern scales from simple database provisioning to complex multi-resource application platforms.
