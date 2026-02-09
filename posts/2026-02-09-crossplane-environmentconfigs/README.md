# How to Configure Crossplane EnvironmentConfigs for Dynamic Composition Patching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Infrastructure-as-Code

Description: Learn how to use Crossplane EnvironmentConfigs to inject dynamic configuration into compositions at runtime, enabling environment-specific patching without duplicating composition definitions across environments.

---

Crossplane compositions define infrastructure templates. But what happens when you need different configurations for development versus production? EnvironmentConfigs solve this by injecting environment-specific data into compositions at runtime, letting you maintain a single composition that adapts based on context.

This guide shows you how to use EnvironmentConfigs for dynamic patching, environment selection, and multi-tenant infrastructure patterns.

## Understanding EnvironmentConfigs

EnvironmentConfigs store key-value data that compositions can reference. Think of them as context objects that provide environment-specific information like region names, instance sizes, or account IDs. Compositions patch resources using this data, creating different infrastructure based on the selected environment.

The key benefit is eliminating composition duplication. Instead of separate production and development compositions, you maintain one composition with EnvironmentConfig references.

## Creating Basic EnvironmentConfigs

Start with environment definitions:

```yaml
# environment-dev.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: EnvironmentConfig
metadata:
  name: development
data:
  environment: development
  region: us-west-2
  instanceType: t3.medium
  minNodes: "1"
  maxNodes: "3"
  desiredNodes: "2"
  enableBackups: "false"
  backupRetentionDays: "7"
  multiAz: "false"
  storageSize: "20"
```

```yaml
# environment-prod.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: EnvironmentConfig
metadata:
  name: production
data:
  environment: production
  region: us-east-1
  instanceType: m5.xlarge
  minNodes: "3"
  maxNodes: "10"
  desiredNodes: "5"
  enableBackups: "true"
  backupRetentionDays: "30"
  multiAz: "true"
  storageSize: "100"
```

Apply both:

```bash
kubectl apply -f environment-dev.yaml
kubectl apply -f environment-prod.yaml
```

## Using EnvironmentConfigs in Compositions

Reference environment data in compositions:

```yaml
# composition-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xpostgresqlinstances.aws
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XPostgreSQLInstance

  environment:
    environmentConfigs:
    - type: Reference
      ref:
        name: production  # Default environment

  resources:
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres
          engineVersion: "15.4"
          username: dbadmin
          passwordSecretRef:
            name: postgres-password
            namespace: crossplane-system
            key: password
    patches:
    # Patch from EnvironmentConfig
    - type: FromEnvironmentFieldPath
      fromFieldPath: region
      toFieldPath: spec.forProvider.region

    - type: FromEnvironmentFieldPath
      fromFieldPath: instanceType
      toFieldPath: spec.forProvider.instanceClass
      transforms:
      - type: map
        map:
          t3.medium: db.t3.medium
          m5.xlarge: db.m5.xlarge

    - type: FromEnvironmentFieldPath
      fromFieldPath: storageSize
      toFieldPath: spec.forProvider.allocatedStorage

    - type: FromEnvironmentFieldPath
      fromFieldPath: multiAz
      toFieldPath: spec.forProvider.multiAz

    - type: FromEnvironmentFieldPath
      fromFieldPath: backupRetentionDays
      toFieldPath: spec.forProvider.backupRetentionPeriod

    # Patch from claim
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.dbName
      toFieldPath: spec.forProvider.dbName
```

Create a claim that selects the environment:

```yaml
# database-claim.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: app-database
spec:
  parameters:
    dbName: appdb
  compositionSelector:
    matchLabels:
      provider: aws
  environmentConfigRefs:
  - name: production
  writeConnectionSecretToRef:
    name: app-database-connection
```

Crossplane applies production settings automatically.

## Implementing Environment Selection Logic

Use selectors to pick environments dynamically:

