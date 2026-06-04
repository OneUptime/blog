# How to Use Crossplane Usages for Resource Dependency Protection in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Kubernetes, Infrastructure-as-Code

Description: Learn how to use Crossplane Usage resources to protect infrastructure from accidental deletion by enforcing dependencies between resources.

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

apiVersion: rds.aws.m.upbound.io/v1beta1
kind: Instance
metadata:
  name: app-database
  namespace: default
spec:
  forProvider:
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.t3.medium
    allocatedStorage: 100
    username: appuser
    autoGeneratePassword: true
    passwordSecretRef:
      name: app-database-password
      namespace: default
      key: password
    region: us-west-2
```

```yaml
# application.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
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
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  name: myapp-uses-database
  namespace: default
spec:
  of:
    apiVersion: rds.aws.m.upbound.io/v1beta1
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
kubectl delete instance.rds.aws.m.upbound.io app-database -n default
# Error from server (Forbidden): admission webhook "usage.crossplane.io" denied the request
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
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      # Database
      - name: database
        base:
          apiVersion: rds.aws.m.upbound.io/v1beta1
          kind: Instance
          metadata:
            labels:
              usage.crossplane.io/role: database
          spec:
            forProvider:
              engine: postgres
              instanceClass: db.t3.medium
              allocatedStorage: 50
              username: appuser
              autoGeneratePassword: true
              passwordSecretRef:
                name: database-password
                key: password
              region: us-west-2

      # Application deployment
      - name: deployment
        base:
          apiVersion: kubernetes.crossplane.io/v1alpha2
          kind: Object
          metadata:
            labels:
              usage.crossplane.io/role: app
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
          apiVersion: protection.crossplane.io/v1beta1
          kind: Usage
          spec:
            replayDeletion: true
            of:
              apiVersion: rds.aws.m.upbound.io/v1beta1
              kind: Instance
              resourceSelector:
                matchControllerRef: true
                matchLabels:
                  usage.crossplane.io/role: database
            by:
              apiVersion: kubernetes.crossplane.io/v1alpha2
              kind: Object
              resourceSelector:
                matchControllerRef: true
                matchLabels:
                  usage.crossplane.io/role: app
```

This composition automatically creates Usage resources, protecting databases created for the same composite resource.

## Protecting Multiple Dependencies

Create usage for multiple resources:

```yaml
# multi-usage.yaml
apiVersion: v1
kind: List
items:
# Application uses database
- apiVersion: protection.crossplane.io/v1beta1
  kind: Usage
  metadata:
    name: app-uses-database
    namespace: default
  spec:
    of:
      apiVersion: rds.aws.m.upbound.io/v1beta1
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
- apiVersion: protection.crossplane.io/v1beta1
  kind: Usage
  metadata:
    name: app-uses-cache
    namespace: default
  spec:
    of:
      apiVersion: elasticache.aws.m.upbound.io/v1beta1
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
- apiVersion: protection.crossplane.io/v1beta1
  kind: Usage
  metadata:
    name: app-uses-storage
    namespace: default
  spec:
    of:
      apiVersion: s3.aws.m.upbound.io/v1beta1
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

The infrastructure cannot be deleted while the application exists. Deleting the application first removes the using resource and unblocks deletion of the database, cache, or bucket.

## Implementing Cascading Protection

Create dependency chains:

```yaml
# cascading-usage.yaml
apiVersion: v1
kind: List
items:
# Frontend uses backend
- apiVersion: protection.crossplane.io/v1beta1
  kind: Usage
  metadata:
    name: frontend-uses-backend
    namespace: production
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
- apiVersion: protection.crossplane.io/v1beta1
  kind: Usage
  metadata:
    name: backend-uses-database
    namespace: production
  spec:
    of:
      apiVersion: rds.aws.m.upbound.io/v1beta1
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
- apiVersion: protection.crossplane.io/v1beta1
  kind: Usage
  metadata:
    name: backend-uses-queue
    namespace: production
  spec:
    of:
      apiVersion: sqs.aws.m.upbound.io/v1beta1
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
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  name: app-uses-any-postgres-db
  namespace: production
spec:
  of:
    apiVersion: rds.aws.m.upbound.io/v1beta1
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

The selector resolves once to one matching PostgreSQL database. Use labels that identify a single database, or create one Usage per database you need to protect.

## Implementing Time-Based Protection

Add temporary protection during deployments:

```yaml
# temporary-usage.yaml
apiVersion: protection.crossplane.io/v1beta1
kind: Usage
metadata:
  name: deployment-protection
  namespace: default
  annotations:
    cleanup.example.com/delete-after: "2026-02-09T12:00:00Z"
