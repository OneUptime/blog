# How to Implement RBAC RoleBindings That Reference ServiceAccounts Across Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, ServiceAccounts, Namespace, Security

Description: Learn how to configure RBAC RoleBindings that grant permissions to ServiceAccounts from different namespaces, enabling secure cross-namespace service communication patterns.

---

Kubernetes namespaces provide isolation boundaries, but real-world applications often need controlled communication across those boundaries. A monitoring service in the observability namespace might need to read metrics from pods in application namespaces. A CI/CD system in the tools namespace might need to deploy applications to various environment namespaces. Cross-namespace ServiceAccount permissions make these patterns possible without compromising security.

RoleBindings can reference ServiceAccounts from any namespace, not just the namespace where the binding exists. This capability allows you to grant specific permissions to services running elsewhere in the cluster while maintaining the principle of least privilege. The key is understanding how to structure these bindings securely.

## Understanding Cross-Namespace ServiceAccount References

RoleBindings work within a single namespace but can reference subjects from anywhere in the cluster. When you bind a Role to a ServiceAccount from another namespace, that ServiceAccount gains the permissions defined in the Role, but only within the namespace where the RoleBinding exists.

Consider this scenario: You have a monitoring agent running in the `monitoring` namespace that needs to read pod metrics from the `production` namespace. The monitoring agent uses the ServiceAccount `monitoring/prometheus`. To grant access, you create a RoleBinding in the `production` namespace that references the `monitoring/prometheus` ServiceAccount.

The critical distinction is between where the binding lives and where the subject lives. The binding's namespace determines which resources the permissions apply to. The subject's namespace is where the ServiceAccount or user originates.

## Creating a Basic Cross-Namespace RoleBinding

Start with a simple example. Create a ServiceAccount in one namespace and grant it permissions in another:

```bash
# Create the monitoring namespace and ServiceAccount
kubectl create namespace monitoring
kubectl create serviceaccount prometheus -n monitoring
```

Create a Role in the target namespace defining what the ServiceAccount can do:

```yaml
# production-metrics-reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: metrics-reader
  namespace: production
rules:
- apiGroups: [""]
  resources:
    - pods
    - pods/log
    - services
    - endpoints
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources:
    - deployments
    - replicasets
  verbs: ["get", "list", "watch"]
```

Apply the Role:

```bash
kubectl apply -f production-metrics-reader-role.yaml
```

Now create the RoleBinding that references the ServiceAccount from the monitoring namespace:

```yaml
# production-metrics-reader-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prometheus-metrics-access
  namespace: production  # The namespace where permissions apply
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: metrics-reader
subjects:
- kind: ServiceAccount
  name: prometheus  # ServiceAccount name
  namespace: monitoring  # ServiceAccount's home namespace
```

Apply the binding:

```bash
kubectl apply -f production-metrics-reader-binding.yaml
```

The `prometheus` ServiceAccount in the `monitoring` namespace can now read resources in the `production` namespace. It cannot modify anything, and it cannot access resources in other namespaces unless additional RoleBindings are created.

## Testing Cross-Namespace Permissions

Verify the permissions work as expected:

```bash
# Create a test pod using the prometheus ServiceAccount
kubectl run test-pod \
  --image=bitnami/kubectl:latest \
  --serviceaccount=prometheus \
  --namespace=monitoring \
  --command -- sleep 3600

# Exec into the pod and test access
kubectl exec -it test-pod -n monitoring -- sh

# Inside the pod, try to list pods in production
kubectl get pods -n production
# Should succeed

# Try to create a pod in production
kubectl run test -n production --image=nginx
# Should fail with forbidden error

# Try to access a different namespace
kubectl get pods -n development
# Should fail
```

Clean up the test:

```bash
kubectl delete pod test-pod -n monitoring
```

## Granting Access to Multiple Namespaces

When a ServiceAccount needs access to multiple namespaces, create a RoleBinding in each target namespace. You can use the same Role definition or customize permissions per namespace:

```bash
# Grant prometheus access to staging namespace
kubectl create role metrics-reader \
  --verb=get,list,watch \
  --resource=pods,services,endpoints \
  --namespace=staging

kubectl create rolebinding prometheus-metrics-access \
  --role=metrics-reader \
  --serviceaccount=monitoring:prometheus \
  --namespace=staging

# Grant prometheus access to development namespace
kubectl create role metrics-reader \
  --verb=get,list,watch \
  --resource=pods,services,endpoints \
  --namespace=development

kubectl create rolebinding prometheus-metrics-access \
  --role=metrics-reader \
  --serviceaccount=monitoring:prometheus \
  --namespace=development
```

This pattern maintains namespace isolation while allowing controlled access. Each namespace owner can independently decide what permissions to grant to external ServiceAccounts.

## Using ClusterRoles with Cross-Namespace RoleBindings

Instead of creating identical Roles in multiple namespaces, use a ClusterRole with namespace-scoped RoleBindings:

```yaml
# metrics-reader-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: metrics-reader
rules:
- apiGroups: [""]
  resources:
    - pods
    - services
    - endpoints
  verbs: ["get", "list", "watch"]
```

Apply the ClusterRole:

```bash
kubectl apply -f metrics-reader-clusterrole.yaml
```

