# How to Use Dapr Secrets Management for Multi-Tenant Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Multi-Tenant, Security, Architecture

Description: Learn how to isolate secrets between tenants in Dapr-enabled multi-tenant applications using namespaced components and scoping rules.

---

Multi-tenant applications have stricter isolation requirements than single-tenant services. Each tenant may have their own database credentials, API keys, or encryption keys, and these must be completely isolated from other tenants. Dapr Secrets Management supports this through namespace-scoped components, naming conventions, and fine-grained scoping rules.

## Strategy 1: Namespace-Per-Tenant Isolation

Deploy each tenant's workload in its own Kubernetes namespace with a dedicated secret store component:

```bash
# Create namespace for tenant A
kubectl create namespace tenant-a
kubectl create namespace tenant-b
```

Create tenant-specific secrets:

```bash
kubectl create secret generic tenant-secrets \
  --from-literal=db-password="tenant-a-password" \
  --from-literal=api-key="tenant-a-api-key" \
  -n tenant-a

kubectl create secret generic tenant-secrets \
  --from-literal=db-password="tenant-b-password" \
  --from-literal=api-key="tenant-b-api-key" \
  -n tenant-b
```

Each namespace gets its own secret store component that is namespaced:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tenant-secrets
  namespace: tenant-a
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

## Strategy 2: Prefixed Secrets in a Shared Store

For simpler deployments, use a naming prefix per tenant in a shared secret store:

```bash
# Store tenant secrets with prefix in Vault
vault kv put secret/tenant-a/db-password value="tenant-a-db-pass"
vault kv put secret/tenant-b/db-password value="tenant-b-db-pass"
```

Your application resolves the tenant-specific key at runtime:

```python
async def get_tenant_secret(tenant_id: str, secret_key: str) -> str:
    secret_name = f"{tenant_id}/{secret_key}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://localhost:3500/v1.0/secrets/vault-store/{secret_name}"
        )
        return resp.json()["value"]

# Usage
db_password = await get_tenant_secret("tenant-a", "db-password")
```

## Strategy 3: Dapr Scoping for Tenant Service Isolation

Restrict which services can access which tenant secrets using scoping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tenant-a-secrets
  namespace: shared
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault:8200"
    - name: vaultKVPrefix
      value: "tenant-a"
scopes:
  - tenant-a-service
  - tenant-a-worker
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tenant-b-secrets
  namespace: shared
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault:8200"
    - name: vaultKVPrefix
      value: "tenant-b"
scopes:
  - tenant-b-service
  - tenant-b-worker
```

## Validating Isolation

Test that tenant-a-service cannot access tenant-b secrets:

```bash
# This should return 403
kubectl exec -it deployment/tenant-a-service -- \
  curl http://localhost:3500/v1.0/secrets/tenant-b-secrets/db-password
```

## Summary

Dapr Secrets Management supports multi-tenant isolation through Kubernetes namespace-scoped components, prefixed secret naming in shared backends, and component-level scoping rules. The namespace-per-tenant approach provides the strongest isolation, while prefixed naming with scoping rules works well when operational overhead of multiple namespaces is a concern.