spec:
  of:
    apiVersion: rds.aws.m.upbound.io/v1beta1
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

Crossplane doesn't expire Usage resources automatically. Use your own cleanup controller or scheduled job to delete the Usage after the annotated time.

## Creating Custom Usage Policies

Build policy around Usage patterns:

```yaml
# usage-policy.yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: xprotectedapplications.platform.example.com
spec:
  scope: Namespaced
  group: platform.example.com
  names:
    kind: XProtectedApplication
    plural: xprotectedapplications
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
                required:
                - applicationName
                - databaseName
                - cacheName
                properties:
                  applicationName:
                    type: string
                  databaseName:
                    type: string
                  cacheName:
                    type: string
```

Composition that creates Usages from resource names in the custom API:

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
  mode: Pipeline
  pipeline:
  - step: patch-and-transform
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      resources:
      # Application deployment
      - name: deployment
        base:
          apiVersion: kubernetes.crossplane.io/v1alpha2
          kind: Object
          metadata:
            labels:
              usage.crossplane.io/role: app
          spec:
            forProvider:
              manifest:
                apiVersion: apps/v1
                kind: Deployment

      # Database usage
      - name: database-usage
        base:
          apiVersion: protection.crossplane.io/v1beta1
          kind: Usage
          spec:
            of:
              apiVersion: rds.aws.m.upbound.io/v1beta1
              kind: Instance
              resourceRef:
                name: ""
            by:
              apiVersion: kubernetes.crossplane.io/v1alpha2
              kind: Object
              resourceSelector:
                matchControllerRef: true
                matchLabels:
                  usage.crossplane.io/role: app
        readinessChecks:
        - type: None
        patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.databaseName
          toFieldPath: spec.of.resourceRef.name
          policy:
            fromFieldPath: Required

      # Cache usage
      - name: cache-usage
        base:
          apiVersion: protection.crossplane.io/v1beta1
          kind: Usage
          spec:
            of:
              apiVersion: elasticache.aws.m.upbound.io/v1beta1
              kind: ReplicationGroup
              resourceRef:
                name: ""
            by:
              apiVersion: kubernetes.crossplane.io/v1alpha2
              kind: Object
              resourceSelector:
                matchControllerRef: true
                matchLabels:
                  usage.crossplane.io/role: app
        readinessChecks:
        - type: None
        patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.cacheName
          toFieldPath: spec.of.resourceRef.name
          policy:
            fromFieldPath: Required
```

## Monitoring Usage Resources

Inspect Usage resources and their conditions:

```bash
kubectl get usages.protection.crossplane.io -A
kubectl describe usage.protection.crossplane.io myapp-uses-database -n default
```

Crossplane doesn't publish dedicated `crossplane_usage_*` Prometheus metrics. If you need alerts, export Usage custom resource state with a Kubernetes metrics tool such as kube-state-metrics custom resource state metrics, or alert from Kubernetes events and Crossplane logs.

## Implementing Usage Cleanup

Automatically remove temporary Usages after your custom expiration annotation:

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
              # Delete Usage resources after the custom cleanup timestamp.
              now="$(date -u +%s)"
              kubectl get usages.protection.crossplane.io -A \
                -o go-template='{{range .items}}{{.metadata.namespace}} {{.metadata.name}} {{index .metadata.annotations "cleanup.example.com/delete-after"}}{{"\n"}}{{end}}' |
              while read namespace name delete_after; do
                if [ -z "$delete_after" ]; then
                  continue
                fi

                delete_after_epoch="$(date -u -d "$delete_after" +%s 2>/dev/null || true)"
                if [ -n "$delete_after_epoch" ] && [ "$delete_after_epoch" -le "$now" ]; then
                  echo "Deleting expired usage: $namespace/$name"
                  kubectl delete usage.protection.crossplane.io "$name" -n "$namespace"
                fi
              done
          restartPolicy: OnFailure
```

## Summary

Crossplane Usage resources provide declarative dependency protection for infrastructure. By explicitly declaring which resources depend on which infrastructure, you prevent accidental deletions that would cause outages. Usages work with compositions, selectors, and resource chains to create comprehensive protection schemes. This approach adds safety to self-service infrastructure platforms, ensuring applications and their dependencies are deleted in the correct order.
