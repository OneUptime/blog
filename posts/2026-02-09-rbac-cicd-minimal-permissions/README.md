# How to Build RBAC Roles for CI/CD Service Accounts with Minimal Deployment Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, CI/CD

Description: Build RBAC roles for CI/CD service accounts that grant minimal deployment permissions, enabling automated deployments while maintaining security and preventing unauthorized changes.

---

CI/CD pipelines need Kubernetes access to deploy applications, but granting broad permissions risks compromise. A leaked CI/CD token with cluster-admin access allows attackers to take over the entire cluster. Minimal deployment permissions limit damage from compromised credentials while still enabling automated deployments.

## Understanding CI/CD Permission Requirements

CI/CD systems typically need to create and update deployments, services, and configuration. They should not need to delete production resources, modify RBAC, or access secrets beyond what they deploy. Start with zero permissions and add only what deployment workflows actually require.

Different environments have different risk profiles. Development CI/CD can have broader permissions while production should be heavily restricted with manual approval gates.

## Creating Basic Deployment ServiceAccount

Build a service account for deploying applications.

```yaml
# rbac-cicd-deployer.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-deployer
  namespace: production
  annotations:
    description: "CI/CD service account for application deployments"
    owner: "platform-team@company.com"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-deployer-role
  namespace: production
rules:
# Manage deployments
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]

# Read replica sets (created by deployments)
- apiGroups: ["apps"]
  resources: ["replicasets"]
  verbs: ["get", "list"]

# Read pods (for deployment status)
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list"]

# Read pod logs (for debugging deployments)
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]

# Manage services
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "create", "update", "patch"]

# Manage config maps
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]

# Read secrets (deployment may reference them)
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]

# Explicitly no delete permissions
# Explicitly no RBAC permissions
# Explicitly no namespace or cluster-level resources
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-deployer-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cicd-deployer-role
subjects:
- kind: ServiceAccount
  name: cicd-deployer
  namespace: production
```

This role allows creating and updating deployments but cannot delete them or modify RBAC.

## Implementing Multi-Environment CI/CD Access

Create different permission levels for each environment.

```yaml
# rbac-cicd-dev.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-dev
  namespace: development
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-dev-role
  namespace: development
rules:
# Full control in dev (including delete)
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["*"]

- apiGroups: [""]
  resources: ["services", "configmaps", "secrets"]
  verbs: ["*"]

- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "delete"]

# Still no RBAC permissions
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-dev-binding
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cicd-dev-role
subjects:
- kind: ServiceAccount
  name: cicd-dev
  namespace: development
```

```yaml
# rbac-cicd-staging.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-staging
  namespace: staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-staging-role
  namespace: staging
rules:
# Create and update (no delete)
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "create", "update", "patch"]

- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]

- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

# Read-only secrets
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-staging-binding
  namespace: staging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cicd-staging-role
subjects:
- kind: ServiceAccount
  name: cicd-staging
  namespace: staging
```

## Creating Token for CI/CD Access

Generate long-lived token for CI/CD system.

```yaml
# cicd-token-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cicd-deployer-token
  namespace: production
  annotations:
    kubernetes.io/service-account.name: cicd-deployer
type: kubernetes.io/service-account-token
```

Retrieve and use the token.

```bash
# Get token
TOKEN=$(kubectl get secret cicd-deployer-token -n production \
  -o jsonpath='{.data.token}' | base64 -d)

# Get CA certificate
kubectl get secret cicd-deployer-token -n production \
  -o jsonpath='{.data.ca\.crt}' | base64 -d > ca.crt

# Configure kubectl in CI/CD
kubectl config set-cluster production \
  --server=https://kubernetes.production.company.com \
  --certificate-authority=ca.crt

kubectl config set-credentials cicd-deployer --token=$TOKEN

kubectl config set-context cicd-production \
  --cluster=production \
  --user=cicd-deployer \
  --namespace=production

kubectl config use-context cicd-production
```

## Implementing Helm-Specific RBAC

Grant permissions for Helm deployments.

```yaml
# rbac-cicd-helm.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cicd-helm
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cicd-helm-role
  namespace: production
rules:
# Helm release management
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "create", "update", "patch"]

# Workload resources
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "create", "update", "patch"]

- apiGroups: [""]
  resources: ["services", "configmaps", "persistentvolumeclaims"]
  verbs: ["get", "list", "create", "update", "patch"]

- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

# Ingress
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "create", "update", "patch"]

# Service accounts (Helm creates these)
- apiGroups: [""]
  resources: ["serviceaccounts"]
  verbs: ["get", "list", "create", "update", "patch"]

# Roles and role bindings (if charts include them)
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "rolebindings"]
  verbs: ["get", "list", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-helm-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cicd-helm-role
subjects:
- kind: ServiceAccount
  name: cicd-helm
  namespace: production
```