```yaml
# composition-with-selector.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xapplications.multienv
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XApplication

  environment:
    environmentConfigs:
    - type: Selector
      selector:
        matchLabels:
        - key: environment
          type: FromCompositeFieldPath
          valueFromFieldPath: spec.parameters.environment

  resources:
  - name: eks-nodegroup
    base:
      apiVersion: eks.aws.upbound.io/v1beta1
      kind: NodeGroup
      spec:
        forProvider:
          clusterNameSelector:
            matchControllerRef: true
    patches:
    - type: FromEnvironmentFieldPath
      fromFieldPath: instanceType
      toFieldPath: spec.forProvider.instanceTypes[0]

    - type: FromEnvironmentFieldPath
      fromFieldPath: minNodes
      toFieldPath: spec.forProvider.scalingConfig[0].minSize

    - type: FromEnvironmentFieldPath
      fromFieldPath: maxNodes
      toFieldPath: spec.forProvider.scalingConfig[0].maxSize

    - type: FromEnvironmentFieldPath
      fromFieldPath: desiredNodes
      toFieldPath: spec.forProvider.scalingConfig[0].desiredSize
```

The claim specifies which environment to use:

```yaml
# application-claim.yaml
apiVersion: platform.example.com/v1alpha1
kind: Application
metadata:
  name: my-application
spec:
  parameters:
    environment: production  # Selects production EnvironmentConfig
    appName: myapp
    image: myapp:v1.0.0
```

## Creating Multi-Tenant Configurations

Use EnvironmentConfigs for tenant isolation:

```yaml
# tenant-alpha.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: EnvironmentConfig
metadata:
  name: tenant-alpha
  labels:
    tenant: alpha
data:
  tenantId: alpha
  namespace: tenant-alpha
  awsAccountId: "123456789012"
  budget: "1000"
  quotaCpu: "10"
  quotaMemory: "20Gi"
```

```yaml
# tenant-beta.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: EnvironmentConfig
metadata:
  name: tenant-beta
  labels:
    tenant: beta
data:
  tenantId: beta
  namespace: tenant-beta
  awsAccountId: "210987654321"
  budget: "5000"
  quotaCpu: "50"
  quotaMemory: "100Gi"
```

Composition for multi-tenant resources:

```yaml
# composition-tenant-app.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: tenant-applications
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XTenantApplication

  environment:
    environmentConfigs:
    - type: Selector
      selector:
        matchLabels:
        - key: tenant
          type: FromCompositeFieldPath
          valueFromFieldPath: spec.parameters.tenantId

  resources:
  - name: s3-bucket
    base:
      apiVersion: s3.aws.upbound.io/v1beta1
      kind: Bucket
      spec:
        forProvider:
          region: us-west-2
    patches:
    - type: FromEnvironmentFieldPath
      fromFieldPath: tenantId
      toFieldPath: spec.forProvider.bucket
      transforms:
      - type: string
        string:
          fmt: "tenant-%s-data"

  - name: resource-quota
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: v1
            kind: ResourceQuota
            metadata:
              name: tenant-quota
            spec:
              hard: {}
    patches:
    - type: FromEnvironmentFieldPath
      fromFieldPath: namespace
      toFieldPath: spec.forProvider.manifest.metadata.namespace

    - type: FromEnvironmentFieldPath
      fromFieldPath: quotaCpu
      toFieldPath: spec.forProvider.manifest.spec.hard["requests.cpu"]

    - type: FromEnvironmentFieldPath
      fromFieldPath: quotaMemory
      toFieldPath: spec.forProvider.manifest.spec.hard["requests.memory"]
```

## Combining Multiple EnvironmentConfigs

Reference multiple configs in one composition:

