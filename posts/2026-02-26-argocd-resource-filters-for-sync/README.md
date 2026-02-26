# How to Use Resource Filters in ArgoCD for Sync

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Filtering, Sync Operations

Description: Learn how to use resource filters in ArgoCD to control which resources are included in sync operations, using labels, annotations, groups, and kind-based filtering.

---

ArgoCD resource filters let you control which Kubernetes resources participate in sync operations. Instead of syncing everything or manually selecting individual resources, filters give you a rule-based approach. You can filter by API group, resource kind, name patterns, labels, and more. This guide covers every filtering mechanism available in ArgoCD.

## Global Resource Exclusions

The broadest filter operates at the ArgoCD instance level. Configured in the `argocd-cm` ConfigMap, global exclusions tell ArgoCD to completely ignore certain resource types across all applications.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.exclusions: |
    - apiGroups:
        - "events.k8s.io"
        - ""
      kinds:
        - Event
      clusters:
        - "*"
    - apiGroups:
        - "metrics.k8s.io"
      kinds:
        - "*"
      clusters:
        - "*"
    - apiGroups:
        - "coordination.k8s.io"
      kinds:
        - Lease
      clusters:
        - "*"
```

Each exclusion rule has three fields.

`apiGroups`: Which API groups to match. Use `""` for core resources (ConfigMaps, Services, Pods). Use `"*"` to match all groups.

`kinds`: Which resource kinds to match within those groups. Use `"*"` for all kinds in the group.

`clusters`: Which clusters the exclusion applies to. Use `"*"` for all clusters.

All three fields must match for a resource to be excluded.

## Global Resource Inclusions

The inverse of exclusions, inclusions define an allowlist. When configured, ArgoCD only tracks listed resource types.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.inclusions: |
    - apiGroups:
        - "*"
      kinds:
        - Deployment
        - StatefulSet
        - DaemonSet
        - Service
        - Ingress
        - ConfigMap
        - Secret
        - ServiceAccount
        - Role
        - RoleBinding
        - ClusterRole
        - ClusterRoleBinding
        - PersistentVolumeClaim
        - HorizontalPodAutoscaler
        - Namespace
        - CustomResourceDefinition
      clusters:
        - "*"
```

This is more maintainable for clusters with many CRD-based operators that create resources ArgoCD should not care about. Instead of listing every CRD type to exclude, you list only the types ArgoCD should manage.

## Project-Level Resource Filters

ArgoCD Projects provide resource filtering at the project level. This controls which resource types applications within the project can manage.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
  namespace: argocd
spec:
  description: Team Alpha's project
  sourceRepos:
    - "https://github.com/team-alpha/*"
  destinations:
    - namespace: "team-alpha-*"
      server: https://kubernetes.default.svc
  # Allow only these resource types in the namespace
  namespaceResourceWhitelist:
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: ""
      kind: Service
    - group: apps
      kind: Deployment
    - group: apps
      kind: StatefulSet
    - group: networking.k8s.io
      kind: Ingress
    - group: autoscaling
      kind: HorizontalPodAutoscaler
  # Deny these cluster-scoped resource types
  clusterResourceBlacklist:
    - group: ""
      kind: Namespace
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
```

`namespaceResourceWhitelist` allows only specific resource types in namespace-scoped operations. If a team tries to deploy a resource type not on the whitelist, ArgoCD rejects the sync.

`clusterResourceBlacklist` prevents specific cluster-scoped resource types from being deployed through the project.

```yaml
  # Alternative: blacklist approach for namespace resources
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota
    - group: ""
      kind: LimitRange
  # Allow specific cluster resources
  clusterResourceWhitelist:
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
```

## Application-Level Directory Filters

When using a directory source (plain YAML files), you can include or exclude specific files.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: manifests/
    directory:
      recurse: true
      include: "*.yaml"
      exclude: "{test-*,debug-*}"
```

The `include` and `exclude` fields use glob patterns. This filters at the file level, not the resource level, but it effectively controls which resources ArgoCD manages.

```yaml
# Include only production manifests
directory:
  include: "production/*.yaml"
  exclude: ""

# Exclude test and staging files
directory:
  include: "*.yaml"
  exclude: "{test/*,staging/*,*.test.yaml}"
```

## Label-Based Filtering with ApplicationSets

