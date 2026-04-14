# How to Implement Tenant-Specific Secret Stores with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Multi-Tenancy, Security, Vault

Description: Implement tenant-specific secret stores in Dapr using namespace-scoped secret store components pointing to isolated Vault namespaces or cloud provider secret managers.

---

## Why Tenant-Specific Secret Stores

In multi-tenant systems, secrets must be strictly isolated. A secret store component in Dapr abstracts the underlying secret backend (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) and provides a consistent API. By deploying namespace-scoped secret store components pointing to isolated backends, each tenant can only access their own secrets.

## Option 1 - Separate Vault Namespaces per Tenant

HashiCorp Vault Enterprise supports namespaces. Deploy one Dapr secret store component per tenant pointing to their dedicated Vault namespace:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
  namespace: tenant-a
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal:8200"
  - name: vaultNamespace
    value: "tenant-a"
  - name: vaultToken
    secretKeyRef:
      name: vault-token
      key: token
scopes:
- tenant-a-api
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
  namespace: tenant-b
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal:8200"
  - name: vaultNamespace
    value: "tenant-b"
  - name: vaultToken
    secretKeyRef:
      name: vault-token
      key: token
scopes:
- tenant-b-api
```

## Option 2 - AWS Secrets Manager with Path Isolation

Use different path prefixes in AWS Secrets Manager per tenant:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
  namespace: tenant-a
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-creds-tenant-a
      key: access-key
  - name: secretKey
    secretKeyRef:
      name: aws-creds-tenant-a
      key: secret-key
```

Enforce that tenant A's IAM role can only access secrets prefixed with `/tenant-a/`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/tenant-a/*"
    }
  ]
}
```

## Reading Secrets in Application Code

Applications read secrets through the Dapr API without knowing the underlying backend:

```javascript
const daprClient = new DaprClient();

async function getTenantSecret(secretName) {
  const secret = await daprClient.secret.get(
    'secretstore',
    secretName
  );
  return secret[secretName];
}

const dbPassword = await getTenantSecret('db-password');
```

## Restricting Secret Access with Scopes

Prevent unauthorized apps from accessing a secret store component using the `scopes` field in the component spec:

```yaml
scopes:
- tenant-a-orders-api
- tenant-a-payments-api
```

Only apps with matching app IDs can use this component.

## Auditing Secret Access

Configure Vault audit logging to track which tenant accessed which secrets:

```bash
vault audit enable file file_path=/vault/logs/audit.log

# In tenant-a namespace
vault audit enable -namespace=tenant-a file file_path=/vault/logs/tenant-a-audit.log
```

## Summary

Tenant-specific secret stores in Dapr use namespace-scoped Component CRDs pointing to isolated secret backends such as separate Vault namespaces or IAM-restricted AWS Secrets Manager paths. Application code accesses secrets through the uniform Dapr secret API without hardcoding backend details. Use component scoping to restrict which app IDs can access each secret store.
