# How to Use RBAC to Restrict Access to Kubernetes Secrets Based on Name Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Restrict access to Kubernetes Secrets using RBAC resourceNames with name prefixes to grant fine-grained permissions based on secret naming conventions.

---

Secrets contain sensitive data like passwords, tokens, and certificates. Granting blanket secret access to all secrets in a namespace risks exposing credentials that applications don't need. Using resourceNames in RBAC policies restricts access to specific secrets or secrets matching naming patterns.

## Understanding resourceNames in RBAC

The resourceNames field in RBAC rules limits permissions to specific resource instances. For secrets, this means you can grant access to database-credentials but not api-keys, even though both exist in the same namespace.

This granularity enables multiple applications to coexist in a namespace while maintaining secret isolation. Each application's service account can only access its own secrets.

## Creating Application-Specific Secret Access

Grant access to secrets with specific names only.

```yaml
# rbac-app-secrets.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-secret-access
  namespace: production
rules:
# Access to application-specific secrets only
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    - "myapp-db-credentials"
    - "myapp-api-keys"
    - "myapp-tls-cert"
  verbs: ["get"]

# No access to other secrets in the namespace
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-secret-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: myapp-secret-access
subjects:
- kind: ServiceAccount
  name: myapp-sa
  namespace: production
```

The service account can read its secrets but not others.

```bash
# This works
kubectl get secret myapp-db-credentials -n production \
  --as=system:serviceaccount:production:myapp-sa

# This fails
kubectl get secret other-app-secrets -n production \
  --as=system:serviceaccount:production:myapp-sa
# Error: Forbidden
```

## Implementing Prefix-Based Secret Access

Use naming conventions to organize secrets by prefix.

```yaml
# secret-examples.yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: app-a-database
  namespace: shared
type: Opaque
data:
  password: cGFzc3dvcmQ=
---
apiVersion: v1
kind: Secret
metadata:
  name: app-a-api-key
  namespace: shared
type: Opaque
data:
  key: YXBpa2V5
---
apiVersion: v1
kind: Secret
metadata:
  name: app-b-database
  namespace: shared
type: Opaque
data:
  password: c2VjcmV0
---
apiVersion: v1
kind: Secret
metadata:
  name: shared-tls-cert
  namespace: shared
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi...
  tls.key: LS0tLS1CRUdJTi...
```

Grant access based on name prefix.

```yaml
# rbac-prefix-access.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-a-sa
  namespace: shared
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-a-secret-access
  namespace: shared
rules:
# Access to app-a prefixed secrets
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    - "app-a-database"
    - "app-a-api-key"
  verbs: ["get", "list", "watch"]

# Access to shared secrets
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    - "shared-tls-cert"
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-a-binding
  namespace: shared
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: app-a-secret-access
subjects:
- kind: ServiceAccount
  name: app-a-sa
  namespace: shared
```

## Creating Dynamic Secret Access Patterns

Build roles that adapt to naming patterns.

```yaml
# rbac-dynamic-secrets.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-sa
  namespace: production
  labels:
    app: backend
    tier: backend
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-secret-access
  namespace: production
rules:
# Access to backend-specific secrets
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    # Database credentials
    - "backend-postgres-creds"
    - "backend-redis-creds"

    # API keys
    - "backend-external-api-key"
    - "backend-payment-api-key"

    # Certificates
    - "backend-tls-cert"
    - "backend-ca-cert"

    # Configuration secrets
    - "backend-config-secret"
  verbs: ["get"]

# Can list secrets to discover available ones
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["list"]
```

## Implementing Team-Based Secret Access

Organize secrets by team and grant access accordingly.

```yaml
# rbac-team-secrets.yaml
---
# Platform team secrets
apiVersion: v1
kind: Secret
metadata:
  name: platform-aws-credentials
  namespace: production
  labels:
    team: platform
---
apiVersion: v1
kind: Secret
metadata:
  name: platform-github-token
  namespace: production
  labels:
    team: platform
---
# Data team secrets
apiVersion: v1
kind: Secret
metadata:
  name: data-warehouse-creds
  namespace: production
  labels:
    team: data
---
apiVersion: v1
kind: Secret
metadata:
  name: data-lake-access-key
  namespace: production
  labels:
    team: data
```

Grant access based on team ownership.

```yaml
# rbac-team-access.yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: platform-team-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: platform-team-secret-access
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    - "platform-aws-credentials"
    - "platform-github-token"
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: platform-team-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: platform-team-secret-access
subjects:
- kind: ServiceAccount
  name: platform-team-sa
  namespace: production
- kind: Group
  name: "platform-engineers"
  apiGroup: rbac.authorization.k8s.io
```

