# How to Configure Role-Based Access for CI/CD Pipelines in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Security, CI/CD

Description: Learn how to set up secure RBAC configurations for CI/CD pipelines in Rancher so automated deployments have only the permissions they need.

CI/CD pipelines need Kubernetes access to deploy applications, but giving them broad permissions is a security risk. A compromised pipeline with cluster-admin access could destroy your entire environment. This guide shows how to configure Rancher RBAC for CI/CD pipelines following the principle of least privilege.

## Prerequisites

- Rancher v2.7+ with a managed cluster
- A CI/CD system (Jenkins, GitLab CI, GitHub Actions, ArgoCD, or similar)
- kubectl access to the target cluster
- Understanding of your deployment workflow

## Step 1: Create a Dedicated Service Account

Create a service account specifically for your CI/CD pipeline. Never share service accounts between different pipelines or tools.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-deployer
  namespace: production
  labels:
    app.kubernetes.io/managed-by: cicd
    purpose: automated-deployment
```

```bash
kubectl apply -f cicd-service-account.yaml
```

## Step 2: Define a Deployment Role

Create a role that allows only the actions needed for deployment:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-deployer-role
  namespace: production
rules:
  # Manage deployments
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Manage services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Manage configmaps (for app configuration)
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # View pods and logs (for deployment verification)
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  # Manage ingresses
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # View events (for debugging failed deployments)
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
```

```bash
kubectl apply -f cicd-role.yaml
```

Notice that `delete` is intentionally omitted for most resources. The pipeline should update deployments, not delete them.

## Step 3: Bind the Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-deployer-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: cicd-deployer
    namespace: production
roleRef:
  kind: Role
  name: cicd-deployer-role
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f cicd-rolebinding.yaml
```

## Step 4: Create a Multi-Namespace Deployment Role

If your pipeline deploys to multiple namespaces, create a ClusterRole and bind it to specific namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cicd-deployer-clusterrole
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log", "events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
```

Bind it to each target namespace individually:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-deployer-staging
  namespace: staging
subjects:
  - kind: ServiceAccount
    name: cicd-deployer
    namespace: production
roleRef:
  kind: ClusterRole
  name: cicd-deployer-clusterrole
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-deployer-production
  namespace: production
subjects:
  - kind: ServiceAccount
    name: cicd-deployer
    namespace: production
roleRef:
  kind: ClusterRole
  name: cicd-deployer-clusterrole
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f cicd-multi-namespace.yaml
```

## Step 5: Generate a Kubeconfig for the CI/CD Pipeline

Create a kubeconfig that uses the service account:

```bash
#!/bin/bash
# generate-cicd-kubeconfig.sh

NAMESPACE="production"
SA_NAME="cicd-deployer"
CLUSTER_NAME="my-cluster"
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CA_DATA=$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

# Create a token (valid for 24 hours - rotate in CI/CD)

TOKEN=$(kubectl create token $SA_NAME -n $NAMESPACE --duration=24h)

cat > cicd-kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: ${CLUSTER_NAME}
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${CA_DATA}
contexts:
  - name: cicd-context
    context:
      cluster: ${CLUSTER_NAME}
      namespace: ${NAMESPACE}
      user: ${SA_NAME}
current-context: cicd-context
users:
  - name: ${SA_NAME}
    user:
      token: ${TOKEN}
EOF

echo "Kubeconfig written to cicd-kubeconfig.yaml"
```

## Step 6: Configure Rancher API Access for CI/CD

Alternatively, on Rancher v2.8+, if your CI/CD system needs to call Rancher itself, use a dedicated Rancher user with access only to the target cluster or project and create an API key with no scope. Scoped API keys are for the downstream cluster Kubernetes API, not Rancher's own API:

1. Log in to Rancher as the CI/CD user (create a dedicated local user for this).
2. Go to **User Avatar > Account & API Keys**.
3. Click **Create API Key**.
4. Set a description like `CI/CD Pipeline - Production Cluster`.
5. Set an expiration date.
6. Leave the scope unset.
7. Save the key securely.

Use the API key in your pipeline to generate a kubeconfig for the target cluster:

```bash
# In your CI/CD pipeline
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:xxxxxxxxxxxxxxxxxxxx"
export CLUSTER_ID="c-m-xxxxx"

cat > rancher-api-kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: rancher
    cluster:
      server: ${RANCHER_URL}
users:
  - name: rancher
    user:
      token: ${RANCHER_TOKEN}
contexts:
  - name: rancher
    context:
      cluster: rancher
      user: rancher
current-context: rancher
EOF

kubectl --kubeconfig rancher-api-kubeconfig.yaml create \
  -o jsonpath='{.status.value}' \
  -f - <<EOF > kubeconfig.yaml
apiVersion: ext.cattle.io/v1
kind: Kubeconfig
spec:
  clusters:
    - ${CLUSTER_ID}
EOF

export KUBECONFIG=kubeconfig.yaml
kubectl apply -f deployment.yaml
```

## Step 7: Set Up Separate Roles per Environment

Create different permission levels for different environments:

```yaml
# Staging - more permissive (allows delete for cleanup)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-staging-role
  namespace: staging
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch", "delete"]
---
# Production - restrictive (no delete, no secrets management)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-production-role
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log", "events"]
    verbs: ["get", "list", "watch"]
```

## Step 8: Integrate with Rancher's Project RBAC

If your CI/CD system authenticates to Rancher as a dedicated Rancher user, integrate that user with Rancher's project model:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: cicd-deployer-template
context: project
displayName: CI/CD Deployer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log", "events"]
    verbs: ["get", "list", "watch"]
```

Then assign that Rancher user to the project with this custom role.

## Step 9: Verify Pipeline Permissions

Test the CI/CD service account's permissions before using it in production:

```bash
# Verify allowed actions
kubectl auth can-i create deployments -n production \
  --as=system:serviceaccount:production:cicd-deployer
# Expected: yes

kubectl auth can-i update deployments -n production \
  --as=system:serviceaccount:production:cicd-deployer
# Expected: yes

# Verify denied actions
kubectl auth can-i delete namespaces \
  --as=system:serviceaccount:production:cicd-deployer
# Expected: no

kubectl auth can-i create clusterroles \
  --as=system:serviceaccount:production:cicd-deployer
# Expected: no

kubectl auth can-i get secrets -n production \
  --as=system:serviceaccount:production:cicd-deployer
# Expected: no (unless explicitly needed)
```

## Best Practices

- **One service account per pipeline**: Each CI/CD pipeline should have its own service account.
- **Short-lived tokens**: Use the TokenRequest API to generate tokens with short expiration times.
- **Environment-specific permissions**: Production pipelines should have more restrictive permissions than staging.
- **No secret access unless needed**: Only grant secret access if the pipeline manages secrets directly.
- **Rotate credentials**: Regularly rotate API keys and tokens used by pipelines.
- **Audit pipeline actions**: Monitor audit logs for actions taken by CI/CD service accounts.
- **Store credentials securely**: Use your CI/CD system's secret management (GitHub Secrets, GitLab CI Variables, Vault) to store kubeconfigs and tokens.

## Conclusion

Properly configured RBAC for CI/CD pipelines ensures that automated deployments are secure and follow least privilege principles. By creating dedicated service accounts with scoped roles, using short-lived tokens, and applying different permission levels per environment, you protect your clusters from both accidental damage and compromised pipeline credentials. Always test your RBAC configuration before deploying to production.
