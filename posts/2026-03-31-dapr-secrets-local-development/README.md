# How to Use Dapr Secrets Management in Local Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Local Development, Developer Experience

Description: Set up Dapr Secrets Management for local development using local file and environment variable secret stores so your dev workflow matches production patterns.

---

One of the most common developer pain points with secret management is the gap between production setups (Vault, AWS Secrets Manager) and local development (hardcoded .env files). Dapr bridges this gap with local-friendly secret store implementations that use the same API your production code already calls.

## Option 1: Local File Secret Store

Create a JSON file containing your secrets. Dapr treats this as a simple key-value secret store:

```bash
mkdir -p ~/.dapr/components
cat > ~/.dapr/secrets.json <<'EOF'
{
  "db-password": "localdevpassword",
  "api-key": "test-key-12345",
  "redis-password": "localredispass"
}
EOF
```

Define the local secret store component:

```yaml
# ~/.dapr/components/local-secret-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
    - name: secretsFile
      value: "/Users/yourname/.dapr/secrets.json"
    - name: nestedSeparator
      value: ":"
```

## Option 2: Environment Variable Secret Store

If you prefer to keep secrets as environment variables (common with `.env` files), use the environment variable store:

```bash
export DB_PASSWORD=localdevpassword
export API_KEY=test-key-12345
```

Component definition:

```yaml
# ~/.dapr/components/env-secret-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: env-secrets
spec:
  type: secretstores.local.env
  version: v1
  metadata: []
```

Retrieve environment secrets by their variable name:

```bash
curl http://localhost:3500/v1.0/secrets/env-secrets/DB_PASSWORD
```

## Running Dapr Locally

Start your application with Dapr using the CLI:

```bash
dapr run \
  --app-id my-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ~/.dapr/components \
  -- node app.js
```

## Writing Code That Works in Both Environments

The key is that your application code does not change between environments - only the component YAML differs:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const STORE_NAME = process.env.SECRET_STORE || 'local-secrets';

async function getDbPassword() {
  const secret = await client.secret.get(STORE_NAME, 'db-password');
  return secret['db-password'];
}
```

In production, set `SECRET_STORE=vault-secrets`. Locally, use the default `local-secrets`. The code is identical.

## Using .gitignore for Local Secrets

Protect your local secrets file from being committed:

```bash
echo "secrets.json" >> ~/.dapr/.gitignore
echo ".dapr/secrets.json" >> .gitignore
```

## Summary

Dapr's local file and environment variable secret stores let developers use the same secrets API in local development as in production, eliminating the need to manage separate code paths for secret retrieval. Simply swap the component YAML between environments and your application code remains unchanged throughout the development lifecycle.
