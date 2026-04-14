# How to Migrate from Hardcoded Secrets to Dapr Secret Stores

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Migration, Security, Refactoring

Description: A step-by-step guide to migrating microservices from hardcoded credentials and environment variables to Dapr Secrets Management with minimal risk.

---

Most teams inherit codebases with credentials stored in environment variables, Kubernetes ConfigMaps, or even baked into container images. Migrating to Dapr Secrets Management improves security posture but needs to be done carefully to avoid service disruptions. This guide gives you a step-by-step migration path.

## Step 1: Audit Your Current Secret Usage

Before changing anything, inventory where secrets currently live:

```bash
# Find environment variable secrets in Kubernetes deployments
kubectl get deployments -n production -o json | \
  jq '.items[].spec.template.spec.containers[].env[]? | select(.name | test("PASSWORD|KEY|TOKEN|SECRET"))'
```

Document each secret, which service uses it, and what backend currently holds it.

## Step 2: Choose and Configure Your Secret Store Backend

Pick a backend appropriate for your environment. For Kubernetes clusters:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secret-store
  namespace: production
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

For teams with HashiCorp Vault already deployed:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.internal:8200"
    - name: vaultTokenMountPath
      value: "/var/run/secrets/vault/token"
```

## Step 3: Load Existing Secrets into the Backend

Migrate your current credentials into the secret store:

```bash
# Migrate from a Kubernetes ConfigMap to a Secret
kubectl get configmap app-config -o json | \
  jq '.data' > /tmp/current-config.json

# Create a Kubernetes Secret from the values
kubectl create secret generic app-secrets \
  --from-literal=db-password="$(kubectl get configmap app-config -o jsonpath='{.data.DB_PASSWORD}')" \
  --from-literal=api-key="$(kubectl get configmap app-config -o jsonpath='{.data.API_KEY}')"
```

## Step 4: Update Application Code

Replace direct environment variable reads with Dapr API calls. Example before and after for Python:

Before:
```python
import os
db_password = os.getenv("DB_PASSWORD")
```

After:
```python
import httpx

def get_db_password() -> str:
    resp = httpx.get("http://localhost:3500/v1.0/secrets/secret-store/app-secrets")
    resp.raise_for_status()
    return resp.json()["db-password"]

db_password = get_db_password()
```

## Step 5: Deploy and Validate

Use a canary deployment strategy to migrate one service at a time:

```bash
# Deploy the updated service and monitor for errors
kubectl set image deployment/my-service \
  my-service=my-service:v2-dapr-secrets

# Watch for any secret retrieval errors
kubectl logs -f deployment/my-service -c daprd | grep -i "error\|secret"
```

## Step 6: Remove Old Environment Variables

Once you confirm the Dapr-based retrieval works correctly, remove the old env vars from your manifests:

```bash
kubectl patch deployment my-service --type=json \
  -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/env/0"}]'
```

## Summary

Migrating from hardcoded secrets to Dapr requires auditing current usage, loading credentials into a chosen backend, updating code to call the Dapr secrets API, and validating with a staged rollout. The effort pays off with centralized secret management, easier rotation, and improved access control across all your microservices.
