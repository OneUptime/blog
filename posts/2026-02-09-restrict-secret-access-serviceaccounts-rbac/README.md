# How to Restrict Secret Access to Specific ServiceAccounts with RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Learn how to use Kubernetes RBAC to restrict Secret access to specific ServiceAccounts, implementing least-privilege access control for sensitive credentials.

---

By default, any user or workload that is authorized to create Pods in a namespace can reference any Secret in that namespace through a Pod volume or environment variable. This violates the principle of least privilege and creates security risks. If one application is compromised, attackers may be able to create or modify Pods to expose unrelated secrets, including database credentials, API keys, and certificates.

Kubernetes RBAC allows fine-grained control over direct API access to Secrets. You can restrict which ServiceAccounts can read specific Secrets through the Kubernetes API, ensuring applications only have API permissions for credentials they actually need. This limits blast radius when security incidents occur.

In this guide, you'll learn how to implement Secret access controls using RBAC, create scoped permissions, handle multi-tenant scenarios, and audit Secret access patterns.

## Default Secret Access Behavior

Without explicit RBAC rules, pods using the default ServiceAccount have no special API permissions beyond basic API discovery. However, pods with custom ServiceAccounts can be granted broad API access:

```bash
# Create a test Secret

kubectl create secret generic sensitive-data \
  --from-literal=password=SuperSecret123 \
  --namespace production

# Default ServiceAccount cannot read it through the Kubernetes API
kubectl auth can-i get secret/sensitive-data \
  --namespace production \
  --as system:serviceaccount:production:default
# Output: no
```

However, if a Role or ClusterRole grants `get secrets` to a ServiceAccount without `resourceNames`, it can read ALL secrets in the namespace where the permission applies.

## Creating ServiceAccount-Specific Secret Access

Create a ServiceAccount for a specific application:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-app-sa
  namespace: production
```

Create a Secret for this application:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: web-app-secrets
  namespace: production
type: Opaque
stringData:
  api-key: "sk_live_abc123"
  database-password: "SecurePassword123"
```

Create a Role that grants access ONLY to this specific Secret:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: web-app-secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["web-app-secrets"]  # Restrict to specific Secret
  verbs: ["get"]
```

Bind the Role to the ServiceAccount:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: web-app-secret-access
  namespace: production
subjects:
- kind: ServiceAccount
  name: web-app-sa
  namespace: production
roleRef:
  kind: Role
  name: web-app-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

Use the ServiceAccount in deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      serviceAccountName: web-app-sa
      containers:
      - name: app
        image: web-app:latest
        env:
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: web-app-secrets
              key: api-key
```

Now `web-app-sa` can ONLY read `web-app-secrets` through the Kubernetes API, not other secrets in the namespace. This RBAC rule does not control whether a Pod can mount or reference a Secret; Pod creation permissions and admission policies control that path.

## Multiple Secrets for One ServiceAccount

Grant access to multiple specific Secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-server-secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
  - api-database-credentials
  - api-external-keys
  - api-tls-certificate
  verbs: ["get"]  # Read only the named secrets
```

## Shared Secrets with Multiple ServiceAccounts

Multiple applications sharing the same Secret:

```yaml
# Shared database credentials
apiVersion: v1
kind: Secret
metadata:
  name: shared-database-credentials
  namespace: production
stringData:
  username: "appuser"
  password: "SharedPassword123"
---
# Role for accessing shared secret
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: shared-db-secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["shared-database-credentials"]
  verbs: ["get"]
---
# Binding for web-app
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: web-app-db-access
  namespace: production
subjects:
- kind: ServiceAccount
  name: web-app-sa
roleRef:
  kind: Role
  name: shared-db-secret-reader
  apiGroup: rbac.authorization.k8s.io
---
# Binding for api-server
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-server-db-access
  namespace: production
subjects:
- kind: ServiceAccount
  name: api-server-sa
roleRef:
  kind: Role
  name: shared-db-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

Both `web-app-sa` and `api-server-sa` can now read the shared database credentials through the Kubernetes API.

## Pattern-Based Secret Access

Label Secrets for use with an admission policy:

```yaml
# Secrets with labels
apiVersion: v1
kind: Secret
metadata:
  name: api-key-stripe
  namespace: production
  labels:
    app: payment-processor
    secret-type: api-key
stringData:
  key: "sk_live_stripe_123"
---
apiVersion: v1
kind: Secret
metadata:
  name: api-key-paypal
  namespace: production
  labels:
    app: payment-processor
    secret-type: api-key
stringData:
  key: "paypal_api_456"
---
# Role granting broad access; RBAC cannot filter by label selector
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: payment-processor-secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
```

Note: RBAC doesn't support label selectors directly. You must either:
1. List all secret names in `resourceNames`
2. Grant broader API access and filter in application code
3. Use an admission policy engine like OPA Gatekeeper for label-based Pod admission policies

For strict label-based Pod admission, use OPA Gatekeeper:

