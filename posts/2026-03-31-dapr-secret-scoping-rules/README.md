# How to Restrict Secret Access Using Dapr Scoping Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Scoping, Access Control, Security

Description: Learn how to use Dapr secret scoping rules to restrict which applications can access which secrets and which secret keys within a store.

---

In a microservices environment, not every service should have access to every secret. Dapr provides two levels of secret access control: component-level scoping that restricts which app IDs can use a secret store, and secret-level scoping that restricts which secret keys are accessible within an allowed store.

## Component-Level Scoping

Component scoping is the first line of defense. Add an `scopes` list to any Dapr component to restrict which app IDs can load it:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-secrets
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.internal:8200"
scopes:
  - payment-service
  - billing-worker
```

Any service with an app ID not in the `scopes` list will not have the component loaded at all. The secret store will be invisible to that service — attempts to access it will fail as if the component does not exist.

## Secret-Level Scoping with Allow and Deny Lists

Within a secret store, you can further control which secret keys a service is allowed to read using a Dapr Configuration resource with `allowedSecrets` and `deniedSecrets` fields:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: my-app-config
spec:
  secrets:
    scopes:
      - storeName: vault-secrets
        defaultAccess: deny
        allowedSecrets:
          - db-password
          - cache-password
```

Apply this configuration to a specific deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/config: "my-app-config"
```

## Testing Scoping Rules

Verify that access is correctly restricted:

```bash
# Should succeed for allowed secrets
kubectl exec -it deployment/my-service -c my-service -- \
  curl -s http://localhost:3500/v1.0/secrets/vault-secrets/db-password

# Should return 403 for denied secrets
kubectl exec -it deployment/my-service -c my-service -- \
  curl -s http://localhost:3500/v1.0/secrets/vault-secrets/admin-password
```

Expected response for a denied secret:

```json
{
  "errorCode": "ERR_PERMISSION_DENIED",
  "message": "access denied by policy to get my-service||vault-secrets||admin-password"
}
```

## Default Deny vs Default Allow

Set `defaultAccess: deny` and explicitly allow only the secrets each service needs. This follows the principle of least privilege:

```yaml
spec:
  secrets:
    scopes:
      - storeName: vault-secrets
        defaultAccess: deny
        allowedSecrets:
          - payment-api-key
          - stripe-webhook-secret
```

Compare to `defaultAccess: allow` with a deny list - this is less secure because it requires you to explicitly block each new secret added to the store.

## Summary

Dapr's two-layer scoping model - component scopes at the app ID level and secret key allow/deny lists at the configuration level - lets you implement fine-grained access control over which secrets each microservice can access. Always prefer `defaultAccess: deny` with an explicit allow list to minimize the blast radius of any compromised service.
