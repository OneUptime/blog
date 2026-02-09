# How to Implement Crossplane Usages for Resource Dependency Protection in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Infrastructure-as-Code

Description: Learn how to use Crossplane Usage resources to protect infrastructure from accidental deletion by enforcing dependencies between resources, preventing deletion of databases while applications still use them.

---

Deleting infrastructure while applications still depend on it causes outages. Crossplane Usage resources prevent this by creating explicit dependency relationships. When you try to delete a database that has active users, Crossplane blocks the deletion until all dependent resources are removed first.

This guide shows you how to implement dependency protection using Usages for safe infrastructure management.

## Understanding Crossplane Usages

Usage resources create deletion protection by declaring that one resource uses another. Crossplane checks these relationships before allowing deletions. If Resource A has a Usage pointing to Resource B, Crossplane prevents deleting B until A is gone.

This provides safety without changing application code. You add Usage resources alongside your infrastructure definitions, and Crossplane enforces the dependencies automatically.

## Creating Basic Usage Resources

Protect a database from deletion:

```yaml
# database.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: app-database
spec:
  forProvider:
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.t3.medium
    allocatedStorage: 100
    region: us-west-2
```

```yaml
# application.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: DATABASE_HOST
          value: app-database.example.com
```

```yaml
# usage.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: Usage
metadata:
  name: myapp-uses-database
spec:
  of:
    apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    resourceRef:
      name: app-database
  by:
    apiVersion: apps/v1
    kind: Deployment
    resourceRef:
      name: myapp
      namespace: default
```

Apply resources:

```bash
kubectl apply -f database.yaml
kubectl apply -f application.yaml
kubectl apply -f usage.yaml
```

Now if you try to delete the database:

```bash
kubectl delete instance app-database
# Error: cannot delete resource while usage exists
```

## Implementing Usage in Compositions

Add Usages to composition-managed resources:

```yaml
# composition-with-usage.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xapplications.with-protection
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XApplication

  resources:
  # Database
  - name: database
    base:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      metadata:
        name: database
      spec:
        forProvider:
          engine: postgres
          instanceClass: db.t3.medium
          allocatedStorage: 50

  # Application deployment
  - name: deployment
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: app
            spec:
              replicas: 2
              selector:
                matchLabels:
                  app: myapp
              template:
                metadata:
                  labels:
                    app: myapp
                spec:
                  containers:
                  - name: app
                    image: myapp:latest

  # Usage protection
  - name: database-usage
    base:
      apiVersion: apiextensions.crossplane.io/v1alpha1
      kind: Usage
      spec:
        of:
          apiVersion: rds.aws.upbound.io/v1beta1
          kind: Instance
          resourceSelector:
            matchControllerRef: true
            matchLabels:
              crossplane.io/claim-name: ""
        by:
          apiVersion: kubernetes.crossplane.io/v1alpha2
          kind: Object
          resourceSelector:
            matchControllerRef: true
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: metadata.name
      toFieldPath: spec.of.resourceSelector.matchLabels["crossplane.io/claim-name"]
```

This composition automatically creates Usage resources, protecting databases created through claims.

## Protecting Multiple Dependencies

Create usage for multiple resources:

```yaml
# multi-usage.yaml
apiVersion: v1
kind: List
items:
# Application uses database
- apiVersion: apiextensions.crossplane.io/v1alpha1
  kind: Usage
  metadata:
    name: app-uses-database
  spec:
    of:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      resourceRef:
        name: app-database
    by:
      apiVersion: apps/v1
      kind: Deployment
      resourceRef:
        name: myapp
        namespace: default

# Application uses cache
- apiVersion: apiextensions.crossplane.io/v1alpha1
  kind: Usage
  metadata:
    name: app-uses-cache
  spec:
    of:
      apiVersion: elasticache.aws.upbound.io/v1beta1
      kind: ReplicationGroup
      resourceRef:
        name: app-cache
    by:
      apiVersion: apps/v1
      kind: Deployment
      resourceRef:
        name: myapp
        namespace: default

# Application uses storage
- apiVersion: apiextensions.crossplane.io/v1alpha1
  kind: Usage
  metadata:
    name: app-uses-storage
  spec:
    of:
      apiVersion: s3.aws.upbound.io/v1beta1
      kind: Bucket
      resourceRef:
        name: app-bucket
    by:
      apiVersion: apps/v1
      kind: Deployment
      resourceRef:
        name: myapp
        namespace: default
```

The application cannot be deleted until all infrastructure it uses is removed first, and infrastructure cannot be deleted while the application exists.

## Implementing Cascading Protection

Create dependency chains:

```yaml
# cascading-usage.yaml
# Frontend uses backend
- apiVersion: apiextensions.crossplane.io/v1alpha1
  kind: Usage
  metadata:
    name: frontend-uses-backend
  spec:
    of:
      apiVersion: apps/v1
      kind: Deployment
      resourceRef:
        name: backend
        namespace: production
    by:
      apiVersion: apps/v1
      kind: Deployment
      resourceRef:
        name: frontend
        namespace: production

# Backend uses database
- apiVersion: apiextensions.crossplane.io/v1alpha1
  kind: Usage
  metadata:
    name: backend-uses-database
  spec:
    of:
      apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      resourceRef:
        name: app-database
    by:
      apiVersion: apps/v1
      kind: Deployment
      resourceRef:
        name: backend
        namespace: production

# Backend uses queue
- apiVersion: apiextensions.crossplane.io/v1alpha1
  kind: Usage
  metadata:
    name: backend-uses-queue
  spec:
    of:
      apiVersion: sqs.aws.upbound.io/v1beta1
      kind: Queue
      resourceRef:
        name: task-queue
    by:
      apiVersion: apps/v1
      kind: Deployment
      resourceRef:
        name: backend
        namespace: production
```

