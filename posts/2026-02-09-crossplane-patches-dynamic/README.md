# How to Use Crossplane Patches for Dynamic Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Configuration

Description: Learn how to use Crossplane patches to create dynamic, flexible Compositions that map user inputs to cloud resources with transforms, conditionals, and advanced field manipulation.

---

Patches are the glue between Compositions and user input. They map fields from Claims or Composite Resources to managed resources, transforming simple user requests into detailed cloud configurations. Without patches, Compositions are static templates. With patches, they become dynamic engines that adjust resource configuration based on user parameters, environment labels, and complex transformation logic.

Crossplane supports multiple patch types for different scenarios - field path mapping, mathematical transformations, string manipulation, and conditional logic. Understanding patch capabilities determines how flexible and user-friendly your platform APIs become.

## Understanding Patch Types

Crossplane offers several patch types:

**FromCompositeFieldPath**: Copy fields from the Composite Resource to managed resources
**ToCompositeFieldPath**: Copy fields from managed resources back to the Composite Resource
**CombineFromComposite**: Combine multiple fields into one
**CombineToComposite**: Split a field into multiple fields
**PatchSet**: Reusable patch collections

Each patch type serves specific use cases in building flexible Compositions.

## Basic Field Path Patches

Copy simple values between resources:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-basic
spec:
  resources:
  - name: rds-instance
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
      spec:
        forProvider:
          region: us-west-2
          engine: postgres
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.storageGB
      toFieldPath: spec.forProvider.allocatedStorage
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.version
      toFieldPath: spec.forProvider.engineVersion
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels.environment
      toFieldPath: spec.forProvider.tags.Environment
```

Users specify storage and version in their Claim, and patches copy those values to the RDS instance.

## Using Map Transforms

Transform values using lookup maps:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.size
  toFieldPath: spec.forProvider.dbInstanceClass
  transforms:
  - type: map
    map:
      small: db.t3.medium
      medium: db.r5.large
      large: db.r5.2xlarge
      xlarge: db.r5.4xlarge
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.environment
  toFieldPath: spec.forProvider.backupRetentionPeriod
  transforms:
  - type: map
    map:
      development: "1"
      staging: "7"
      production: "30"
```

This abstracts cloud-specific instance types behind user-friendly size names and sets backup retention based on environment.

## Implementing String Transforms

Manipulate strings with transforms:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: metadata.name
  toFieldPath: spec.forProvider.dbName
  transforms:
  - type: string
    string:
      type: Format
      fmt: "%s-database"
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.appName
  toFieldPath: spec.forProvider.tags.Application
  transforms:
  - type: string
    string:
      type: Convert
      convert: ToUpper
```

String transforms enable consistent naming and formatting across resources.

## Using Math Transforms

Perform calculations on numeric values:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.storageGB
  toFieldPath: spec.forProvider.allocatedStorage
  transforms:
  - type: math
    math:
      type: Multiply
      multiply: 1
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.maxConnections
  toFieldPath: spec.forProvider.dbParameterGroupParameters[0].value
  transforms:
  - type: math
    math:
      type: Multiply
      multiply: 2
  - type: string
    string:
      type: Format
      fmt: "%d"
```

Math transforms calculate derived values like doubling max connections for read replicas.

## Combining Multiple Fields

Merge several fields into one:

```yaml
patches:
- type: CombineFromComposite
  combine:
    variables:
    - fromFieldPath: spec.parameters.environment
    - fromFieldPath: metadata.namespace
    - fromFieldPath: metadata.name
    strategy: string
    string:
      fmt: "%s-%s-%s-bucket"
  toFieldPath: metadata.name
- type: CombineFromComposite
  combine:
    variables:
    - fromFieldPath: spec.parameters.region
    - fromFieldPath: spec.parameters.zone
    strategy: string
    string:
      fmt: "%s-%s"
  toFieldPath: spec.forProvider.availabilityZone
```

CombineFromComposite creates consistent resource names and combines region/zone into availability zone.

## Implementing Conditional Patches

Apply patches conditionally:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.highAvailability
  toFieldPath: spec.forProvider.multiAZ
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.highAvailability
  toFieldPath: spec.forProvider.backupRetentionPeriod
  transforms:
  - type: map
    map:
      "true": "30"
      "false": "7"
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.environment
  toFieldPath: spec.forProvider.publiclyAccessible
  transforms:
  - type: map
    map:
      development: "true"
      staging: "false"
      production: "false"
```

Patches adjust configuration based on boolean flags and environment values.

## Using PatchSets for Reusability

Define reusable patch collections:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-with-patchsets
spec:
  patchSets:
  - name: common-labels
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels.environment
      toFieldPath: spec.forProvider.tags.Environment
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels.team
      toFieldPath: spec.forProvider.tags.Team
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.labels.cost-center
      toFieldPath: spec.forProvider.tags.CostCenter
  - name: standard-networking
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.vpcId
      toFieldPath: spec.forProvider.vpcId
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.subnetIds
      toFieldPath: spec.forProvider.dbSubnetGroupName
  resources:
  - name: rds-instance
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
    patches:
    - type: PatchSet
      patchSetName: common-labels
    - type: PatchSet
      patchSetName: standard-networking
  - name: read-replica
    base:
      apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
    patches:
    - type: PatchSet
      patchSetName: common-labels
    - type: PatchSet
      patchSetName: standard-networking
```

