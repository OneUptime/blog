# How to Build RBAC Roles That Allow ConfigMap and Secret Read Access Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, ConfigMap, Secret, Security

Description: Learn how to create RBAC roles that grant read-only access to ConfigMaps and Secrets, enabling visibility for debugging without allowing modification or deletion.

---

Configuration and secrets are critical to application functionality. Developers need to verify environment variables, check configuration values, and troubleshoot connection strings without the ability to modify or delete them. Read-only access strikes the right balance between operational visibility and security.

The default Kubernetes `view` role grants read access to most resources but intentionally excludes Secret contents for security. Building custom roles allows fine-grained control over what configuration data users can read and in which namespaces.

## Understanding ConfigMap and Secret RBAC

ConfigMaps and Secrets are standard Kubernetes resources controlled by RBAC verbs:

**get**: Retrieve a specific ConfigMap or Secret by name. Required to read contents.

**list**: List all ConfigMaps or Secrets in a namespace. Shows names and metadata but not contents unless combined with get.

**watch**: Stream updates when ConfigMaps or Secrets change. Useful for automated tools.

**create/update/patch/delete**: Modification operations. Exclude these for read-only access.

A role with `get` and `list` allows reading all configuration data. A role with only `list` allows seeing what exists without reading contents. This distinction matters for Secrets containing sensitive data.

## Creating a ConfigMap Reader Role

Start with a role that grants read-only access to ConfigMaps:

```yaml
# configmap-reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: configmap-reader
  namespace: production
rules:
- apiGroups: [""]
  resources:
    - configmaps
  verbs: ["get", "list", "watch"]
```

Apply and bind to developers:

```bash
kubectl apply -f configmap-reader-role.yaml

kubectl create rolebinding dev-configmap-read \
  --role=configmap-reader \
  --group=developers \
  --namespace=production
```

Developers can now read ConfigMaps:

```bash
# List all ConfigMaps
kubectl get configmaps -n production

# Read a specific ConfigMap
kubectl get configmap app-config -n production -o yaml

# Watch for changes
kubectl get configmaps -n production --watch
```

They cannot modify ConfigMaps:

```bash
# This fails
kubectl create configmap test-config --from-literal=key=value -n production
# Error: User cannot create resource "configmaps"

kubectl delete configmap app-config -n production
# Error: User cannot delete resource "configmaps"
```

## Creating a Secret Reader Role with Full Access

For users who need to read Secret contents:

```yaml
# secret-reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["get", "list", "watch"]
```

Apply and bind:

```bash
kubectl apply -f secret-reader-role.yaml

kubectl create rolebinding ops-secret-read \
  --role=secret-reader \
  --group=operations-team \
  --namespace=production
```

Operations team can read secrets:

```bash
# List secrets
kubectl get secrets -n production

# Read secret contents
kubectl get secret database-password -n production -o jsonpath='{.data.password}' | base64 -d
```

Be cautious granting full Secret read access. Secrets may contain database passwords, API keys, and TLS certificates.

## Creating a Secret Lister Role (Metadata Only)

For users who need to see what secrets exist without reading values:

```yaml
# secret-lister-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-lister
  namespace: production
rules:
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["list"]  # Only list, no get
```

Apply and bind:

```bash
kubectl apply -f secret-lister-role.yaml

kubectl create rolebinding dev-secret-list \
  --role=secret-lister \
  --group=developers \
  --namespace=production
```

Developers can list secrets but not read contents:

```bash
# This works
kubectl get secrets -n production
# Shows: NAME, TYPE, DATA, AGE

# This fails
kubectl get secret database-password -n production -o yaml
# Error: User cannot get resource "secrets"
```

## Restricting Access to Specific ConfigMaps and Secrets

Grant access to specific resources only:

```yaml
# specific-config-reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-config-reader
  namespace: production
rules:
# Access only to specific ConfigMaps
- apiGroups: [""]
  resources:
    - configmaps
  resourceNames:
    - app-config
    - feature-flags
  verbs: ["get"]

# Access only to specific Secrets
- apiGroups: [""]
  resources:
    - secrets
  resourceNames:
    - app-api-key
  verbs: ["get"]
```

Users can read only the named resources:

```bash
# This works
kubectl get configmap app-config -n production

# This fails
kubectl get configmap other-config -n production
# Error: cannot get resource "configmaps" with name "other-config"
```

This pattern is useful for service accounts that need specific configuration but should not access other secrets in the namespace.

## Combining ConfigMap and Secret Read Access

Create a unified role for reading both ConfigMaps and Secrets:

```yaml
# config-reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: config-reader
rules:
# Read ConfigMaps everywhere
- apiGroups: [""]
  resources:
    - configmaps
  verbs: ["get", "list", "watch"]

# Read Secrets everywhere (use carefully)
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["get", "list", "watch"]
```

