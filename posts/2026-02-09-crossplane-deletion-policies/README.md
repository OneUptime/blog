# How to Configure Crossplane Resource Deletion Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Infrastructure-as-Code, Resource Management

Description: Learn how to configure Crossplane deletion policies to control what happens to cloud resources when Kubernetes objects are deleted, preventing accidental data loss.

---

You delete a Kubernetes resource. What happens to the cloud infrastructure it manages? An S3 bucket full of data? A production database? A load balancer serving traffic? Crossplane deletion policies answer this question explicitly, preventing accidents that could take down production systems.

Deletion policies control whether managed resources get deleted or orphaned when their Kubernetes representations disappear. This guide shows you how to configure deletion behavior safely and recover from mistakes.

## Understanding Deletion Policies

Crossplane supports two deletion policies:

**Delete** removes the cloud resource when you delete the Kubernetes object. The RDS database gets destroyed. The VPC and all its networking vanishes. S3 bucket deletion can fail if the bucket is not empty unless the bucket is configured with `forceDestroy`.

**Orphan** preserves the cloud resource. Crossplane stops managing it but leaves it running. The database keeps serving traffic. The bucket retains all data. The VPC stays intact.

The default policy is Delete. This works well for development but can be dangerous in production. Set explicit policies on every managed resource to avoid surprises.

## Setting Deletion Policy on Managed Resources

Configure deletion policy directly on managed resources.

```yaml
# s3-bucket-orphan.yaml

apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: production-data-bucket
spec:
  deletionPolicy: Orphan
  forProvider:
    region: us-west-2
    tags:
      Environment: production
      Managed: crossplane
```

When you delete this bucket resource, Crossplane stops managing it but leaves the actual S3 bucket and its contents intact.

```bash
# Delete the Kubernetes resource
kubectl delete bucket production-data-bucket

# The S3 bucket still exists in AWS
aws s3 ls | grep production-data-bucket
```

Set Delete policy for temporary resources.

```yaml
# test-bucket-delete.yaml
apiVersion: s3.aws.upbound.io/v1beta1
kind: Bucket
metadata:
  name: test-bucket
spec:
  deletionPolicy: Delete
  forProvider:
    region: us-west-2
    forceDestroy: true
    tags:
      Environment: test
```

Deleting this resource destroys the actual bucket and its objects.

## Deletion Policies in Compositions

Set deletion policies for all resources in a composition.
Install the Patch and Transform function as `function-patch-and-transform` before applying these examples.

```yaml
# composition-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: production-postgres
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
        resources:
          # RDS instance should be orphaned
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              metadata:
                annotations:
                  crossplane.io/external-name: prod-postgres-db
              spec:
                deletionPolicy: Orphan
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.r5.large
                  allocatedStorage: 500

          # Security groups can be deleted
          - name: security-group
            base:
              apiVersion: ec2.aws.upbound.io/v1beta1
              kind: SecurityGroup
              spec:
                deletionPolicy: Delete
                forProvider:
                  region: us-west-2
                  description: PostgreSQL access

          # Subnet group can be deleted
          - name: subnet-group
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: SubnetGroup
              spec:
                deletionPolicy: Delete
                forProvider:
                  region: us-west-2
                  subnetIds:
                    - subnet-abc123
                    - subnet-def456
```

Critical data resources use Orphan. Supporting infrastructure uses Delete.

## Environment-Specific Deletion Policies

Use different policies for different environments.

```yaml
# composition-dev-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: dev-postgres
  labels:
    environment: development
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
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                # Development databases can be deleted
                deletionPolicy: Delete
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.small
                  allocatedStorage: 20
---
# composition-prod-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: prod-postgres
  labels:
    environment: production
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
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                # Production databases must be orphaned
                deletionPolicy: Orphan
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.r5.xlarge
                  allocatedStorage: 1000
```

Claims select the appropriate composition based on environment.

```yaml
# database-claim-prod.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstanceClaim
metadata:
  name: app-database
  namespace: production
spec:
  parameters:
    size: large
  compositionSelector:
    matchLabels:
      environment: production
  writeConnectionSecretToRef:
    name: app-db-connection
```

## Overriding Deletion Policy at Claim Level

Let claims override the composition's deletion policy.