This creates a deletion order: frontend → backend → database/queue. You must delete in reverse dependency order.

## Using Resource Selectors

Match resources dynamically:

```yaml
# selector-usage.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: Usage
metadata:
  name: app-uses-any-postgres-db
spec:
  of:
    apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    resourceSelector:
      matchLabels:
        database-type: postgres
        environment: production
        app: myapp
  by:
    apiVersion: apps/v1
    kind: Deployment
    resourceRef:
      name: myapp
      namespace: production
```

This protects all PostgreSQL databases labeled for this app.

## Implementing Time-Based Protection

Add temporary protection during deployments:

```yaml
# temporary-usage.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: Usage
metadata:
  name: deployment-protection
  annotations:
    crossplane.io/expiration: "2026-02-09T12:00:00Z"
spec:
  of:
    apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    resourceRef:
      name: app-database
  by:
    apiVersion: batch/v1
    kind: Job
    resourceRef:
      name: migration-job
      namespace: default
```

The Usage expires after the specified time, removing protection automatically.

## Creating Custom Usage Policies

Build policy around Usage patterns:

```yaml
# usage-policy.yaml
apiVersion: apiextensions.crossplane.io/v1alpha1
kind: CompositeResourceDefinition
metadata:
  name: xprotectedapplications.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XProtectedApplication
    plural: xprotectedapplications
  claimNames:
    kind: ProtectedApplication
    plural: protectedapplications
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
                  applicationName:
                    type: string
                  requiresDatabase:
                    type: boolean
                    default: true
                  requiresCache:
                    type: boolean
                    default: false
                  requiresStorage:
                    type: boolean
                    default: false
```

Composition that creates Usages based on parameters:

```yaml
# protected-app-composition.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: protected-applications
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XProtectedApplication

  resources:
  # Application deployment
  - name: deployment
    base:
      apiVersion: kubernetes.crossplane.io/v1alpha2
      kind: Object
      spec:
        forProvider:
          manifest:
            apiVersion: apps/v1
            kind: Deployment

  # Conditional database usage
  - name: database-usage
    base:
      apiVersion: apiextensions.crossplane.io/v1alpha1
      kind: Usage
      spec:
        of:
          apiVersion: rds.aws.upbound.io/v1beta1
          kind: Instance
        by:
          apiVersion: kubernetes.crossplane.io/v1alpha2
          kind: Object
    readinessChecks:
    - type: None
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.requiresDatabase
      toFieldPath: metadata.annotations["crossplane.io/external-name"]
      policy:
        fromFieldPath: Required

  # Conditional cache usage
  - name: cache-usage
    base:
      apiVersion: apiextensions.crossplane.io/v1alpha1
      kind: Usage
      spec:
        of:
          apiVersion: elasticache.aws.upbound.io/v1beta1
          kind: ReplicationGroup
        by:
          apiVersion: kubernetes.crossplane.io/v1alpha2
          kind: Object
    readinessChecks:
    - type: None
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.parameters.requiresCache
      toFieldPath: metadata.annotations["crossplane.io/external-name"]
      policy:
        fromFieldPath: Required
```

## Monitoring Usage Resources

Create alerts for blocked deletions:

```yaml
# usage-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: usage-alerts
  namespace: monitoring
data:
  rules.yaml: |
    groups:
    - name: crossplane-usage
      interval: 30s
      rules:
      - alert: ResourceDeletionBlocked
        expr: crossplane_usage_blocking_deletion > 0
        for: 5m
        annotations:
          summary: "Resource deletion blocked by usage"
          description: "{{ $labels.resource }} cannot be deleted due to active usages"

      - alert: OrphanedUsage
        expr: crossplane_usage_missing_resource > 0
        for: 10m
        annotations:
          summary: "Usage references missing resource"
          description: "Usage {{ $labels.usage }} references non-existent resource"
```

## Implementing Usage Cleanup

Automatically remove stale Usages:

```yaml
# usage-cleanup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: usage-cleanup
  namespace: crossplane-system
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: usage-cleanup
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Find usages referencing deleted resources
              kubectl get usages -A -o json | jq -r '
                .items[] |
                select(.spec.of.resourceRef != null) |
                "\(.metadata.namespace)/\(.metadata.name) \(.spec.of.kind) \(.spec.of.resourceRef.name)"
              ' | while read usage kind name; do
                if ! kubectl get "$kind" "$name" 2>/dev/null; then
                  echo "Deleting orphaned usage: $usage"
                  kubectl delete usage "$usage"
                fi
              done
          restartPolicy: OnFailure
```

## Summary

Crossplane Usage resources provide declarative dependency protection for infrastructure. By explicitly declaring which resources depend on which infrastructure, you prevent accidental deletions that would cause outages. Usages work with compositions, selectors, and resource chains to create comprehensive protection schemes. This approach adds safety to self-service infrastructure platforms, ensuring applications and their dependencies are deleted in the correct order.
