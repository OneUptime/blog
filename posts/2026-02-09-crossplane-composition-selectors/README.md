# How to Use Crossplane Composition Selectors for Multi-Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Multi-Cloud, Infrastructure-as-Code, Composition

Description: Learn how to use Crossplane composition selectors to dynamically route infrastructure claims to different providers and configurations based on labels and requirements.

---

You define a database claim. Should it provision on AWS, Azure, or GCP? Should it use RDS, CloudSQL, or a self-hosted Postgres on Kubernetes? Crossplane composition selectors answer these questions at claim time without changing the API contract.

Composition selectors let you maintain multiple implementations of the same interface. Claims use label selectors to pick which composition handles their provisioning. This enables multi-cloud strategies, environment-specific configurations, and gradual migrations between infrastructure patterns.

## Understanding Composition Selection

When you create a composite resource claim, Crossplane must choose which composition to use. The composition selector uses label matching to make this decision. You tag compositions with labels like provider, region, or environment. Claims specify matching criteria. Crossplane selects the first composition that satisfies all requirements.

This pattern decouples what you want from how you get it. Platform teams maintain multiple compositions implementing the same XRD. Application teams pick the right one through selectors without understanding the underlying complexity.

## Basic Composition Selection

Start with multiple compositions for the same composite resource type.

```yaml
# xrd-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Database
    plural: databases
  claimNames:
    kind: DatabaseClaim
    plural: databaseclaims
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
                    engine:
                      type: string
                      enum: ["postgres", "mysql"]
                  required:
                    - size
                    - engine
              required:
                - parameters
```

Create an AWS composition.

```yaml
# composition-aws-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-postgres-database
  labels:
    provider: aws
    engine: postgres
    region: us-west-2
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
            allocatedStorage: 100
      patches:
        - fromFieldPath: spec.parameters.size
          toFieldPath: spec.forProvider.instanceClass
          transforms:
            - type: map
              map:
                small: db.t3.small
                medium: db.t3.medium
                large: db.r5.xlarge
```

Create a GCP composition.

```yaml
# composition-gcp-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: gcp-postgres-database
  labels:
    provider: gcp
    engine: postgres
    region: us-central1
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: cloudsql-instance
      base:
        apiVersion: sql.gcp.upbound.io/v1beta1
        kind: DatabaseInstance
        spec:
          forProvider:
            region: us-central1
            databaseVersion: POSTGRES_15
            settings:
              - tier: db-custom-2-7680
      patches:
        - fromFieldPath: spec.parameters.size
          toFieldPath: spec.forProvider.settings[0].tier
          transforms:
            - type: map
              map:
                small: db-f1-micro
                medium: db-custom-2-7680
                large: db-custom-4-15360
```

The claim uses a selector to pick AWS.

```yaml
# database-claim-aws.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: app-database
  namespace: production
spec:
  parameters:
    size: medium
    engine: postgres
  compositionSelector:
    matchLabels:
      provider: aws
      engine: postgres
  writeConnectionSecretToRef:
    name: app-db-connection
```

Crossplane matches the claim against compositions. The aws-postgres-database composition has matching labels, so it handles provisioning.

## Multi-Region Selection

Route claims to region-specific compositions.

```yaml
# composition-aws-us-west.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-postgres-us-west
  labels:
    provider: aws
    engine: postgres
    region: us-west-2
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
            allocatedStorage: 100
---
# composition-aws-eu-west.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-postgres-eu-west
  labels:
    provider: aws
    engine: postgres
    region: eu-west-1
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: eu-west-1
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
            allocatedStorage: 100
```

Claims specify their region preference.

```yaml
# database-claim-eu.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: app-database-eu
  namespace: production
spec:
  parameters:
    size: medium
    engine: postgres
  compositionSelector:
    matchLabels:
      provider: aws
      engine: postgres
      region: eu-west-1
  writeConnectionSecretToRef:
    name: app-db-eu-connection
```

## Environment-Based Selection

Use different compositions for development versus production.

```yaml
# composition-dev-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: dev-postgres-database
  labels:
    environment: development
    engine: postgres
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    # Development uses smaller, cheaper instances
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
            storageType: gp2
            backupRetentionPeriod: 1
            multiAz: false
            publiclyAccessible: true
---
# composition-prod-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: prod-postgres-database
  labels:
    environment: production
    engine: postgres
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    # Production uses HA configuration
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.r5.xlarge
            allocatedStorage: 500
            storageType: io1
            iops: 3000
            backupRetentionPeriod: 30
            multiAz: true
            publiclyAccessible: false
            enabledCloudwatchLogsExports:
              - postgresql
```

Claims pick based on environment.

```yaml
# database-claim-dev.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: test-database
  namespace: development
spec:
  parameters:
    size: small
    engine: postgres
  compositionSelector:
    matchLabels:
      environment: development
      engine: postgres
  writeConnectionSecretToRef:
    name: test-db-connection
```

## Complex Matching with Multiple Labels

Combine multiple label requirements.

```yaml
# composition-aws-prod-postgres.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-prod-postgres-us-west
  labels:
    provider: aws
    environment: production
    engine: postgres
    region: us-west-2
    tier: premium
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.r5.2xlarge
            allocatedStorage: 1000
            storageType: io1
            iops: 5000
            multiAz: true
            enabledCloudwatchLogsExports:
              - postgresql
```

The claim must match all labels.