```yaml
# composition-multi-env.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: complex-application
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XComplexApplication

  environment:
    environmentConfigs:
    # Base environment settings
    - type: Reference
      ref:
        name: production
    # Tenant-specific settings
    - type: Selector
      selector:
        matchLabels:
        - key: tenant
          type: FromCompositeFieldPath
          valueFromFieldPath: spec.parameters.tenantId
    # Region-specific settings
    - type: Reference
      ref:
        name: us-west-2-config

  resources:
  - name: application-deployment
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: apps/v1
            kind: Deployment
    patches:
    # From base environment
    - type: FromEnvironmentFieldPath
      fromFieldPath: environment
      toFieldPath: spec.forProvider.manifest.metadata.labels["environment"]

    # From tenant config
    - type: FromEnvironmentFieldPath
      fromFieldPath: tenantId
      toFieldPath: spec.forProvider.manifest.metadata.labels["tenant"]

    # From region config
    - type: FromEnvironmentFieldPath
      fromFieldPath: availabilityZones
      toFieldPath: spec.forProvider.manifest.spec.template.spec.topologySpreadConstraints[0].topologyKey
```

## Implementing Conditional Resource Creation

Use EnvironmentConfig values for conditional logic:

```yaml
# composition-conditional.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: conditional-resources
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: XDatabase

  environment:
    environmentConfigs:
    - type: Reference
      ref:
        name: production

  resources:
  # Primary database (always created)
  - name: primary-db
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres

  # Read replica (only in production)
  - name: read-replica
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      spec:
        forProvider:
          engine: postgres
          replicateSourceDb: ""
    patches:
    - type: FromEnvironmentFieldPath
      fromFieldPath: environment
      toFieldPath: spec.forProvider.replicateSourceDb
      transforms:
      - type: match
        match:
          patterns:
          - type: literal
            literal: production
            result: "primary-db-id"
          - type: literal
            literal: "*"
            result: ""

  # Monitoring (enabled via EnvironmentConfig)
  - name: cloudwatch-alarm
    base:
      apiVersion: cloudwatch.aws.upbound.io/v1beta1
      kind: MetricAlarm
      spec:
        forProvider:
          comparisonOperator: GreaterThanThreshold
          evaluationPeriods: 2
          metricName: CPUUtilization
    readinessChecks:
    - type: None
    patches:
    - type: FromEnvironmentFieldPath
      fromFieldPath: enableMonitoring
      toFieldPath: metadata.annotations["crossplane.io/external-name"]
      policy:
        fromFieldPath: Required
```

## Using EnvironmentConfig with Patch Transforms

Apply complex transformations:

```yaml
# composition-transforms.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: transformed-resources
spec:
  environment:
    environmentConfigs:
    - type: Reference
      ref:
        name: production

  resources:
  - name: rds-instance
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
    patches:
    # Calculate IOPS based on storage size from EnvironmentConfig
    - type: FromEnvironmentFieldPath
      fromFieldPath: storageSize
      toFieldPath: spec.forProvider.iops
      transforms:
      - type: math
        math:
          multiply: 3  # 3 IOPS per GB

    # Generate unique identifiers
    - type: FromEnvironmentFieldPath
      fromFieldPath: environment
      toFieldPath: spec.forProvider.dbInstanceIdentifier
      transforms:
      - type: string
        string:
          type: Format
          fmt: "db-%s-%s"
      - type: string
        string:
          type: TrimSuffix
          trim: "-"

    # Map environment to maintenance windows
    - type: FromEnvironmentFieldPath
      fromFieldPath: environment
      toFieldPath: spec.forProvider.preferredMaintenanceWindow
      transforms:
      - type: map
        map:
          development: "Mon:00:00-Mon:03:00"
          staging: "Tue:00:00-Tue:03:00"
          production: "Sun:00:00-Sun:03:00"
```

## Summary

Crossplane EnvironmentConfigs enable dynamic composition configuration without duplication. By injecting environment-specific values at runtime, you maintain single composition definitions that adapt to different contexts. This pattern scales from simple dev/prod splits to complex multi-tenant scenarios with region-specific settings. Combined with selectors and transforms, EnvironmentConfigs provide the flexibility needed for real-world infrastructure platforms while keeping compositions maintainable.