```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: requiresecretlabel
spec:
  crd:
    spec:
      names:
        kind: RequireSecretLabel
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package requiresecretlabel
      violation[{"msg": msg}] {
        input.review.object.kind == "Pod"
        secret_name := input.review.object.spec.volumes[_].secret.secretName
        secret := data.inventory.namespace[input.review.object.metadata.namespace]["v1"]["Secret"][secret_name]
        sa_label := secret.metadata.labels["allowed-serviceaccount"]
        sa_label != input.review.object.spec.serviceAccountName
        msg := sprintf("Pod ServiceAccount %v not allowed to access secret %v", [input.review.object.spec.serviceAccountName, secret_name])
      }
```

Gatekeeper policies like this require a matching Constraint and a sync configuration that replicates Secrets into `data.inventory`. Admission policies control Pod creation; they do not replace RBAC for direct Secret API reads.

## Read-Only vs Read-Write Access

Different verbs for different access levels:

```yaml
# Read-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-secrets"]
  verbs: ["get"]  # Read only
---
# Read-write access for secret rotation
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-rotator
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-secrets"]
  verbs: ["get", "update", "patch"]  # Can modify
---
# Full management (for operators)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-manager
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
```

## Cross-Namespace Secret Access

Grant API access to Secrets in different namespaces by creating the RoleBinding in the namespace that contains the Secret:

```yaml
# Secret in shared namespace
apiVersion: v1
kind: Secret
metadata:
  name: shared-credentials
  namespace: shared-services
stringData:
  token: "shared-token-123"
---
# Role in the namespace containing the Secret
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: shared-secret-reader
  namespace: shared-services
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["shared-credentials"]
  verbs: ["get"]
---
# RoleBinding in shared-services grants production ServiceAccounts access to this namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: production-shared-secret-access
  namespace: shared-services
subjects:
- kind: ServiceAccount
  name: web-app-sa
  namespace: production
- kind: ServiceAccount
  name: api-server-sa
  namespace: production
roleRef:
  kind: Role
  name: shared-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Verifying Secret Access

Test ServiceAccount permissions:

```bash
# Can the ServiceAccount get the secret?
kubectl auth can-i get secret/web-app-secrets \
  --namespace production \
  --as system:serviceaccount:production:web-app-sa
# Output: yes

# Can it access a different secret?
kubectl auth can-i get secret/admin-credentials \
  --namespace production \
  --as system:serviceaccount:production:web-app-sa
# Output: no

# Can it list all secrets?
kubectl auth can-i list secrets \
  --namespace production \
  --as system:serviceaccount:production:web-app-sa
# Output: no

# Can it delete secrets?
kubectl auth can-i delete secret/web-app-secrets \
  --namespace production \
  --as system:serviceaccount:production:web-app-sa
# Output: no
```

## Real-World Example: Multi-Application Namespace

Complete RBAC setup for multiple applications:

```yaml
# ServiceAccounts
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-frontend-sa
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-backend-sa
  namespace: production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: worker-sa
  namespace: production
---
# Secrets
apiVersion: v1
kind: Secret
metadata:
  name: frontend-secrets
  namespace: production
stringData:
  cdn-key: "cdn_key_123"
  analytics-key: "analytics_456"
---
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: production
stringData:
  jwt-secret: "jwt_secret_789"
  stripe-key: "sk_live_stripe"
---
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
stringData:
  username: "appuser"
  password: "db_password_abc"
---
apiVersion: v1
kind: Secret
metadata:
  name: queue-credentials
  namespace: production
stringData:
  url: "amqp://user:pass@rabbitmq"
---
# Roles
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: frontend-secret-access
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["frontend-secrets"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-secret-access
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
  - backend-secrets
  - database-credentials
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: worker-secret-access
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames:
  - database-credentials
  - queue-credentials
  verbs: ["get"]
---
# RoleBindings
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: frontend-secret-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: web-frontend-sa
roleRef:
  kind: Role
  name: frontend-secret-access
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backend-secret-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: api-backend-sa
roleRef:
  kind: Role
  name: backend-secret-access
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: worker-secret-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: worker-sa
roleRef:
  kind: Role
  name: worker-secret-access
  apiGroup: rbac.authorization.k8s.io
```

## Best Practices

1. **Always use custom ServiceAccounts**: Never use the default ServiceAccount for applications.

2. **Grant minimal API permissions**: Use `resourceNames` to restrict direct API reads to specific Secrets.

3. **Separate secrets by concern**: Don't combine unrelated credentials in one Secret.

4. **Document access patterns**: Comment Roles explaining why specific access is granted.

5. **Regular access reviews**: Audit ServiceAccount permissions quarterly.

6. **Use namespaces for isolation**: Separate sensitive workloads into different namespaces.

7. **Avoid wildcard permissions**: Never grant `verbs: ["*"]` or omit `resourceNames` unless necessary.

8. **Test permissions**: Always verify ServiceAccount API permissions before deployment.

Restricting Secret API access with RBAC implements the principle of least privilege in Kubernetes. By creating ServiceAccount-specific Roles with explicit Secret names, you ensure applications can only read credentials they actually need through the Kubernetes API. This significantly reduces security risk and limits the blast radius of potential compromises.
