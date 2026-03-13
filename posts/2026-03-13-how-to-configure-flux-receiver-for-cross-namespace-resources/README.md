# How to Configure Flux Receiver for Cross-Namespace Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhooks, Cross-Namespace, RBAC, Multi-Tenancy

Description: Learn how to configure Flux Receivers to trigger reconciliation of resources in different namespaces, including the RBAC and service account setup required for cross-namespace access.

---

By default, a Flux Receiver can only trigger reconciliation of resources within its own namespace. In multi-tenant clusters or setups where teams manage resources in separate namespaces, you need the Receiver to reach across namespace boundaries. This requires configuring the Receiver's resource references with explicit namespace fields and ensuring the notification-controller has the RBAC permissions to patch resources in those namespaces.

This guide walks through the complete setup for cross-namespace Receiver configurations.

## Prerequisites

- A Kubernetes cluster with Flux CD installed and bootstrapped.
- Resources deployed across multiple namespaces.
- `kubectl` and `flux` CLI tools available.
- Cluster-admin access to create RBAC resources.

Verify your multi-namespace setup:

```bash
# List Flux resources across all namespaces
flux get all --all-namespaces
```

## Understanding the Default Behavior

When a Receiver is created in `flux-system`, it can annotate resources in `flux-system` because the notification-controller's default RBAC grants it permission to patch Flux resources in its own namespace. Attempting to reference a resource in another namespace without additional RBAC will fail silently or log an error.

## Step 1: Create Namespaces and Deploy Resources

For this guide, assume you have the following setup:

```bash
# Team namespaces
kubectl create namespace team-alpha
kubectl create namespace team-beta
```

Deploy GitRepository and Kustomization resources in each team namespace:

```yaml
# team-alpha-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-repo
  namespace: team-alpha
spec:
  interval: 10m
  url: https://github.com/org/team-alpha-config
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-app
  namespace: team-alpha
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-alpha-repo
  path: ./deploy
  prune: true
```

```yaml
# team-beta-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-beta-repo
  namespace: team-beta
spec:
  interval: 10m
  url: https://github.com/org/team-beta-config
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-beta-app
  namespace: team-beta
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-beta-repo
  path: ./deploy
  prune: true
```

Apply both:

```bash
kubectl apply -f team-alpha-source.yaml
kubectl apply -f team-beta-source.yaml
```

## Step 2: Grant Cross-Namespace RBAC Permissions

The notification-controller needs permission to patch resources in the target namespaces. Create a ClusterRole and ClusterRoleBinding:

```yaml
# cross-namespace-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: notification-controller-cross-namespace
rules:
  # Allow patching GitRepositories in any namespace
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources:
      - gitrepositories
      - helmrepositories
      - ocirepositories
      - buckets
    verbs: ["get", "list", "patch"]
  # Allow patching Kustomizations in any namespace
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources:
      - kustomizations
    verbs: ["get", "list", "patch"]
  # Allow patching HelmReleases in any namespace
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources:
      - helmreleases
    verbs: ["get", "list", "patch"]
  # Allow patching ImageRepositories in any namespace
  - apiGroups: ["image.toolkit.fluxcd.io"]
    resources:
      - imagerepositories
      - imagepolicies
      - imageupdateautomations
    verbs: ["get", "list", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: notification-controller-cross-namespace
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: notification-controller-cross-namespace
subjects:
  - kind: ServiceAccount
    name: notification-controller
    namespace: flux-system
```

Apply the RBAC resources:

```bash
kubectl apply -f cross-namespace-rbac.yaml
```

To restrict access to specific namespaces instead of the entire cluster, use namespaced Role and RoleBinding resources:

```yaml
# namespace-scoped-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: notification-controller-access
  namespace: team-alpha
rules:
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories"]
    verbs: ["get", "list", "patch"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: notification-controller-access
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: notification-controller-access
subjects:
  - kind: ServiceAccount
    name: notification-controller
    namespace: flux-system
```

Repeat for each target namespace.

## Step 3: Create the Cross-Namespace Receiver

Now create a Receiver in `flux-system` that references resources in other namespaces using the `namespace` field:

```yaml
# cross-namespace-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: cross-namespace-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: webhook-token
  resources:
    # Resource in the same namespace
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
    # Resources in team-alpha namespace
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: team-alpha-repo
      namespace: team-alpha
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: team-alpha-app
      namespace: team-alpha
    # Resources in team-beta namespace
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: team-beta-repo
      namespace: team-beta
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: team-beta-app
      namespace: team-beta
```

Apply it:

```bash
kubectl apply -f cross-namespace-receiver.yaml
```

## Step 4: Use Label Selectors Across Namespaces

You can combine cross-namespace references with label selectors. First label the target resources:

```bash
kubectl -n team-alpha label gitrepository team-alpha-repo webhook-enabled=true
kubectl -n team-beta label gitrepository team-beta-repo webhook-enabled=true
```

Then use matchLabels with a namespace:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: cross-ns-label-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      namespace: team-alpha
      matchLabels:
        webhook-enabled: "true"
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      namespace: team-beta
      matchLabels:
        webhook-enabled: "true"
```

## Step 5: Per-Namespace Receivers (Alternative Approach)

Instead of one central Receiver with cross-namespace access, you can create Receivers in each team namespace. This provides better isolation:

```yaml
# team-alpha-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: team-alpha-receiver
  namespace: team-alpha
spec:
  type: github
  events:
    - "push"
  secretRef:
    name: team-alpha-webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: team-alpha-repo
    - apiVersion: kustomize.toolkit.fluxcd.io/v1
      kind: Kustomization
      name: team-alpha-app
```

This requires the webhook-token secret to exist in the `team-alpha` namespace. Each team gets their own webhook URL and token, which is cleaner from a security perspective.

Create the token secret in the team namespace:

```bash
TOKEN=$(head -c 32 /dev/urandom | shasum | head -c 40)
kubectl -n team-alpha create secret generic team-alpha-webhook-token \
  --from-literal=token=$TOKEN
```

The tradeoff is that each team must configure their own webhook on the provider side.

## Verification

Check that the Receiver is ready:

```bash
kubectl -n flux-system get receiver cross-namespace-receiver
```

Verify RBAC permissions:

```bash
# Check if the notification-controller can patch resources in team-alpha
kubectl auth can-i patch gitrepositories.source.toolkit.fluxcd.io \
  -n team-alpha \
  --as=system:serviceaccount:flux-system:notification-controller
```

This should return `yes`. Test the webhook and verify annotations across namespaces:

```bash
for ns in flux-system team-alpha team-beta; do
  echo "=== $ns ==="
  kubectl -n $ns get gitrepository -o custom-columns="NAME:.metadata.name,REQUESTED_AT:.metadata.annotations.reconcile\.fluxcd\.io/requestedAt"
done
```

## Troubleshooting

### Receiver is Ready but cross-namespace resources are not reconciled

Check the notification-controller logs for RBAC errors:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=5m | grep -i "forbidden\|unauthorized\|cannot patch"
```

If you see forbidden errors, the ClusterRole or RoleBinding is missing or incorrect.

### Resource not found errors

Verify that the resource exists in the specified namespace:

```bash
kubectl -n team-alpha get gitrepository team-alpha-repo
```

Also verify the API version. Different Flux versions may use different API versions (v1beta2 vs v1).

### Notification controller cannot find the service account

Ensure the service account name in the ClusterRoleBinding matches the actual notification-controller service account:

```bash
kubectl -n flux-system get serviceaccount | grep notification
```

### Multi-tenancy concerns

In strict multi-tenant environments, a centralized Receiver with cluster-wide RBAC may be too permissive. Consider the per-namespace approach from Step 5, or use namespace-scoped Roles and RoleBindings from Step 2 to limit access to specific namespaces.

## Summary

Cross-namespace Receivers enable a single webhook endpoint to trigger reconciliation across multiple team namespaces. The key requirement is granting the notification-controller RBAC permissions to patch resources in the target namespaces. For tighter security, use namespace-scoped Roles instead of ClusterRoles, or deploy separate Receivers in each namespace. The right approach depends on your multi-tenancy model and how much isolation you need between teams.
