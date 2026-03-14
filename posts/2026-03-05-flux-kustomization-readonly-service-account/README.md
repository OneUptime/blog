# How to Configure Flux Kustomization with Read-Only Service Account

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, RBAC, Service Accounts, Read-Only

Description: Learn how to configure a Flux Kustomization with a read-only service account to perform dry-run validations without granting write permissions.

---

In some scenarios, you want Flux to validate and monitor resources without actually applying changes. By pairing a Kustomization with a read-only service account, you can create a validation-only workflow that detects drift and configuration issues without modifying cluster state.

## Use Cases for Read-Only Service Accounts

- **Drift detection**: Monitor whether deployed resources match the desired state in Git.
- **Validation environments**: Test Kustomization configurations without deploying.
- **Audit trails**: Record what would change without making the changes.
- **Multi-stage deployments**: Validate in one stage before applying in another.

## Step 1: Create a Read-Only Service Account

Create a service account with only read permissions in the target namespace:

```yaml
# readonly-service-account.yaml
# Service account with read-only access for drift detection
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-readonly
  namespace: production
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
    namespace: production
```

## Step 2: Configure the Kustomization with the Read-Only Service Account

Create a Flux Kustomization that uses the read-only service account. When the kustomize-controller tries to apply changes, it will fail with a Forbidden error, effectively making it read-only:

```yaml
# kustomization-readonly.yaml
# Flux Kustomization using a read-only service account for drift detection
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-drift-check
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
  # Health checks can still run with read-only access
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
  namespace: production
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
    namespace: production
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
  dependsOn:
    - name: production-drift-check  # Only deploy after drift check passes
```

## Step 4: Set Up Alerts for Drift Detection

Configure Flux notifications to alert when the read-only Kustomization detects drift:

```yaml
# alert-drift-detection.yaml
# Alert on drift detection failures from the read-only Kustomization
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
  name: drift-detection
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: production-drift-check
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
flux get kustomization production-drift-check

# Verify the service account cannot create resources
kubectl auth can-i create deployments \
  --as=system:serviceaccount:production:flux-readonly \
  -n production
# Expected: "no"

# Verify the service account can read resources
kubectl auth can-i get deployments \
  --as=system:serviceaccount:production:flux-readonly \
  -n production
# Expected: "yes"
```

## Best Practices

1. **Separate read and write Kustomizations**: Use different Kustomizations for monitoring and deploying.
2. **Use dependsOn for staging**: Make write Kustomizations depend on read-only ones for validation gates.
3. **Disable pruning**: Always set `prune: false` on read-only Kustomizations since deletion is a write operation.
4. **Set up alerts**: Configure notifications for read-only Kustomization failures to catch drift early.
5. **Review RBAC scope**: Ensure the read-only Role covers all resource types in your Kustomization path.

Read-only service accounts provide a safe way to use Flux for monitoring and validation without risking unintended changes. This pattern is especially useful in regulated environments where changes require explicit approval workflows.
