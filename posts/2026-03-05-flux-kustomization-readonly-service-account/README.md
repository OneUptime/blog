# How to Configure Flux Kustomization with Read-Only Service Account

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Service Account, Read-Only

Description: Learn how to configure a Flux Kustomization with a read-only service account to perform dry-run validations without granting write permissions.

---

In some scenarios, you want to verify that Flux cannot modify resources unless it is explicitly granted write access. By pairing a Kustomization with a read-only service account, you can create an RBAC boundary check that fails closed with a Forbidden error instead of modifying cluster state.

This is not a successful dry-run validation workflow. Flux Kustomizations validate and then apply resources, and Kubernetes authorizes server-side dry-run requests the same way it authorizes non-dry-run write requests. A service account with only `get`, `list`, and `watch` permissions should therefore be expected to fail when Flux tries to create, patch, update, or delete resources.

## Use Cases for Read-Only Service Accounts

- **RBAC boundary checks**: Confirm that a Kustomization cannot write outside its intended permissions.
- **Validation environments**: Test that restricted Flux credentials fail closed before granting deploy permissions.
- **Audit trails**: Record Forbidden reconciliation events without making the changes.
- **Multi-stage deployments**: Keep restricted checks separate from the Kustomizations that actually apply changes.

## Step 1: Create a Read-Only Service Account

Create a service account in the same namespace as the Flux Kustomization, then bind it to read-only permissions in the target namespace:

```yaml
# readonly-service-account.yaml

# Service account with read-only access for RBAC boundary checks
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-readonly
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-readonly
  namespace: production
rules:
  # Read-only access to all common resource types
  - apiGroups: [""]
    resources: ["configmaps", "secrets", "services", "serviceaccounts", "pods", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-readonly
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-readonly
subjects:
  - kind: ServiceAccount
    name: flux-readonly
    namespace: flux-system
```

## Step 2: Configure the Kustomization with the Read-Only Service Account

Create a Flux Kustomization that uses the read-only service account. When the kustomize-controller tries to apply or server-side dry-run changes, it will fail with a Forbidden error. This verifies that the service account cannot write to the target namespace:

```yaml
# kustomization-readonly.yaml
# Flux Kustomization using a read-only service account for RBAC boundary checks
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-rbac-check
  namespace: flux-system
spec:
  interval: 30m
  path: ./apps/production
  prune: false  # Disable pruning since we cannot delete resources
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
  # Use the read-only service account
  serviceAccountName: flux-readonly
  # Force apply is not needed for read-only
  force: false
  # Health checks can still run with read-only access if the apply phase succeeds
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: webapp
      namespace: production
```

## Step 3: Create a Writable Counterpart for Actual Deployments

For actual deployments, create a separate Kustomization with a writable service account:

```yaml
# writable-service-account.yaml
# Service account with write access for actual deployments
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-deployer
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-deployer
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets", "services", "serviceaccounts"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-deployer
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-deployer
subjects:
  - kind: ServiceAccount
    name: flux-deployer
    namespace: flux-system
---
# Flux Kustomization that actually applies resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-deploy
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
  serviceAccountName: flux-deployer
```

## Step 4: Set Up Alerts for Forbidden Errors

Configure Flux notifications to alert when the read-only Kustomization fails with a Forbidden error:

```yaml
# alert-readonly-rbac.yaml
# Alert on RBAC failures from the read-only Kustomization
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-alerts
  namespace: flux-system
spec:
  type: slack
  channel: gitops-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: readonly-rbac-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: production-rbac-check
      namespace: flux-system
```

## Step 5: Apply and Test

Apply the configuration and verify read-only behavior:

```bash
# Apply the read-only service account and RBAC
kubectl apply -f readonly-service-account.yaml

# Apply the read-only Kustomization
kubectl apply -f kustomization-readonly.yaml

# Check the Kustomization status
flux get kustomizations production-rbac-check

# Verify the service account cannot create or patch resources
kubectl auth can-i create deployments \
  --as=system:serviceaccount:flux-system:flux-readonly \
  -n production
# Expected: "no"

kubectl auth can-i patch deployments \
  --as=system:serviceaccount:flux-system:flux-readonly \
  -n production
# Expected: "no"

# Verify the service account can read resources
kubectl auth can-i get deployments \
  --as=system:serviceaccount:flux-system:flux-readonly \
  -n production
# Expected: "yes"
```

## Best Practices

1. **Separate read and write Kustomizations**: Use different Kustomizations for RBAC checks and deploying.
2. **Do not gate deployments on a read-only Kustomization**: A correctly restricted read-only Kustomization will not become Ready when it needs write permissions.
3. **Disable pruning**: Always set `prune: false` on read-only Kustomizations since deletion is a write operation.
4. **Set up alerts**: Configure notifications for read-only Kustomization failures to catch unexpected write attempts early.
5. **Review RBAC scope**: Ensure the read-only Role covers all resource types in your Kustomization path.

Read-only service accounts provide a safe way to prove that Flux cannot change a namespace without explicit write permissions. This pattern is especially useful in regulated environments where changes require explicit approval workflows.
