# How to Implement Least Privilege Secret Access with Dapr Scoping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Security, Scoping, Least Privilege

Description: Learn how to enforce least privilege secret access in Dapr using component scoping, allowed secrets lists, and secret store policies to restrict which services can access which secrets.

---

## The Principle of Least Privilege for Secrets

Least privilege means each service should only have access to the secrets it needs, nothing more. Without controls, any Dapr service can read any secret from a configured store. Dapr provides two mechanisms to enforce restrictions: component scoping (which services can use a component) and secret scoping via a Dapr Configuration resource (which secrets a store exposes using allowed/denied lists).

## Component Scoping: Restricting Which Services Use a Store

Add `scopes` to a secret store component to restrict which Dapr app IDs can use it:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-secrets
  namespace: default
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "payment-vault"
# Only these app IDs can use this component
scopes:
- payment-service
- billing-service
```

Any service with a different `app-id` attempting to use `payment-secrets` will receive an error. The `orders-service` or `user-service` cannot access payment vault secrets even if they try.

## Allowed Secrets List

Restrict which specific secrets a component exposes using a Dapr Configuration resource. First, define the component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: app-secrets
  namespace: default
spec:
  type: secretstores.kubernetes
  version: v1
  metadata:
  - name: defaultNamespace
    value: "production"
scopes:
- api-service
```

Then, create a Configuration resource that specifies which secrets are allowed:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
    - storeName: app-secrets
      defaultAccess: deny
      allowedSecrets:
      - db-password
      - api-key
      - jwt-secret
```

The `api-service` can only read `db-password`, `api-key`, and `jwt-secret`. Requests for any other secret return an error.

## Denied Secrets List

Alternatively, deny specific secrets while allowing everything else using a Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
    - storeName: app-secrets
      defaultAccess: allow
      deniedSecrets:
      - admin-credentials
      - root-password
      - internal-key
```

## Per-Service Secret Components

For strong isolation, create separate secret store components per service, each pointing to a different namespace or vault path:

```yaml
# Component for the orders service - only has access to order-related secrets
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-secrets
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultKVPrefix
    value: "secret/orders"   # Only can read from secret/orders/*
scopes:
- orders-service
---
# Component for the auth service - only has access to auth-related secrets
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: auth-secrets
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultKVPrefix
    value: "secret/auth"     # Only can read from secret/auth/*
scopes:
- auth-service
```

Then restrict each store's accessible secrets via a Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
    - storeName: orders-secrets
      defaultAccess: deny
      allowedSecrets:
      - database
      - stripe-webhook-key
    - storeName: auth-secrets
      defaultAccess: deny
      allowedSecrets:
      - jwt-signing-key
      - oauth-client-secret
```

## Application Code: Reading Scoped Secrets

Services reference their own scoped component:

```python
from dapr.clients import DaprClient

# orders-service reads from its own component
def get_db_password() -> str:
    with DaprClient() as client:
        secret = client.get_secret(
            store_name="orders-secrets",     # scoped to orders-service only
            key="database",
        )
        return secret.secret["password"]

# Attempting to read auth secrets will fail
def bad_example() -> str:
    with DaprClient() as client:
        # This will fail - orders-service is not scoped to auth-secrets
        secret = client.get_secret(
            store_name="auth-secrets",
            key="jwt-signing-key",
        )
```

## Kubernetes RBAC Integration

Combine Dapr scoping with Kubernetes RBAC for defense in depth:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: orders-secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["orders-db-password", "orders-stripe-key"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: orders-secret-binding
subjects:
- kind: ServiceAccount
  name: orders-service-sa
roleRef:
  kind: Role
  name: orders-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Summary

Dapr secret access can be restricted using component-level scoping (which services can access a component), a Dapr Configuration resource with allowed or denied secrets lists (which secrets are exposed per store), and per-service secret store components pointing to isolated vault paths. Combine these with Kubernetes RBAC for layered defense. The goal is that a compromised service can only access the secrets it legitimately needs, limiting blast radius.
