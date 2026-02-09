# How to Configure Crossplane Claims and XRDs for Platform Team Kubernetes Abstractions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Infrastructure as Code, Platform Engineering, Cloud Native

Description: Learn how to configure Crossplane Claims and Composite Resource Definitions (XRDs) to build platform abstractions that enable self-service infrastructure provisioning for development teams.

---

Platform engineering teams need to provide self-service infrastructure while maintaining control over standards and compliance. Crossplane's Claims and Composite Resource Definitions (XRDs) solve this problem by creating abstractions that hide complexity while enforcing organizational policies. This guide shows you how to build these abstractions effectively.

## Understanding Crossplane Claims and XRDs

Crossplane extends Kubernetes with custom resources that represent cloud infrastructure. XRDs define the schema for composite resources, while Claims provide a namespace-scoped interface that developers use to request infrastructure. This separation allows platform teams to manage implementation details while developers focus on their requirements.

The XRD defines what infrastructure can be provisioned and how it maps to underlying resources. Claims reference XRDs and provide the user-facing API. When a developer creates a Claim, Crossplane automatically provisions the corresponding Composite Resource along with all its managed resources.

## Creating a Basic XRD

Start by defining an XRD that abstracts a PostgreSQL database. This example creates a simple interface that hides cloud provider details from developers.

```yaml
# xrd-postgres-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xpostgresqldatabases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XPostgreSQLDatabase
    plural: xpostgresqldatabases
  claimNames:
    kind: PostgreSQLDatabase
    plural: postgresqldatabases
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
                  size:
                    type: string
                    enum: ["small", "medium", "large"]
                    description: "Database size tier"
                  version:
                    type: string
                    default: "14"
                    description: "PostgreSQL version"
                  highAvailability:
                    type: boolean
                    default: false
                    description: "Enable multi-AZ deployment"
                required:
                  - size
            required:
              - parameters
```

This XRD exposes only the parameters developers need. Platform teams control the actual resource specifications in the Composition.

## Building the Composition

The Composition defines how Crossplane translates the XRD into actual cloud resources. This example creates an AWS RDS instance based on the size parameter.

```yaml
# composition-postgres-aws.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-aws
  labels:
    provider: aws
    database: postgresql
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XPostgreSQLDatabase

  # Define connection secret details
  writeConnectionSecretsToNamespace: crossplane-system

  resources:
  # Create the RDS subnet group
  - name: subnetgroup
    base:
      apiVersion: database.aws.upbound.io/v1beta1
      kind: SubnetGroup
      spec:
        forProvider:
          region: us-west-2
          subnetIdSelector:
            matchLabels:
              network: platform-private

  # Create the RDS instance with size-based configuration
  - name: rdsinstance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          region: us-west-2
          engine: postgres
          skipFinalSnapshot: true
          publiclyAccessible: false
          # These values will be patched based on the claim
          instanceClass: db.t3.small
          allocatedStorage: 20
        writeConnectionSecretToRef:
          namespace: crossplane-system
    patches:
    # Map size to instance class
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.size
      toFieldPath: spec.forProvider.instanceClass
      transforms:
      - type: map
        map:
          small: db.t3.small
          medium: db.t3.large
          large: db.r5.xlarge

    # Map size to storage
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.size
      toFieldPath: spec.forProvider.allocatedStorage
      transforms:
      - type: map
        map:
          small: 20
          medium: 100
          large: 500

    # Set PostgreSQL version
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.version
      toFieldPath: spec.forProvider.engineVersion

    # Enable multi-AZ if requested
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.highAvailability
      toFieldPath: spec.forProvider.multiAz

    # Generate connection details
    connectionDetails:
    - type: FromConnectionSecretKey
      name: endpoint
      fromConnectionSecretKey: endpoint
    - type: FromConnectionSecretKey
      name: username
      fromConnectionSecretKey: username
    - type: FromConnectionSecretKey
      name: password
      fromConnectionSecretKey: password
```

The Composition uses patches to transform simple parameters into detailed resource configurations. This keeps the developer interface simple while maintaining full control over implementation.

## Implementing Advanced Patching Strategies

Crossplane supports multiple patch types for complex transformations. Combine patches to implement sophisticated logic.

```yaml
# Advanced patching example
patches:
# Combine fields to generate names
- type: CombineFromComposite
  combine:
    variables:
    - fromFieldPath: metadata.labels['team']
    - fromFieldPath: metadata.labels['environment']
    strategy: string
    string:
      fmt: "%s-%s-postgres"
  toFieldPath: metadata.annotations['crossplane.io/external-name']

# Use math transforms for capacity calculations
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.connections
  toFieldPath: spec.forProvider.maxConnections
  transforms:
  - type: math
    math:
      multiply: 100

# Convert boolean to string for tags
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.highAvailability
  toFieldPath: spec.forProvider.tags['ha-enabled']
  transforms:
  - type: convert
    convert:
      toType: string
```