Bind to specific namespaces:

```bash
kubectl apply -f config-reader-role.yaml

# Grant in development namespace
kubectl create rolebinding dev-config-read \
  --clusterrole=config-reader \
  --group=developers \
  --namespace=development

# Do NOT grant in production
# Production secrets require elevated access
```

## Granting Read Access for Monitoring Systems

Monitoring systems need to read ConfigMaps and Secrets to verify configuration:

```yaml
# monitoring-config-reader-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: config-monitor
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: config-monitor-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: config-reader
subjects:
- kind: ServiceAccount
  name: config-monitor
  namespace: monitoring
```

The monitoring ServiceAccount can read configuration across all namespaces.

## Preventing ConfigMap and Secret Modification

Verify users cannot modify configuration:

```bash
# Test as developer user
kubectl auth can-i get configmaps --namespace=production --as=developer@company.com
# Should return: yes

kubectl auth can-i update configmaps --namespace=production --as=developer@company.com
# Should return: no

kubectl auth can-i delete secrets --namespace=production --as=developer@company.com
# Should return: no
```

Attempt modifications to confirm they fail:

```bash
# Try to modify a ConfigMap
kubectl patch configmap app-config -n production \
  -p '{"data":{"key":"value"}}' \
  --as=developer@company.com
# Error: User cannot patch resource "configmaps"

# Try to delete a Secret
kubectl delete secret app-api-key -n production --as=developer@company.com
# Error: User cannot delete resource "secrets"
```

## Auditing ConfigMap and Secret Access

Track who reads sensitive configuration:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log secret access
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["get", "list"]

# Log ConfigMap access in production
- level: Metadata
  resources:
  - group: ""
    resources: ["configmaps"]
  namespaces: ["production"]
  verbs: ["get", "list"]
```

Query audit logs:

```bash
# Who is reading secrets?
jq 'select(.objectRef.resource=="secrets" and .verb in ["get", "list"]) |
    {user: .user.username, secret: .objectRef.name, namespace: .objectRef.namespace}' \
  /var/log/kubernetes/audit.log

# Frequent secret readers
jq 'select(.objectRef.resource=="secrets" and .verb=="get") |
    .user.username' \
  /var/log/kubernetes/audit.log | sort | uniq -c | sort -rn
```

## Using External Secrets Operator for Better Control

For stricter secret access control, use External Secrets Operator:

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
  data:
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
```

Configure SecretStore with limited RBAC:

```yaml
# secret-store-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: external-secrets-role
  namespace: production
rules:
# Can only create/update secrets, not read them
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["create", "update", "patch"]
# No "get" or "list" permission
```

This pattern keeps actual secrets in Vault or AWS Secrets Manager. Kubernetes users with read access to Secrets still need Vault permissions to read values.

## Implementing Break-Glass for Emergency Secret Access

For emergencies, create temporary access:

```bash
#!/bin/bash
# grant-emergency-secret-access.sh

USER=$1
NAMESPACE=$2
DURATION=${3:-1h}

if [ -z "$USER" ] || [ -z "$NAMESPACE" ]; then
  echo "Usage: $0 <user> <namespace> [duration]"
  exit 1
fi

# Create temporary RoleBinding
kubectl create rolebinding "emergency-secret-access-${USER}" \
  --clusterrole=secret-reader \
  --user="$USER" \
  --namespace="$NAMESPACE"

echo "Granted emergency secret access to $USER in $NAMESPACE"
echo "Remember to revoke after $DURATION"

# Set reminder to revoke
sleep "$DURATION" && \
  kubectl delete rolebinding "emergency-secret-access-${USER}" -n "$NAMESPACE" &
```

Use during incidents:

```bash
./grant-emergency-secret-access.sh oncall@company.com production 30m
```

Revoke after incident resolution.

## Best Practices for Read-Only Config Access

Follow these guidelines:

**Separate Development and Production**: Grant read access freely in development, restrict in production.

**Use resourceNames When Possible**: Limit access to specific ConfigMaps/Secrets rather than all.

**Prefer ConfigMaps Over Secrets for Non-Sensitive Data**: ConfigMaps have fewer access restrictions and audit requirements.

**Rotate Secrets Regularly**: Read-only access is still access. Regular rotation limits exposure window.

**Monitor Access Patterns**: Alert on unusual secret access volumes or access by unexpected users.

Read-only RBAC for ConfigMaps and Secrets enables safe operational visibility. Users can verify configuration and troubleshoot issues without risk of accidentally modifying or deleting critical data. Combined with audit logging and external secret management, this approach balances operational needs with security requirements.
