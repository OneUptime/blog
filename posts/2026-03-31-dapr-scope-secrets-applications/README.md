# How to Scope Secrets to Specific Applications in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Scoping, Security, Access Control

Description: Restrict Dapr secret store access to specific applications using allowedSecrets and deniedSecrets scoping rules to enforce least-privilege secret access.

---

By default, any Dapr-enabled application that can reach a secret store component can read any secret in it. Secret scoping lets you enforce least-privilege access by explicitly allowing or denying specific secrets per application.

## Secret Scoping Options

Dapr provides secret-level access control through a **Configuration** resource (not the Component YAML). The Configuration resource supports three scoping settings under `spec.secrets.scopes`:

- `allowedSecrets`: Whitelist - only these secrets are accessible (all others denied)
- `deniedSecrets`: Blacklist - these secrets are blocked (all others allowed)
- `defaultAccess`: `"allow"` or `"deny"` - default behavior when a secret is not in either list

## Namespace-Level Scoping with allowedSecrets

Restrict the `payment-service` to only access its own secrets. First, scope the Component so only `payment-service` can use it:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysecretstore
  namespace: payment-service-ns
spec:
  type: secretstores.kubernetes
  version: v1
scopes:
- payment-service
```

Then, create a Configuration resource to restrict which secrets it can read:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: payment-service-config
  namespace: payment-service-ns
spec:
  secrets:
    scopes:
      - storeName: mysecretstore
        defaultAccess: deny
        allowedSecrets:
          - payment-api-key
          - payment-db-password
          - stripe-webhook-secret
```

Apply the Configuration to the Dapr sidecar using the `dapr.io/config` annotation on the application deployment. Now if `payment-service` attempts to read `email-smtp-password`, it receives a 403 Forbidden.

## Scoping via Component Scopes

Use the top-level `scopes` field to restrict which app IDs can use the component at all:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: production-secrets
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultToken
    secretKeyRef:
      name: vault-token
      key: token
scopes:
- order-service
- inventory-service
```

Only `order-service` and `inventory-service` can access `production-secrets`. All other apps will receive an error if they try to use this component.

## Combining defaultAccess with deniedSecrets

Deny access to sensitive internal secrets while allowing all others using a Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
      - storeName: mysecretstore
        defaultAccess: allow
        deniedSecrets:
          - admin-bootstrap-token
          - internal-root-ca
```

## Testing Secret Scoping

Attempt to read a denied secret:

```bash
curl http://localhost:3500/v1.0/secrets/mysecretstore/admin-bootstrap-token
# HTTP 403: {"errorCode": "ERR_SECRET_GET", "message": "secret admin-bootstrap-token is not allowed for this app"}
```

Attempt to read an allowed secret:

```bash
curl http://localhost:3500/v1.0/secrets/mysecretstore/payment-api-key
# HTTP 200: {"payment-api-key": "pk_live_abc123"}
```

## Per-Environment Scoping Strategy

Use separate components per environment namespace:

```yaml
# dev namespace - broader access for development
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysecretstore
  namespace: dev
spec:
  type: secretstores.kubernetes
  version: v1
  # No secret scoping Configuration applied - devs can access any secret in the dev namespace
```

```yaml
# prod namespace - strict component scoping per service
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysecretstore
  namespace: prod
spec:
  type: secretstores.kubernetes
  version: v1
scopes:
- payment-service
```

```yaml
# prod namespace - strict secret-level allowlists via Configuration
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: payment-service-config
  namespace: prod
spec:
  secrets:
    scopes:
      - storeName: mysecretstore
        defaultAccess: deny
        allowedSecrets:
          - payment-db-password
          - payment-api-key
```

## Summary

Dapr secret scoping provides application-level access control for secret stores without requiring changes to the secret backend itself. Using `allowedSecrets` with explicit app scopes enforces least-privilege access and prevents credential leakage between microservices. Combine scoping with Kubernetes RBAC on the underlying secrets for defense-in-depth secret security.
