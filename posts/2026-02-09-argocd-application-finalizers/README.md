# How to use ArgoCD Application finalizers for cleanup operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, Resource Management, Cleanup

Description: Master ArgoCD Application finalizers to control resource cleanup behavior, implement cascading deletion strategies, and ensure proper resource lifecycle management when deleting applications.

---

When you delete an ArgoCD Application, you need to decide what happens to the Kubernetes resources it manages. Should they be deleted automatically, or should they remain in the cluster? ArgoCD uses Kubernetes finalizers to control this behavior, providing fine-grained control over resource cleanup during application deletion.

Understanding and properly configuring Application finalizers is critical for avoiding orphaned resources, preventing accidental deletions, and implementing safe application lifecycle management. This guide covers everything you need to know about ArgoCD finalizers and how to use them effectively.

## Understanding Kubernetes finalizers

Finalizers are namespaced keys that tell Kubernetes to wait until specific conditions are met before fully deleting a resource. When an object has finalizers, Kubernetes marks it for deletion but doesn't remove it until all finalizers are cleared.

In ArgoCD, finalizers control whether managed resources should be deleted when the Application itself is deleted.

## ArgoCD finalizer types

ArgoCD supports two main finalizers:

**resources-finalizer.argocd.argoproj.io:**
This finalizer ensures that all resources managed by the Application are deleted before the Application itself is removed. This is the cascading delete behavior.

**resources-finalizer.argocd.argoproj.io/background:**
This finalizer performs deletion in the background, allowing the Application to be removed immediately while resources are cleaned up asynchronously.

By default, ArgoCD applications include the standard resources finalizer.

## Default Application with finalizer

Here's what a typical Application looks like with the default finalizer:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-application
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp.git
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

When you delete this Application, ArgoCD will:
1. Delete all resources managed by the Application
2. Wait for all resources to be fully removed
3. Remove the finalizer from the Application
4. Delete the Application object itself

## Removing finalizers for resource preservation

If you want to delete the Application but keep the resources in the cluster, remove the finalizer before deletion:

```bash
# Remove finalizer using kubectl
kubectl patch app my-application -n argocd \
  --type json \
  --patch='[ { "op": "remove", "path": "/metadata/finalizers" } ]'

# Then delete the application
kubectl delete app my-application -n argocd
```

Or use the ArgoCD CLI with the non-cascading delete flag:

```bash
# Delete application without deleting resources
argocd app delete my-application --cascade=false
```

This approach is useful when:
- You're migrating applications between ArgoCD instances
- You want to temporarily remove an Application from ArgoCD management
- You're decommissioning ArgoCD but keeping the workloads
- You need to preserve resources for forensic analysis

## Creating applications without finalizers

You can create Applications without finalizers from the start:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: stateful-app
  namespace: argocd
  # No finalizers specified
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/stateful-app.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: databases
```

When you delete this Application, ArgoCD immediately removes the Application object without touching any of the managed resources.

## Using background finalizer for async deletion

For applications with many resources, background deletion prevents the Application deletion from blocking:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: large-application
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io/background
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/large-app.git
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

With the background finalizer:
1. The Application deletion request returns immediately
2. ArgoCD starts deleting resources in the background
3. The Application object is removed after all resources are deleted

This is particularly useful for applications managing hundreds of resources where synchronous deletion would timeout.

## Implementing selective resource cleanup

You can combine finalizers with resource annotations to implement selective cleanup:

```yaml
# Application definition
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mixed-lifecycle-app
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
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
      - PruneLast=true
```

In your manifests, mark resources that should be preserved:

```yaml
# Resource that should survive Application deletion
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
  namespace: production
  annotations:
    argocd.argoproj.io/sync-options: "Prune=false"
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
```

The `Prune=false` annotation tells ArgoCD not to delete this resource during pruning, effectively preserving it even when the Application is deleted with a finalizer.

## Handling stuck finalizers

Sometimes Applications get stuck in a deleting state because finalizers cannot complete. This happens when:
- Managed resources fail to delete
- The destination cluster is unreachable
- Resources have their own finalizers blocking deletion

To diagnose stuck finalizers:

```bash
# Check Application status
kubectl get app my-application -n argocd -o yaml

# Look for deletion timestamp and remaining finalizers
kubectl get app my-application -n argocd -o jsonpath='{.metadata.deletionTimestamp}'
kubectl get app my-application -n argocd -o jsonpath='{.metadata.finalizers}'

