# How to Sync a Single Resource in a Multi-Resource ArgoCD Application

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Selective Sync, Operations

Description: Learn how to safely sync a single resource within a large ArgoCD application that contains many resources, including strategies for hotfixes, rollbacks, and targeted updates.

---

Large ArgoCD applications often contain dozens or even hundreds of Kubernetes resources. When you need to update just one Deployment or change a single ConfigMap, syncing the entire application feels excessive. This guide covers how to identify, target, and sync individual resources within multi-resource applications, along with real-world scenarios where this is essential.

## Identifying the Target Resource

Before you can sync a single resource, you need its exact identifier. Every resource in an ArgoCD application is identified by four properties: API group, kind, namespace, and name.

```bash
# List all resources in the application
argocd app resources my-large-app

# Example output:
# GROUP               KIND                 NAMESPACE    NAME              STATUS  HEALTH
#                     Namespace            production                     Synced  Healthy
#                     ConfigMap            production   app-config        Synced  Healthy
#                     ConfigMap            production   nginx-config      Synced  Healthy
#                     Secret               production   db-credentials    Synced  Healthy
#                     Service              production   web-service       Synced  Healthy
#                     Service              production   api-service       Synced  Healthy
#                     ServiceAccount       production   app-sa            Synced  Healthy
# apps                Deployment           production   web-frontend      OutOfSync  Healthy
# apps                Deployment           production   api-backend       Synced  Healthy
# apps                Deployment           production   worker            Synced  Healthy
# networking.k8s.io   Ingress              production   main-ingress      Synced  Healthy
# autoscaling         HorizontalPodAuto... production   web-hpa           Synced  Healthy
```

In this example, only `web-frontend` is OutOfSync. That is our target.

## Syncing the Single Resource

Use the `--resource` flag with the exact group, kind, and name.

```bash
# Sync only the web-frontend Deployment
argocd app sync my-large-app --resource apps:Deployment:web-frontend
```

ArgoCD will apply only this Deployment. All other resources remain untouched. The sync operation is fast because it only involves one API call to the Kubernetes cluster.

## Previewing the Change First

Always preview what will change before syncing, especially in production.

```bash
# See the diff for the specific resource
argocd app diff my-large-app --resource apps:Deployment:web-frontend
```

The diff shows you exactly what fields will change. Common changes include:

- Image tag updates (deploying a new version)
- Environment variable changes
- Resource limit adjustments
- Label or annotation modifications

```bash
# Dry run to see what the sync would do
argocd app sync my-large-app \
  --resource apps:Deployment:web-frontend \
  --dry-run
```

The dry run applies the change in a test mode and reports what would happen without actually modifying the cluster.

## Scenario: Hotfix Deployment

Your production application has a bug. The fix is a new container image for one microservice. You need to deploy it immediately without syncing anything else.

```bash
# Step 1: Verify your Git commit with the fix is the current target revision
argocd app get my-large-app | grep "Target"

# Step 2: Check which resources changed
argocd app diff my-large-app

# Step 3: Confirm only the Deployment changed
argocd app resources my-large-app --output json | \
  jq '.[] | select(.status == "OutOfSync")'

# Step 4: Sync just the fixed Deployment
argocd app sync my-large-app --resource apps:Deployment:api-backend

# Step 5: Monitor the rollout
argocd app wait my-large-app \
  --resource apps:Deployment:api-backend \
  --health \
  --timeout 120
```

## Scenario: Configuration Change

You updated a ConfigMap in Git. The Deployment that uses it did not change, but you need to sync the ConfigMap and restart the pods.

```bash
# Step 1: Sync the ConfigMap
argocd app sync my-large-app --resource :ConfigMap:app-config

# Step 2: Restart the Deployment to pick up the new config
kubectl rollout restart deployment/web-frontend -n production

# Step 3: Wait for the rollout to complete
kubectl rollout status deployment/web-frontend -n production
```

Note that syncing a ConfigMap does not automatically restart pods. You need to trigger a rollout restart separately. If you want automatic restarts on ConfigMap changes, use a tool like Reloader or include a config hash annotation in your Deployment template.

## Scenario: Rollback a Single Resource

You deployed a bad change to one service and need to roll it back. You can either revert the commit in Git and sync, or roll back to a previous revision.

```bash
# Option 1: Sync to a specific Git revision
argocd app sync my-large-app \
  --resource apps:Deployment:web-frontend \
  --revision abc123def  # The commit hash of the known good state

# Option 2: Use kubectl to rollback the Deployment directly
# (This creates drift that ArgoCD will detect as OutOfSync)
kubectl rollout undo deployment/web-frontend -n production
```

Option 1 keeps everything GitOps-aligned. Option 2 is faster but creates drift between Git and the cluster. You will need to update Git to match the rolled-back state before the next sync.

## Scenario: Updating an Ingress Configuration

You changed the Ingress routing rules but do not want to touch any workloads.

```bash
# Sync only the Ingress
argocd app sync my-large-app --resource networking.k8s.io:Ingress:main-ingress

# Verify the Ingress was updated
kubectl describe ingress main-ingress -n production
```

Ingress changes are low-risk for workloads since they only affect routing at the ingress controller level. Syncing just the Ingress is a safe targeted operation.

## Scenario: Updating RBAC for a Service Account

Security changes often need to be deployed independently from application updates.

```bash
# Sync the ServiceAccount and its RoleBinding together
argocd app sync my-large-app \
  --resource :ServiceAccount:app-sa \
  --resource rbac.authorization.k8s.io:RoleBinding:app-sa-binding
```

RBAC changes take effect immediately for new API calls. Running pods continue with their existing token until it expires or the pod is restarted.

## Working with Resources That Have the Same Name

In multi-namespace applications, you might have resources with the same kind and name in different namespaces. Use the namespace filter to target the correct one.

```bash
# Sync the web-server Deployment in the staging namespace
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --namespace staging

# Sync the same-named Deployment in production
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --namespace production
```

Without the `--namespace` flag, ArgoCD syncs all resources matching the group, kind, and name across all namespaces in the application.

## Monitoring After Single-Resource Sync

After syncing a single resource, verify the operation succeeded and the application is healthy.

```bash
# Check the sync result for the specific resource
argocd app resources my-large-app --output json | \
  jq '.[] | select(.kind == "Deployment" and .name == "web-frontend") | {status, health: .health.status}'

# Check the overall application status
argocd app get my-large-app --output json | \
  jq '{syncStatus: .status.sync.status, healthStatus: .status.health.status}'
```

Remember that the overall application might still show OutOfSync if there are other pending changes you have not synced yet. This is expected and not a problem.

## When Single-Resource Sync Is Not Enough

Some changes span multiple resources that depend on each other. For example:

- A new environment variable in a Deployment that references a new Secret
- A Service port change that requires an Ingress update
- A new RBAC Role that is referenced by a new RoleBinding

In these cases, sync all the related resources together.

```bash
# Sync a group of related resources
argocd app sync my-large-app \
  --resource :Secret:new-api-key \
  --resource apps:Deployment:api-backend \
  --resource :Service:api-service
```

If you sync only one resource when its dependencies also changed, the sync might succeed but the application might not work correctly until the remaining resources are synced.

For the full selective sync reference, see the [selective sync CLI guide](https://oneuptime.com/blog/post/2026-02-26-argocd-selective-sync-cli/view). For excluding resources from sync, check the [resource exclusion guide](https://oneuptime.com/blog/post/2026-02-26-argocd-exclude-resources-from-sync/view).