```yaml
# database-claim-premium.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: premium-database
  namespace: production
spec:
  parameters:
    size: large
    engine: postgres
  compositionSelector:
    matchLabels:
      provider: aws
      environment: production
      engine: postgres
      region: us-west-2
      tier: premium
  writeConnectionSecretToRef:
    name: premium-db-connection
```

All five labels must match for this composition to be selected.

## Default Compositions

Specify a default composition when no selector is provided.

```yaml
# composition-default-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: default-postgres-database
  labels:
    crossplane.io/default: "true"
    engine: postgres
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
            allocatedStorage: 100
```

Claims without a selector use the default.

```yaml
# database-claim-default.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: default-database
  namespace: production
spec:
  parameters:
    size: medium
    engine: postgres
  # No compositionSelector specified, uses default
  writeConnectionSecretToRef:
    name: default-db-connection
```

## Dynamic Selection Based on Claim Parameters

Use composition revisions to route based on claim parameters.

```yaml
# xrd-with-provider-param.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: databases.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: Database
    plural: databases
  claimNames:
    kind: DatabaseClaim
    plural: databaseclaims
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
                    engine:
                      type: string
                      enum: ["postgres", "mysql"]
                    provider:
                      type: string
                      enum: ["aws", "gcp", "azure"]
                  required:
                    - size
                    - engine
                    - provider
              required:
                - parameters
```

Create compositions for each provider with matching labels.

```yaml
# composition-aws.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: aws-database
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
---
# composition-gcp.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: gcp-database
  labels:
    provider: gcp
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: cloudsql-instance
      base:
        apiVersion: sql.gcp.upbound.io/v1beta1
        kind: DatabaseInstance
        spec:
          forProvider:
            region: us-central1
            databaseVersion: POSTGRES_15
```

Use patches to set the selector dynamically.

```yaml
# database-claim-dynamic.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: dynamic-database
  namespace: production
spec:
  parameters:
    size: medium
    engine: postgres
    provider: gcp
  compositionSelector:
    matchLabels:
      provider: gcp
  writeConnectionSecretToRef:
    name: dynamic-db-connection
```

## Migration Between Compositions

Gradually migrate resources from one composition to another.

```yaml
# composition-legacy.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: legacy-postgres-database
  labels:
    version: v1
    engine: postgres
    deprecated: "true"
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: ec2-postgres
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            instanceType: t3.large
---
# composition-new.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: new-postgres-database
  labels:
    version: v2
    engine: postgres
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: Database
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
```

Update claims gradually by changing selectors.

```yaml
# Before migration
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: migrating-database
  namespace: production
spec:
  parameters:
    size: medium
    engine: postgres
  compositionSelector:
    matchLabels:
      version: v1
      engine: postgres
  writeConnectionSecretToRef:
    name: db-connection
---
# After migration
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: migrating-database
  namespace: production
spec:
  parameters:
    size: medium
    engine: postgres
  compositionSelector:
    matchLabels:
      version: v2
      engine: postgres
  writeConnectionSecretToRef:
    name: db-connection
```

## Composition Selection with Match Expressions

Use more complex matching logic.

```yaml
# database-claim-expressions.yaml
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: advanced-database
  namespace: production
spec:
  parameters:
    size: large
    engine: postgres
  compositionSelector:
    matchLabels:
      engine: postgres
    matchExpressions:
      - key: provider
        operator: In
        values:
          - aws
          - azure
      - key: environment
        operator: NotIn
        values:
          - deprecated
      - key: tier
        operator: Exists
  writeConnectionSecretToRef:
    name: advanced-db-connection
```

This selects compositions that have engine=postgres AND provider in (aws, azure) AND environment not in (deprecated) AND have a tier label.

## Observability for Selection

Monitor which compositions get selected.

```yaml
# prometheus-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crossplane-composition-rules
  namespace: monitoring
data:
  crossplane.rules: |
    groups:
      - name: crossplane-compositions
        interval: 30s
        rules:
          # Track composition usage
          - record: crossplane_composition_selection_total
            expr: |
              count by (composition_name, provider, environment) (
                crossplane_composite_resource_info
              )

          # Alert on failed selections
          - alert: CrossplaneCompositionSelectionFailed
            expr: |
              crossplane_composite_resource_condition{type="Synced",status="False"} == 1
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Crossplane composition selection failed"
              description: "Composite {{ $labels.name }} cannot find matching composition"
```

Check composition selection status.

```bash
# View which composition was selected
kubectl get database app-database -o jsonpath='{.spec.compositionRef.name}'

# Check for selection failures
kubectl describe database app-database | grep -A 10 Conditions

# List all compositions available for selection
kubectl get compositions -l engine=postgres

# View composition labels
kubectl get composition aws-postgres-database -o jsonpath='{.metadata.labels}'
```

## Summary

Crossplane composition selectors enable flexible infrastructure routing. Label compositions with provider, region, environment, and other metadata. Claims use matchLabels to select the appropriate composition. This pattern supports multi-cloud strategies, environment isolation, and gradual migrations.

Define multiple compositions implementing the same XRD. Tag them with descriptive labels. Claims specify selection criteria without understanding implementation details. Crossplane matches claims to compositions at runtime based on label matching.

Use selectors for provider choice, region placement, environment configuration, and version migration. Complex match expressions support sophisticated routing logic. Monitor selection metrics to track composition usage and catch configuration errors early.