ApplicationSets support label-based filtering through generators.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: filtered-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/apps.git
        revision: main
        directories:
          - path: apps/*
          - path: apps/legacy-*
            exclude: true  # Exclude directories matching this pattern
  template:
    metadata:
      name: "{{path.basename}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: main
        path: "{{path}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{path.basename}}"
```

## Filtering During CLI Sync Operations

The CLI provides filtering capabilities during sync.

```bash
# Sync only resources of a specific kind by listing them
argocd app resources my-app --output json | \
  jq -r '.[] | select(.kind == "Deployment") | "\(.group):\(.kind):\(.name)"' | \
  while read resource; do
    echo "Syncing: $resource"
  done

# Build a sync command targeting only Deployments
DEPLOY_RESOURCES=$(argocd app resources my-app --output json | \
  jq -r '.[] | select(.kind == "Deployment") | "--resource \(.group):\(.kind):\(.name)"' | \
  tr '\n' ' ')

eval argocd app sync my-app $DEPLOY_RESOURCES
```

## Filtering by Health Status

You can filter resources by health status to sync only degraded or progressing resources.

```bash
# Find and sync only degraded resources
DEGRADED=$(argocd app resources my-app --output json | \
  jq -r '.[] | select(.health.status == "Degraded") | "\(.group):\(.kind):\(.name)"')

if [ -n "$DEGRADED" ]; then
  RESOURCE_FLAGS=$(echo "$DEGRADED" | sed 's/^/--resource /' | tr '\n' ' ')
  eval argocd app sync my-app $RESOURCE_FLAGS --force
fi
```

## Filtering by Sync Status

Similarly, filter by sync status to find resources that need attention.

```bash
# List only OutOfSync resources
argocd app resources my-app --output json | \
  jq '.[] | select(.status == "OutOfSync") | {group, kind, name, namespace}'

# List only Missing resources (exist in Git but not in cluster)
argocd app resources my-app --output json | \
  jq '.[] | select(.status == "Missing") | {group, kind, name, namespace}'
```

## Combining Filters

For precise control, combine multiple filtering criteria.

```bash
#!/bin/bash
# sync-filtered.sh - Sync resources matching multiple criteria

APP_NAME="my-app"
TARGET_KIND="Deployment"
TARGET_STATUS="OutOfSync"

# Get resources matching both kind and status filters
TARGETS=$(argocd app resources "$APP_NAME" --output json | \
  jq -r --arg kind "$TARGET_KIND" --arg status "$TARGET_STATUS" \
  '.[] | select(.kind == $kind and .status == $status) | "\(.group):\(.kind):\(.name)"')

if [ -z "$TARGETS" ]; then
  echo "No $TARGET_KIND resources with status $TARGET_STATUS"
  exit 0
fi

echo "Found matching resources:"
echo "$TARGETS"

RESOURCE_FLAGS=$(echo "$TARGETS" | sed 's/^/--resource /' | tr '\n' ' ')
eval argocd app sync "$APP_NAME" $RESOURCE_FLAGS

echo "Sync complete"
```

## ignoreDifferences as a Passive Filter

The `ignoreDifferences` configuration acts as a passive filter. It does not prevent resources from being synced, but it prevents specific field differences from triggering OutOfSync status.

```yaml
spec:
  ignoreDifferences:
    # Filter: ignore replica differences on all Deployments
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    # Filter: ignore annotations added by external controllers
    - group: ""
      kind: Service
      name: my-service
      jsonPointers:
        - /metadata/annotations/external-dns.alpha.kubernetes.io~1hostname
    # Filter: ignore all status fields on CRDs
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      jqPathExpressions:
        - .status
```

This is useful when external tools (like HPAs, external-dns, or operators) modify resources that ArgoCD also manages. Without ignoreDifferences, ArgoCD would constantly report these resources as OutOfSync and try to revert the changes.

## Best Practices for Resource Filtering

Start permissive and add filters as needed. Global exclusions should be limited to genuinely unmanaged resource types like Events and Leases.

Use project-level filters for team isolation. If a team should not deploy ClusterRoles, enforce this at the project level.

Use application-level `ignoreDifferences` for resources managed by both ArgoCD and external controllers.

Use directory includes and excludes to organize your manifests by environment (production, staging, test) and only sync the relevant files.

Document your filter configuration. Filters are invisible during normal operations, which means teams might not realize why certain resources are not being synced. Add comments in your YAML and maintain a filter inventory.

For the basics of selective sync, see the [selective sync guide](https://oneuptime.com/blog/post/2026-02-26-argocd-sync-specific-resources/view). For excluding resources specifically, check the [resource exclusion guide](https://oneuptime.com/blog/post/2026-02-26-argocd-exclude-resources-from-sync/view).