Create RoleBindings that reference the ClusterRole:

```bash
# Bind to production namespace
kubectl create rolebinding prometheus-metrics-access \
  --clusterrole=metrics-reader \
  --serviceaccount=monitoring:prometheus \
  --namespace=production

# Bind to staging namespace
kubectl create rolebinding prometheus-metrics-access \
  --clusterrole=metrics-reader \
  --serviceaccount=monitoring:prometheus \
  --namespace=staging
```

This approach is cleaner when the same permissions apply to multiple namespaces. You maintain one ClusterRole definition and create lightweight RoleBindings as needed.

## Implementing CI/CD Access Patterns

CI/CD systems frequently need cross-namespace access. A Jenkins instance in the `cicd` namespace needs to deploy to `development`, `staging`, and `production` namespaces:

```yaml
# deployment-manager-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-manager
rules:
- apiGroups: ["apps"]
  resources:
    - deployments
    - replicasets
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources:
    - pods
    - services
    - configmaps
    - secrets
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

Create the Jenkins ServiceAccount:

```bash
kubectl create namespace cicd
kubectl create serviceaccount jenkins -n cicd
```

Grant deployment permissions to each environment:

```bash
# Development environment - full access
kubectl create rolebinding jenkins-deploy \
  --clusterrole=deployment-manager \
  --serviceaccount=cicd:jenkins \
  --namespace=development

# Staging environment - full access
kubectl create rolebinding jenkins-deploy \
  --clusterrole=deployment-manager \
  --serviceaccount=cicd:jenkins \
  --namespace=staging

# Production environment - read-only for safety
kubectl create role production-reader \
  --verb=get,list,watch \
  --resource=deployments,pods,services \
  --namespace=production

kubectl create rolebinding jenkins-readonly \
  --role=production-reader \
  --serviceaccount=cicd:jenkins \
  --namespace=production
```

This setup allows Jenkins to deploy to development and staging but only view production resources. Manual approval processes can handle production deployments using a different ServiceAccount with write access.

## Security Considerations for Cross-Namespace Access

Cross-namespace permissions break namespace isolation, so apply them carefully:

**Document All Cross-Namespace Bindings**: Maintain a registry of which ServiceAccounts have access to which namespaces and why.

**Use Specific Permissions**: Avoid granting wildcards or overly broad permissions. Define exactly what resources and verbs are needed.

**Audit Regularly**: Review cross-namespace bindings quarterly to ensure they are still necessary:

```bash
# Find all RoleBindings with cross-namespace subjects
kubectl get rolebindings --all-namespaces -o json | \
  jq -r '.items[] |
  select(.subjects[]?.namespace? and
         .subjects[].namespace != .metadata.namespace) |
  "\(.metadata.namespace)/\(.metadata.name) references \(.subjects[].namespace)/\(.subjects[].name)"'
```

**Consider Network Policies**: Combine RBAC with NetworkPolicies to control both API access and network traffic:

```yaml
# Allow network traffic from monitoring to production
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 8080  # Metrics port
```

## Automating Cross-Namespace Access Configuration

Create a script to consistently configure cross-namespace access:

```bash
#!/bin/bash
# grant-cross-namespace-access.sh

SOURCE_NAMESPACE=$1
SERVICE_ACCOUNT=$2
TARGET_NAMESPACE=$3
ROLE_NAME=$4

if [ -z "$SOURCE_NAMESPACE" ] || [ -z "$SERVICE_ACCOUNT" ] || \
   [ -z "$TARGET_NAMESPACE" ] || [ -z "$ROLE_NAME" ]; then
  echo "Usage: $0 <source-ns> <sa-name> <target-ns> <role-name>"
  exit 1
fi

# Verify ServiceAccount exists
if ! kubectl get serviceaccount "$SERVICE_ACCOUNT" -n "$SOURCE_NAMESPACE" &>/dev/null; then
  echo "ServiceAccount $SOURCE_NAMESPACE/$SERVICE_ACCOUNT does not exist"
  exit 1
fi

# Verify target namespace exists
if ! kubectl get namespace "$TARGET_NAMESPACE" &>/dev/null; then
  echo "Target namespace $TARGET_NAMESPACE does not exist"
  exit 1
fi

# Create the RoleBinding
kubectl create rolebinding "${SERVICE_ACCOUNT}-access" \
  --clusterrole="$ROLE_NAME" \
  --serviceaccount="${SOURCE_NAMESPACE}:${SERVICE_ACCOUNT}" \
  --namespace="$TARGET_NAMESPACE"

echo "Granted $SOURCE_NAMESPACE/$SERVICE_ACCOUNT access to $TARGET_NAMESPACE via $ROLE_NAME"
```

Use the script to grant access:

```bash
chmod +x grant-cross-namespace-access.sh
./grant-cross-namespace-access.sh monitoring prometheus production metrics-reader
```

Cross-namespace ServiceAccount permissions enable necessary communication patterns while maintaining security boundaries. By carefully scoping permissions and documenting access patterns, you can implement secure cross-namespace interactions without giving services unnecessary cluster-wide privileges. The key is treating each cross-namespace grant as a deliberate architectural decision rather than a quick fix.