# Check which resources are still present
argocd app resources my-application
```

To resolve stuck finalizers:

```bash
# Option 1: Force delete specific resources blocking cleanup
kubectl delete deployment stuck-deployment -n production --force --grace-period=0

# Option 2: Manually remove the finalizer from the Application
kubectl patch app my-application -n argocd \
  --type json \
  --patch='[ { "op": "remove", "path": "/metadata/finalizers" } ]'
```

Be cautious with manual finalizer removal, as it may orphan resources in the cluster.

## Implementing cleanup hooks with finalizers

Combine finalizers with PreDelete hooks for complex cleanup workflows:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-with-cleanup-hooks
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

In your manifests, define cleanup jobs:

```yaml
# cleanup-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cleanup-job
  namespace: production
  annotations:
    argocd.argoproj.io/hook: PreDelete
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: cleanup
          image: myorg/cleanup-tool:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Backing up data..."
              kubectl exec database-0 -- mysqldump --all-databases > /backup/final.sql
              aws s3 cp /backup/final.sql s3://backups/final-$(date +%s).sql
              echo "Cleanup complete"
```

This job runs before the Application resources are deleted, allowing you to perform backup or notification tasks.

## Managing finalizers at scale

For multiple applications, use automation to manage finalizers:

```bash
# Add finalizers to all Applications in a project
for app in $(argocd app list -p my-project -o name); do
  kubectl patch app $app -n argocd \
    --type merge \
    --patch '{"metadata":{"finalizers":["resources-finalizer.argocd.argoproj.io"]}}'
done

# Remove finalizers from all Applications (dangerous!)
for app in $(argocd app list -p my-project -o name); do
  kubectl patch app $app -n argocd \
    --type json \
    --patch='[ { "op": "remove", "path": "/metadata/finalizers" } ]'
done

# Switch to background finalizers for large applications
for app in $(argocd app list -p my-project -o name); do
  resource_count=$(argocd app resources $app | wc -l)
  if [ $resource_count -gt 100 ]; then
    kubectl patch app $app -n argocd \
      --type merge \
      --patch '{"metadata":{"finalizers":["resources-finalizer.argocd.argoproj.io/background"]}}'
  fi
done
```

## Finalizer best practices

Follow these guidelines for effective finalizer management:

1. **Keep finalizers by default:** Always include the standard finalizer unless you have a specific reason not to.

2. **Document no-finalizer applications:** If you create Applications without finalizers, document why in annotations:

```yaml
metadata:
  annotations:
    argocd.example.com/no-finalizer-reason: "Resources managed by external operator"
```

3. **Use background finalizers for large apps:** Applications with more than 100 resources should use background finalizers.

4. **Test deletion behavior:** In non-production environments, test Application deletion to verify cleanup behavior.

5. **Implement monitoring:** Alert on Applications stuck in deleting state:

```bash
# Check for Applications deleting for more than 5 minutes
kubectl get app -n argocd -o json | \
  jq -r '.items[] | select(.metadata.deletionTimestamp != null) |
  select((now - (.metadata.deletionTimestamp | fromdateiso8601)) > 300) |
  .metadata.name'
```

6. **Use selective pruning for stateful resources:** Protect PVCs, Secrets, and ConfigMaps containing important data with `Prune=false` annotations.

## Finalizer decision matrix

| Scenario | Recommended Finalizer | Reason |
|----------|----------------------|---------|
| Standard application | `resources-finalizer.argocd.argoproj.io` | Default cascading delete |
| Large application (>100 resources) | `resources-finalizer.argocd.argoproj.io/background` | Prevent timeout on delete |
| Temporary management | None | Resources outlive Application |
| Stateful application with backups | `resources-finalizer.argocd.argoproj.io` + PreDelete hooks | Ensure backup before cleanup |
| Multi-tenant with resource quotas | `resources-finalizer.argocd.argoproj.io` | Prevent quota exhaustion |
| Development environment | `resources-finalizer.argocd.argoproj.io` | Clean up test resources |

## Conclusion

ArgoCD Application finalizers provide essential control over resource lifecycle management. By understanding how finalizers work and choosing the appropriate strategy for your use case, you can ensure clean application deletion, prevent resource leaks, and implement safe cleanup workflows. Whether you need cascading deletion, resource preservation, or custom cleanup logic, proper finalizer configuration gives you the flexibility to handle any scenario effectively.
