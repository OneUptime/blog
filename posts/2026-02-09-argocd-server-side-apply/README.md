# How to configure ArgoCD server-side apply for improved resource management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, Server-Side Apply, GitOps, Resource Management

Description: Learn how to enable and configure ArgoCD server-side apply to eliminate field ownership conflicts, improve diff accuracy, and enable better collaboration between ArgoCD and other Kubernetes operators.

---

Kubernetes introduced server-side apply in version 1.16 as a more robust alternative to client-side apply. Traditional client-side apply can cause field ownership conflicts when multiple controllers modify the same resource. Server-side apply solves this by tracking field ownership at the API server level, making it possible for ArgoCD and other operators to safely manage different fields of the same resource.

This guide shows you how to configure ArgoCD to use server-side apply, understand its benefits, and implement it effectively in production environments.

## Understanding server-side apply vs client-side apply

Client-side apply (the default in ArgoCD) has limitations:

- Last-write-wins behavior causes conflicts
- Entire resource is owned by a single controller
- Strategic merge patches can produce unexpected results
- Difficult to coordinate with operators and controllers
- Inaccurate diffs when fields are modified externally

Server-side apply provides:

- Field-level ownership tracking
- Conflict detection and resolution
- Better collaboration between controllers
- More accurate status and diff information
- Support for custom resources without strategic merge patch metadata

## Enabling server-side apply in ArgoCD

Enable server-side apply globally in the argocd-cm ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation
  resource.respectRBAC: "true"
  # Enable server-side apply globally
  resource.server-side-diff: "true"
```

After updating the ConfigMap, restart ArgoCD components:

```bash
kubectl rollout restart deployment argocd-application-controller -n argocd
kubectl rollout restart deployment argocd-repo-server -n argocd
kubectl rollout restart deployment argocd-server -n argocd
```

## Enabling server-side apply per application

For gradual rollout, enable server-side apply on specific applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/web-app.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
```

The `ServerSideApply=true` sync option enables server-side apply for this application only.

## Configuring server-side apply for specific resources

Enable server-side apply for individual resources using annotations:

```yaml
# deployment.yaml in your Git repository
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: myorg/api:v1.2.3
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

This allows mixing server-side and client-side apply within the same application.

## Handling field ownership with server-side apply

Server-side apply tracks which manager owns which fields. View field ownership:

```bash
# View managed fields for a resource
kubectl get deployment api-server -n production -o yaml

# Output shows managedFields section
# managedFields:
# - apiVersion: apps/v1
#   fieldsType: FieldsV1
#   fieldsV1:
#     f:metadata:
#       f:annotations:
#         f:kubectl.kubernetes.io/last-applied-configuration: {}
#     f:spec:
#       f:replicas: {}
#       f:template:
#         f:spec:
#           f:containers:
#             k:{"name":"api"}:
#               f:image: {}
#   manager: argocd-controller
#   operation: Apply
#   time: "2026-02-09T10:30:00Z"
```

Multiple managers can own different fields of the same resource:

```yaml
# HorizontalPodAutoscaler managing replicas
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

With server-side apply, ArgoCD manages most fields while HPA manages the `replicas` field. Configure ArgoCD to ignore HPA-managed fields:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/web-app.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
  ignoreDifferences:
    - group: apps
      kind: Deployment
      name: api-server
      jsonPointers:
        - /spec/replicas
```

## Working with custom resources and operators

Server-side apply works particularly well with custom resources:

```yaml
# Custom resource managed by ArgoCD and an operator
apiVersion: database.example.com/v1
kind: PostgresCluster
metadata:
  name: production-db
  namespace: databases
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true
spec:
  # ArgoCD manages desired state
  version: "14"
  instances: 3
  storage:
    size: 100Gi
    storageClass: fast-ssd
  backup:
    enabled: true
    schedule: "0 2 * * *"
# status:
#   # Operator manages status
#   phase: Running
#   ready: 3/3
#   primaryEndpoint: production-db-primary.databases.svc
```

ArgoCD manages `spec` fields while the operator manages `status` fields without conflicts.

## Implementing force sync with server-side apply

Sometimes you need to force ownership of fields. Use the Replace sync option:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: force-ownership-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
      - Replace=true  # Force field ownership
```

The Replace option makes ArgoCD take ownership of all fields, potentially overwriting changes from other managers. Use this carefully.

## Handling conflicts with server-side apply

When conflicts occur, ArgoCD detects them:

