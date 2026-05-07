# How to Manage Service Account Permissions in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Security, Role

Description: Learn how to create, configure, and manage Kubernetes service account permissions within Rancher for secure workload-to-API communication.

Service accounts provide identities for processes running in pods. Unlike user accounts, service accounts are namespaced Kubernetes resources managed by the cluster. Properly configuring service account permissions is essential for securing your workloads. This guide covers managing service account permissions through Rancher.

## Prerequisites

- Rancher v2.7+ with cluster access
- A managed downstream cluster
- kubectl configured to access the cluster through Rancher
- Basic understanding of Kubernetes RBAC

## Understanding Service Accounts in Rancher

Every namespace has a `default` service account that is automatically mounted into pods unless specified otherwise. In Kubernetes 1.24 and later, service account tokens are no longer automatically created as secrets. In modern clusters, pods typically receive short-lived projected tokens via the TokenRequest API.

Rancher manages service accounts through the standard Kubernetes RBAC model. You can create service accounts, define roles, and bind those roles to service accounts using Rancher's UI or kubectl.

## Step 1: Create a Service Account

**Via the Rancher UI:**

1. Navigate to your cluster and select the target namespace.
2. Go to **More Resources > Core > ServiceAccounts**.
3. Click **Create**.

**Via kubectl:**

```bash
kubectl create serviceaccount app-deployer -n production
```

Or using a manifest:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-deployer
  namespace: production
  labels:
    app: deployment-automation
automountServiceAccountToken: false
```

```bash
kubectl apply -f service-account.yaml
```

Setting `automountServiceAccountToken: false` is a security best practice. Only mount the token when the pod actually needs to interact with the Kubernetes API.

## Step 2: Create a Role for the Service Account

Define a role with the minimum permissions the service account needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
```

```bash
kubectl apply -f role.yaml
```

## Step 3: Bind the Role to the Service Account

Create a RoleBinding to connect the service account to the role:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-deployer-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: app-deployer
    namespace: production
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f rolebinding.yaml
```

## Step 4: Use the Service Account in a Pod

Configure a pod or deployment to use the service account:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deployment-controller
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deployment-controller
  template:
    metadata:
      labels:
        app: deployment-controller
    spec:
      serviceAccountName: app-deployer
      automountServiceAccountToken: true
      containers:
        - name: controller
          image: my-controller:latest
```

## Step 5: Create a ClusterRole for Cluster-Wide Access

If a service account needs access across all namespaces, use a ClusterRole with a ClusterRoleBinding:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-reader
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-sa-binding
subjects:
  - kind: ServiceAccount
    name: monitoring-agent
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: namespace-reader
  apiGroup: rbac.authorization.k8s.io
```

## Step 6: Disable Default Service Account Token Mounting

Prevent the default service account token from being mounted into pods that do not need API access:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: production
automountServiceAccountToken: false
```

```bash
kubectl apply -f default-sa-patch.yaml
```

This ensures that pods in the `production` namespace that use the `default` service account do not receive API credentials unless token automounting is enabled explicitly in the pod spec.

## Step 7: Create a Token for External Use

Generate a time-limited token for a service account to use outside the cluster:

```bash
# Create a short-lived token (1 hour)

kubectl create token app-deployer -n production --duration=1h
```

For longer-lived tokens (not recommended for production):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-deployer-token
  namespace: production
  annotations:
    kubernetes.io/service-account.name: app-deployer
type: kubernetes.io/service-account-token
```

## Step 8: Manage Service Accounts Through the Rancher UI

Rancher provides a UI for viewing and managing service accounts:

1. Navigate to your cluster in the Rancher UI.
2. Go to **More Resources > Core > ServiceAccounts** to view and manage service accounts.
3. If you manually create a long-lived service account token secret, you can view it under **Storage > Secrets** or **More Resources > Core > Secrets**.
4. Use the **kubectl Shell** from the cluster dashboard for direct management.

To view service accounts for a namespace:

1. Select the namespace from the namespace dropdown.
2. Go to **More Resources > Core > ServiceAccounts**.

## Step 9: Audit Service Account Permissions

Review what each service account can do:

```bash
# List all service accounts in a namespace
kubectl get serviceaccounts -n production

# Check permissions for a specific service account
kubectl auth can-i --list -n production \
  --as=system:serviceaccount:production:app-deployer

# Check a specific permission
kubectl auth can-i create deployments -n production \
  --as=system:serviceaccount:production:app-deployer

# Find all role bindings for a service account
kubectl get rolebindings,clusterrolebindings --all-namespaces -o json | \
  jq -r '.items[] | select(.subjects[]? | select(.kind == "ServiceAccount" and .name == "app-deployer" and .namespace == "production")) | "\(.metadata.namespace)/\(.metadata.name) -> \(.roleRef.name)"'
```

## Step 10: Clean Up Unused Service Accounts

Remove service accounts that are no longer in use:

```bash
# List service accounts not used by any pod
for sa in $(kubectl get serviceaccounts -n production -o jsonpath='{.items[*].metadata.name}'); do
  pods=$(kubectl get pods -n production --field-selector=spec.serviceAccountName=$sa -o name 2>/dev/null | wc -l)
  if [ "$pods" -eq 0 ] && [ "$sa" != "default" ]; then
    echo "Unused service account: $sa"
  fi
done
```

## Best Practices

- **One service account per application**: Do not share service accounts between different applications.
- **Disable auto-mounting**: Set `automountServiceAccountToken: false` on the default service account in every namespace.
- **Use short-lived tokens**: Prefer the TokenRequest API over static token secrets.
- **Namespace-scoped roles**: Use Roles and RoleBindings instead of ClusterRoles and ClusterRoleBindings whenever possible.
- **Audit regularly**: Check service account permissions as part of your security review process.
- **Label service accounts**: Use labels to track which application or team owns each service account.

## Conclusion

Managing service account permissions in Rancher follows Kubernetes RBAC conventions with the added benefit of Rancher's UI for visibility. By creating dedicated service accounts with minimal permissions, disabling default token mounting, and auditing regularly, you maintain secure communication between your workloads and the Kubernetes API. Always follow the principle of least privilege when configuring service account access.