```yaml
# composition-flexible-policy.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: flexible-database
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
        resources:
          - name: rds-instance
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                # Default to Delete
                deletionPolicy: Delete
                forProvider:
                  region: us-west-2
                  engine: postgres
                  engineVersion: "15.4"
                  instanceClass: db.t3.medium
            patches:
              # Allow overriding deletion policy from claim
              - type: FromCompositeFieldPath
                fromFieldPath: spec.parameters.deletionPolicy
                toFieldPath: spec.deletionPolicy
```

Update the XRD to accept deletion policy parameter.

```yaml
# xrd-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: postgresqlinstances.database.example.com
spec:
  group: database.example.com
  names:
    kind: PostgreSQLInstance
    plural: postgresqlinstances
  claimNames:
    kind: PostgreSQLInstanceClaim
    plural: postgresqlinstanceclaims
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
                    deletionPolicy:
                      type: string
                      enum: ["Delete", "Orphan"]
                      default: Delete
```

Claims can now specify their deletion policy.

```yaml
# database-claim-orphan.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstanceClaim
metadata:
  name: critical-database
  namespace: production
spec:
  parameters:
    size: large
    deletionPolicy: Orphan
  writeConnectionSecretToRef:
    name: critical-db-connection
```

## Protecting Against Accidental Deletion

Use finalizers to add extra protection.

```yaml
# database-with-finalizer.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstanceClaim
metadata:
  name: protected-database
  namespace: production
  finalizers:
    - protect.example.com/prevent-deletion
spec:
  parameters:
    size: large
  compositionSelector:
    matchLabels:
      environment: production
  writeConnectionSecretToRef:
    name: protected-db-connection
```

Attempting to delete this resource will hang until you remove the finalizer.

```bash
# This will hang waiting for finalizer removal
kubectl delete postgresqlinstanceclaim protected-database -n production

# Remove the finalizer to allow deletion
kubectl patch postgresqlinstanceclaim protected-database -n production \
  --type json -p '[{"op":"remove","path":"/metadata/finalizers"}]'
```

Create an admission webhook to enforce deletion policies.

```yaml
# webhook-deletion-policy.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: crossplane-deletion-policy-validator
webhooks:
  - name: validate.deletion.crossplane.io
    clientConfig:
      service:
        name: policy-webhook
        namespace: crossplane-system
        path: /validate
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: ["database.example.com"]
        apiVersions: ["v1alpha1"]
        resources: ["postgresqlinstances"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Fail
```

The webhook can reject resources that don't have appropriate deletion policies.

## Recovering Orphaned Resources

Import orphaned resources back into Crossplane management.

```bash
# List RDS instances and inspect tags for candidates to import
aws rds describe-db-instances \
  --query 'DBInstances[].{Identifier:DBInstanceIdentifier,Arn:DBInstanceArn}'

aws rds list-tags-for-resource \
  --resource-name arn:aws:rds:us-west-2:123456789012:db:prod-postgres-db
```

Create a new managed resource pointing to the orphaned infrastructure.

```yaml
# import-orphaned-db.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: imported-database
  annotations:
    # Tell Crossplane this resource already exists
    crossplane.io/external-name: prod-postgres-db
spec:
  deletionPolicy: Orphan
  forProvider:
    region: us-west-2
    # Specification must match existing resource
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.r5.large
    allocatedStorage: 500
  managementPolicies: ["Observe"]
```

Crossplane observes the existing resource without modifying it. Add `Create`, `Update`, `Delete`, and `LateInitialize` to `managementPolicies` only when you want Crossplane to manage those actions.

## Cascading Deletion Behavior

Control how composite resources cascade deletions to managed resources.

```yaml
# composite-resource-cascade.yaml
apiVersion: database.example.com/v1alpha1
kind: PostgreSQLInstance
metadata:
  name: cascade-test
spec:
  parameters:
    size: medium
  compositionRef:
    name: production-postgres
  writeConnectionSecretToRef:
    name: cascade-test-connection
```

When you delete the composite resource, Crossplane deletes the composed Kubernetes resources it created. Each child managed resource's `deletionPolicy` or `managementPolicies` controls what happens to the external cloud resource.

## Deletion Policy for Stateful Resources

Handle databases, storage, and other stateful resources carefully.