## Creating Environment-Specific Secret Access

Separate secrets by environment using prefixes.

```yaml
# secrets-by-environment.yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: dev-myapp-database
  namespace: myapp
---
apiVersion: v1
kind: Secret
metadata:
  name: staging-myapp-database
  namespace: myapp
---
apiVersion: v1
kind: Secret
metadata:
  name: prod-myapp-database
  namespace: myapp
```

Grant access based on environment.

```yaml
# rbac-environment-secrets.yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-dev-sa
  namespace: myapp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-dev-secrets
  namespace: myapp
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    - "dev-myapp-database"
    - "dev-myapp-api-key"
    - "dev-myapp-cache"
  verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-prod-sa
  namespace: myapp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-prod-secrets
  namespace: myapp
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    - "prod-myapp-database"
    - "prod-myapp-api-key"
    - "prod-myapp-cache"
  verbs: ["get"]
```

## Auditing Secret Access

Track which service accounts access which secrets.

```bash
# List all secret access permissions
kubectl get roles,clusterroles --all-namespaces -o json | \
  jq -r '.items[] | select(.rules[]?.resources[]? == "secrets") |
    {namespace: .metadata.namespace, role: .metadata.name,
     secrets: [.rules[]? | select(.resources[]? == "secrets") | .resourceNames]}'

# Find service accounts with access to specific secret
SECRET_NAME="myapp-db-credentials"
kubectl get rolebindings -n production -o json | \
  jq -r --arg secret "$SECRET_NAME" '.items[] |
    select(.roleRef.name as $role |
      (kubectl get role $role -n production -o json |
       .rules[]?.resourceNames[]? == $secret)) |
    {binding: .metadata.name, subjects: .subjects}'

# Check if service account can access secret
kubectl auth can-i get secret/myapp-db-credentials -n production \
  --as=system:serviceaccount:production:myapp-sa
```

## Implementing Secret Rotation-Friendly Access

Allow access to versioned secrets.

```yaml
# rbac-versioned-secrets.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-versioned-secrets
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
    # Current version
    - "myapp-db-creds-v3"

    # Previous version (for rollback)
    - "myapp-db-creds-v2"

    # API key current and previous
    - "myapp-api-key-v5"
    - "myapp-api-key-v4"
  verbs: ["get"]
```

Update RBAC when rotating secrets.

```bash
# Add new secret version to RBAC
kubectl patch role myapp-versioned-secrets -n production --type=json \
  -p='[{"op": "add", "path": "/rules/0/resourceNames/-", "value": "myapp-db-creds-v4"}]'

# Remove old version
kubectl patch role myapp-versioned-secrets -n production --type=json \
  -p='[{"op": "remove", "path": "/rules/0/resourceNames/1"}]'
```

## Creating Wildcard Alternative Using Labels

Since RBAC doesn't support wildcard resourceNames, use labels and admission controllers.

```yaml
# admission-controller-secret-filter.yaml
# This is pseudocode for an admission webhook
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: secret-access-filter
webhooks:
- name: filter-secret-access.example.com
  rules:
  - operations: ["GET"]
    apiGroups: [""]
    resources: ["secrets"]
  clientConfig:
    service:
      name: secret-filter-webhook
      namespace: kube-system
  admissionReviewVersions: ["v1"]
```

The webhook validates secret access based on naming patterns.

## Testing Secret Access Restrictions

Verify resourceNames work correctly.

```bash
# Create test secrets
kubectl create secret generic app-a-secret -n test --from-literal=key=valueA
kubectl create secret generic app-b-secret -n test --from-literal=key=valueB

# Create service account with restricted access
kubectl create sa app-a-sa -n test

kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-a-secret-role
  namespace: test
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-a-secret"]
  verbs: ["get"]
EOF

kubectl create rolebinding app-a-binding -n test \
  --role=app-a-secret-role \
  --serviceaccount=test:app-a-sa

# Test allowed access
kubectl auth can-i get secret/app-a-secret -n test \
  --as=system:serviceaccount:test:app-a-sa
# yes

# Test denied access
kubectl auth can-i get secret/app-b-secret -n test \
  --as=system:serviceaccount:test:app-a-sa
# no
```

Using RBAC resourceNames to restrict secret access by name creates fine-grained permissions within namespaces. Establish naming conventions for secrets based on application, team, or environment, then grant access only to secrets matching those patterns. This approach enables secret isolation even when multiple applications share a namespace.