## Creating GitOps-Friendly RBAC

Build roles for ArgoCD or Flux controllers.

```yaml
# rbac-cicd-gitops.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-deployer
  namespace: argocd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-deployer-role
rules:
# Read cluster-scoped resources
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]

# Manage applications
- apiGroups: ["argoproj.io"]
  resources: ["applications", "applicationsets", "appprojects"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-deployer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-deployer-role
subjects:
- kind: ServiceAccount
  name: argocd-deployer
  namespace: argocd
---
# Per-namespace application deployment
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-app-deployer
  namespace: production
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "create", "update", "patch"]
# Delete excluded for safety
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-app-deployer-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argocd-app-deployer
subjects:
- kind: ServiceAccount
  name: argocd-deployer
  namespace: argocd
```

## Implementing GitHub Actions RBAC

Configure service account for GitHub Actions.

```yaml
# rbac-cicd-github-actions.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: github-actions
  namespace: production
  annotations:
    github.com/repository: "company/myapp"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: github-actions-role
  namespace: production
rules:
# Deploy applications
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]

- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]

# Read pods for status checks
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list"]

# Read secrets (referenced in deployments)
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: github-actions-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: github-actions-role
subjects:
- kind: ServiceAccount
  name: github-actions
  namespace: production
```

Use in GitHub Actions workflow.

```yaml
# .github/workflows/deploy.yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_TOKEN }}" | base64 -d > /tmp/token
          kubectl config set-cluster production \
            --server=${{ secrets.KUBE_SERVER }} \
            --insecure-skip-tls-verify=true

          kubectl config set-credentials github-actions \
            --token=$(cat /tmp/token)

          kubectl config set-context production \
            --cluster=production \
            --user=github-actions \
            --namespace=production

      - name: Deploy
        run: |
          kubectl apply -f k8s/deployment.yaml
          kubectl rollout status deployment/myapp -n production
```

## Auditing CI/CD Access

Monitor CI/CD service account usage.

```bash
# Find CI/CD service accounts
kubectl get sa --all-namespaces | grep -i cicd

# Check permissions
kubectl auth can-i --list \
  --as=system:serviceaccount:production:cicd-deployer \
  -n production

# Audit CI/CD operations
jq -r 'select(.user.username |
    contains("serviceaccount:production:cicd-deployer")) |
  "\(.requestReceivedTimestamp) \(.verb) \(.objectRef.resource)/\(.objectRef.name)"' \
  /var/log/kubernetes/audit.log | tail -50

# Check for failed authorization
jq -r 'select(.user.username |
    contains("serviceaccount") and .responseStatus.code==403) |
  "\(.requestReceivedTimestamp) \(.user.username) denied \(.verb) \(.objectRef.resource)"' \
  /var/log/kubernetes/audit.log
```

## Rotating CI/CD Credentials

Implement credential rotation.

```bash
# Create new token secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: cicd-deployer-token-new
  namespace: production
  annotations:
    kubernetes.io/service-account.name: cicd-deployer
type: kubernetes.io/service-account-token
EOF

# Update CI/CD system with new token
NEW_TOKEN=$(kubectl get secret cicd-deployer-token-new -n production \
  -o jsonpath='{.data.token}' | base64 -d)

# Update secret in GitHub/GitLab
gh secret set KUBE_TOKEN --body "$NEW_TOKEN"

# Delete old token after verification
kubectl delete secret cicd-deployer-token -n production
kubectl delete secret cicd-deployer-token-new -n production
```

## Testing CI/CD Permissions

Verify service account has correct permissions.

```bash
# Test deployment creation
kubectl auth can-i create deployment -n production \
  --as=system:serviceaccount:production:cicd-deployer
# yes

# Test deployment deletion (should be no)
kubectl auth can-i delete deployment -n production \
  --as=system:serviceaccount:production:cicd-deployer
# no

# Test RBAC modification (should be no)
kubectl auth can-i create role -n production \
  --as=system:serviceaccount:production:cicd-deployer
# no

# Test secret access
kubectl auth can-i get secrets -n production \
  --as=system:serviceaccount:production:cicd-deployer
# yes
```

CI/CD service accounts need minimal permissions to deploy applications safely. Grant create and update permissions for deployments, services, and configuration, but deny delete operations and RBAC modifications. Use different service accounts with different permission levels for development, staging, and production environments. Audit CI/CD operations regularly and rotate credentials to maintain security.