```yaml
# composition-stateful-app.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: stateful-application
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: StatefulApplication
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
        resources:
          # Database - NEVER auto-delete
          - name: database
            base:
              apiVersion: rds.aws.upbound.io/v1beta1
              kind: Instance
              spec:
                deletionPolicy: Orphan
                forProvider:
                  region: us-west-2
                  engine: postgres
                  skipFinalSnapshot: false
                  finalSnapshotIdentifier: ""
            patches:
              # Set the final snapshot name in case this is later changed to Delete
              - type: CombineFromComposite
                combine:
                  variables:
                    - fromFieldPath: metadata.name
                  strategy: string
                  string:
                    fmt: "%s-final-snapshot"
                toFieldPath: spec.forProvider.finalSnapshotIdentifier

          # S3 bucket - Orphan with versioning enabled
          - name: storage
            base:
              apiVersion: s3.aws.upbound.io/v1beta1
              kind: Bucket
              spec:
                deletionPolicy: Orphan
                forProvider:
                  region: us-west-2

          - name: bucket-versioning
            base:
              apiVersion: s3.aws.upbound.io/v1beta1
              kind: BucketVersioning
              spec:
                deletionPolicy: Orphan
                forProvider:
                  region: us-west-2
                  bucketSelector:
                    matchControllerRef: true
                  versioningConfiguration:
                    - status: Enabled

          # Load balancer - can be deleted
          - name: load-balancer
            base:
              apiVersion: elbv2.aws.upbound.io/v1beta1
              kind: LB
              spec:
                deletionPolicy: Delete
                forProvider:
                  region: us-west-2
                  loadBalancerType: application
```

Stateful resources get Orphan policy. Stateless infrastructure gets Delete.

## Monitoring Deletion Policy Configuration

Track deletion policies across your infrastructure with kube-state-metrics custom resource state metrics or another inventory exporter. Crossplane provider metrics report managed resource existence, readiness, sync state, and deletion timing, but they don't expose a built-in `deletion_policy` label.

```yaml
# prometheus-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crossplane-deletion-policy-alerts
  namespace: monitoring
data:
  rules.yaml: |
    groups:
      - name: crossplane-deletion-policies
        interval: 5m
        rules:
          # Alert on production resources without Orphan policy
          - alert: ProductionResourceDeletable
            expr: |
              kube_customresource_deletion_policy{
                namespace="production",
                deletion_policy!="Orphan"
              } > 0
            for: 1h
            labels:
              severity: warning
            annotations:
              summary: "Production resource has Delete policy"
              description: "Resource {{ $labels.name }} in production can be auto-deleted"

          # Track orphaned resources
          - record: crossplane_orphaned_resources_total
            expr: |
              count(kube_customresource_deletion_policy{deletion_policy="Orphan"})
```

Query deletion policies across resources.

```bash
# List all managed resources with their deletion policies
kubectl get managed -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
KIND:.kind,\
DELETION_POLICY:.spec.deletionPolicy

# Find tagged production resources with Delete policy
kubectl get managed -o json | \
  jq -r '.items[] | select(.spec.forProvider.tags.Environment=="production" and .spec.deletionPolicy=="Delete") | .metadata.name'

# Count resources by deletion policy
kubectl get managed -A -o json | \
  jq -r '.items | group_by(.spec.deletionPolicy) | map({policy: .[0].spec.deletionPolicy, count: length})'
```

## Best Practices for Deletion Policies

Always set explicit deletion policies. Don't rely on defaults.

Use Orphan for production databases, storage, and anything with persistent state.

Use Delete for networking, compute, and other recreatable resources.

Create pre-deletion snapshots for stateful resources before allowing deletion.

Implement admission webhooks to enforce policy standards.

Test deletion behavior in non-production environments first.

Document why each resource has its specific deletion policy.

## Changing Deletion Policy on Existing Resources

Update the policy on a running resource.

```bash
# Check current policy
kubectl get bucket production-data -o jsonpath='{.spec.deletionPolicy}'

# Update to Orphan
kubectl patch bucket production-data --type merge -p '{"spec":{"deletionPolicy":"Orphan"}}'

# Verify the change
kubectl get bucket production-data -o jsonpath='{.spec.deletionPolicy}'
```

The change takes effect immediately. Future deletions will respect the new policy.

## Summary

Crossplane deletion policies control what happens to cloud resources when Kubernetes objects are deleted. Use Orphan to preserve resources and Delete to remove them. Set explicit policies on every managed resource to prevent accidents.

Production databases and storage should use Orphan policy. Networking and compute can use Delete. Test deletion behavior thoroughly before deploying to production. Use admission webhooks to enforce policy standards.

Deletion policies protect against costly mistakes. A misconfigured policy could destroy a production database or delete terabytes of data. Configure policies intentionally and verify them regularly. Your infrastructure depends on getting this right.