PatchSets eliminate duplication when multiple resources need the same patches.

## Patching Connection Secrets

Control connection secret generation:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.writeConnectionSecretToRef.name
  toFieldPath: spec.writeConnectionSecretToRef.name
- type: FromCompositeFieldPath
  fromFieldPath: spec.writeConnectionSecretToRef.namespace
  toFieldPath: spec.writeConnectionSecretToRef.namespace
- type: FromCompositeFieldPath
  fromFieldPath: metadata.labels
  toFieldPath: spec.writeConnectionSecretToRef.labels
connectionDetails:
- name: username
  fromConnectionSecretKey: username
- name: password
  fromConnectionSecretKey: password
- name: endpoint
  fromConnectionSecretKey: endpoint
- name: port
  fromConnectionSecretKey: port
- name: database
  fromConnectionSecretKey: database
- name: connection-string
  type: FromValue
  value: "postgres://$(username):$(password)@$(endpoint):$(port)/$(database)"
```

This gives users control over secret location and formats connection strings.

## Implementing Policy-Based Patches

Enforce policies through patches:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.environment
  toFieldPath: spec.forProvider.storageEncrypted
  transforms:
  - type: map
    map:
      development: "false"
      staging: "true"
      production: "true"
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.environment
  toFieldPath: spec.forProvider.deletionProtection
  transforms:
  - type: map
    map:
      development: "false"
      staging: "false"
      production: "true"
- type: FromCompositeFieldPath
  fromFieldPath: metadata.labels.data-classification
  toFieldPath: spec.forProvider.kmsKeyId
  policy:
    fromFieldPath: Required
  transforms:
  - type: map
    map:
      confidential: "arn:aws:kms:us-west-2:123456789012:key/confidential-key"
      sensitive: "arn:aws:kms:us-west-2:123456789012:key/sensitive-key"
      public: ""
```

This enforces encryption in non-dev environments and requires data classification labels.

## Using ToCompositeFieldPath Patches

Copy status from managed resources to Composite Resource:

```yaml
patches:
- type: ToCompositeFieldPath
  fromFieldPath: status.atProvider.endpoint
  toFieldPath: status.databaseEndpoint
- type: ToCompositeFieldPath
  fromFieldPath: status.atProvider.port
  toFieldPath: status.databasePort
- type: ToCompositeFieldPath
  fromFieldPath: status.conditions[?(@.type=='Ready')].status
  toFieldPath: status.ready
  transforms:
  - type: map
    map:
      "True": "true"
      "False": "false"
```

This surfaces important status information to users checking their Claims.

## Implementing Array Patches

Patch array elements:

```yaml
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.allowedCidrs
  toFieldPath: spec.forProvider.ipConfiguration.authorizedNetworks
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.subnetIds[0]
  toFieldPath: spec.forProvider.dbSubnetGroupSubnetIds[0]
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.subnetIds[1]
  toFieldPath: spec.forProvider.dbSubnetGroupSubnetIds[1]
```

Array patches enable dynamic configuration of network settings and subnet assignments.

## Debugging Patches

Troubleshoot patch issues:

```bash
# Describe composite resource to see applied patches
kubectl describe xpostgresqlinstance my-db

# Check if patches are being applied
kubectl get rdsinstance -o yaml | grep -A 10 "forProvider"

# View composition events
kubectl get events --field-selector involvedObject.kind=XPostgreSQLInstance

# Enable debug logging
kubectl logs -n crossplane-system deployment/crossplane --tail=100 | grep -i patch
```

Add debug annotations to track patch execution:

```yaml
metadata:
  annotations:
    crossplane.io/debug: "true"
```

## Performance Optimization

Optimize patch performance:

```yaml
# Use patch policies to avoid unnecessary updates
patches:
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.storageGB
  toFieldPath: spec.forProvider.allocatedStorage
  policy:
    fromFieldPath: Required

# Avoid deep field paths when possible
- type: FromCompositeFieldPath
  fromFieldPath: spec.parameters.tags
  toFieldPath: spec.forProvider.tags

# Use PatchSets to reduce duplicate patch processing
patchSets:
- name: common
  patches:
  - type: FromCompositeFieldPath
    fromFieldPath: metadata.labels
    toFieldPath: spec.forProvider.tags
```

## Conclusion

Patches transform static Compositions into dynamic, user-friendly platform APIs. By mastering field path mapping, transforms, combine operations, and conditional logic, you create Compositions that adapt to user needs while enforcing organizational policies. The right patches make the difference between a rigid infrastructure template and a flexible self-service platform that developers love to use.