```bash
# View application status
argocd app get my-app

# Output shows conflict information
# Sync Status:      OutOfSync
# Health Status:    Healthy
# Last Sync Result: Failed
# Message:          Conflict: field spec.replicas owned by hpa-controller, cannot be modified by argocd-controller
```

Resolve conflicts by configuring ArgoCD to ignore the conflicting field:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # Ignore HPA-managed field
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
```

Or transfer ownership explicitly by removing the field from Git:

```yaml
# In Git: Remove replicas field, let HPA manage it
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  # replicas field removed - HPA will manage it
  selector:
    matchLabels:
      app: api-server
```

## Combining server-side apply with sync waves

Use server-side apply with sync waves for ordered deployments:

```yaml
# database.yaml - Wave 0
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
    argocd.argoproj.io/sync-options: ServerSideApply=true
spec:
  selector:
    app: database
  ports:
    - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
    argocd.argoproj.io/sync-options: ServerSideApply=true
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
        - name: postgres
          image: postgres:14
---
# application.yaml - Wave 1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/sync-options: ServerSideApply=true
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: myorg/api:v1.2.3
```

Server-side apply ensures each wave applies cleanly without ownership conflicts.

## Implementing server-side apply with ApplicationSets

Enable server-side apply across multiple applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - service: api
          - service: auth
          - service: notification
  template:
    metadata:
      name: '{{service}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/services.git
        targetRevision: main
        path: '{{service}}/k8s'
      destination:
        server: https://kubernetes.default.svc
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - ServerSideApply=true
          - CreateNamespace=true
```

All generated applications use server-side apply automatically.

## Monitoring server-side apply operations

Track server-side apply metrics:

```bash
# Check sync operation details
argocd app get my-app --show-operation

# View resource-level sync results
argocd app resources my-app

# Check for server-side apply in sync options
kubectl get application my-app -n argocd \
  -o jsonpath='{.spec.syncPolicy.syncOptions}'
```

Monitor ArgoCD controller logs for server-side apply operations:

```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller \
  | grep "server-side"
```

## Migrating from client-side to server-side apply

Migrate existing applications gradually:

1. **Enable server-side diff first:**

```yaml
# argocd-cm ConfigMap
data:
  resource.server-side-diff: "true"
```

This makes ArgoCD use server-side apply for diffs but still uses client-side for actual syncs.

2. **Test on non-production applications:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dev-app
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
```

3. **Monitor for conflicts and issues:**

```bash
# Watch for sync failures
argocd app list --selector environment=dev

# Check detailed sync results
argocd app get dev-app --show-operation
```

4. **Roll out to production:**

```yaml
# Update production apps one by one
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-app
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
```

5. **Enable globally after validation:**

```yaml
# argocd-cm ConfigMap
data:
  application.resourceTrackingMethod: annotation
  resource.server-side-diff: "true"
  # Consider enabling globally
  sync.defaultSyncOptions: ServerSideApply=true
```

## Troubleshooting server-side apply issues

Common issues:

**Immutable field errors:**

Some fields cannot be changed after creation. Server-side apply makes this more explicit:

```
Error: field spec.clusterIP is immutable
```

Solution: Delete and recreate the resource, or use Replace=true:

```yaml
syncOptions:
  - ServerSideApply=true
  - Replace=true
```

**Field ownership conflicts:**

```
Error: conflict: field managed by other manager
```

Solution: Add the field to ignoreDifferences or remove it from Git.

**Custom resource validation failures:**

Server-side apply enforces CRD validation more strictly:

```
Error: validation failed: spec.replicas must be >= 1
```

Solution: Fix the manifest to match CRD requirements.

## Best practices for server-side apply

1. **Use annotation-based tracking:** Server-side apply works best with annotation tracking
2. **Enable gradually:** Start with dev/staging before production
3. **Document field ownership:** Clearly define which controller manages which fields
4. **Monitor for conflicts:** Set up alerts for sync failures due to conflicts
5. **Coordinate with operators:** Ensure operators and ArgoCD manage different fields
6. **Test migrations thoroughly:** Validate behavior before wide rollout
7. **Use ignore differences strategically:** Don't over-ignore, fix root causes when possible

## Conclusion

Server-side apply represents a significant improvement in how ArgoCD manages Kubernetes resources. By enabling field-level ownership tracking and better conflict detection, server-side apply makes it possible to safely coordinate multiple controllers managing the same resources. As you implement server-side apply in your ArgoCD deployments, you'll experience fewer sync conflicts, more accurate diffs, and better collaboration with Kubernetes operators and other management tools.