## Creating Claims for Developers

Developers interact with Claims, not Composite Resources. Claims provide a namespace-scoped, intuitive interface for requesting infrastructure.

```yaml
# postgres-claim.yaml
apiVersion: platform.example.com/v1alpha1
kind: PostgreSQLDatabase
metadata:
  name: api-database
  namespace: production
  labels:
    team: backend
    environment: production
spec:
  parameters:
    size: medium
    version: "15"
    highAvailability: true
  compositionSelector:
    matchLabels:
      provider: aws
  writeConnectionSecretToRef:
    name: api-db-credentials
```

When this Claim is created, Crossplane automatically provisions all required resources and stores connection details in the specified secret.

## Adding Validation and Default Values

Enhance XRDs with validation rules and default values to prevent configuration errors and simplify the developer experience.

```yaml
# Enhanced XRD with validation
spec:
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            properties:
              parameters:
                properties:
                  size:
                    type: string
                    enum: ["small", "medium", "large"]
                  storageType:
                    type: string
                    enum: ["gp2", "gp3", "io1"]
                    default: "gp3"
                  backupRetention:
                    type: integer
                    minimum: 1
                    maximum: 35
                    default: 7
                  maintenanceWindow:
                    type: string
                    pattern: '^(mon|tue|wed|thu|fri|sat|sun):\d{2}:\d{2}-(mon|tue|wed|thu|fri|sat|sun):\d{2}:\d{2}$'
                    default: "sun:03:00-sun:04:00"
```

These validations run at admission time, providing immediate feedback when developers submit invalid configurations.

## Implementing Multi-Provider Support

Support multiple cloud providers by creating separate Compositions that implement the same XRD interface.

```yaml
# composition-postgres-gcp.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-gcp
  labels:
    provider: gcp
    database: postgresql
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XPostgreSQLDatabase
  resources:
  - name: sqlinstance
    base:
      apiVersion: sql.gcp.upbound.io/v1beta1
      kind: DatabaseInstance
      spec:
        forProvider:
          region: us-central1
          databaseVersion: POSTGRES_14
          settings:
          - tier: db-f1-micro
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.size
      toFieldPath: spec.forProvider.settings[0].tier
      transforms:
      - type: map
        map:
          small: db-f1-micro
          medium: db-n1-standard-2
          large: db-n1-standard-8
```

Developers select the provider using labels in their Claims, enabling multi-cloud deployments with identical interfaces.

## Managing Resource Dependencies

Some resources depend on others being created first. Use resource references to establish dependencies within Compositions.

```yaml
resources:
- name: securitygroup
  base:
    apiVersion: ec2.aws.upbound.io/v1beta1
    kind: SecurityGroup
    spec:
      forProvider:
        region: us-west-2
        description: Database security group

- name: rdsinstance
  base:
    apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    spec:
      forProvider:
        region: us-west-2
        vpcSecurityGroupIdSelector:
          matchControllerRef: true
        # This creates a dependency on the security group
```

The `matchControllerRef` selector automatically references resources created in the same Composite, ensuring correct ordering.

## Monitoring Claim Status

Platform teams need visibility into Claim status. Add status fields to track provisioning progress and expose operational information.

```yaml
# Check claim status
kubectl get postgresqldatabases -n production

# Detailed status information
kubectl describe postgresqldatabase api-database -n production

# View connection secret
kubectl get secret api-db-credentials -n production -o yaml
```

Status conditions indicate whether resources are ready, and events provide troubleshooting information when provisioning fails.

## Implementing Policy and Compliance

Use Composition functions to enforce policies automatically. This example adds required tags based on namespace labels.

```yaml
# composition-with-policy.yaml
spec:
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources: [...]

  - step: auto-tag
    functionRef:
      name: function-auto-tag
    input:
      apiVersion: tag.fn.crossplane.io/v1beta1
      kind: TagConfig
      tags:
        cost-center: from-namespace-label
        compliance-tier: from-claim-annotation
```

Composition functions run in a pipeline, allowing complex transformations that would be difficult with patches alone.

Crossplane Claims and XRDs provide the foundation for platform engineering at scale. By abstracting infrastructure complexity behind simple interfaces, platform teams enable developer self-service while maintaining centralized control over standards and compliance. The combination of XRDs for schema definition, Compositions for implementation, and Claims for consumption creates a powerful pattern for managing infrastructure as code in Kubernetes environments.
