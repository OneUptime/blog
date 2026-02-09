# How to Implement Secret Rotation with External Secrets Operator Refresh Intervals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Secrets Management

Description: Learn how to implement automatic secret rotation using External Secrets Operator refresh intervals, combined with pod restart strategies for zero-downtime updates.

---

Manual secret rotation creates operational overhead and security gaps. You need to remember to rotate secrets, update them in multiple places, and restart affected applications. This process is error-prone and doesn't scale as your infrastructure grows.

External Secrets Operator automates secret rotation by continuously syncing from external secret managers and updating Kubernetes Secrets based on configurable refresh intervals. Combined with automatic pod restart mechanisms, you get zero-downtime secret rotation without manual intervention.

In this guide, you'll learn how to configure refresh intervals, implement automatic pod restarts on secret changes, and handle different rotation scenarios including database credentials and API keys.

## Understanding Refresh Intervals

The `refreshInterval` field in ExternalSecret resources controls how often ESO checks the external secret manager for changes. When a change is detected, ESO updates the corresponding Kubernetes Secret.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: production
spec:
  refreshInterval: 15m  # Check every 15 minutes
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-keys
  data:
  - secretKey: api_key
    remoteRef:
      key: production/api-keys
      property: key
```

The refresh interval balances three concerns:

- **Freshness**: How quickly new secrets propagate to applications
- **API costs**: More frequent checks mean more API calls to your secret manager
- **System load**: Constant updates can overwhelm the Kubernetes API server in large clusters

## Choosing Appropriate Refresh Intervals

Different secrets have different rotation needs:

```yaml
# High-security secrets - frequent rotation
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: admin-credentials
  namespace: production
spec:
  refreshInterval: 5m  # Check every 5 minutes
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: admin-credentials
  data:
  - secretKey: password
    remoteRef:
      key: production/admin-password
---
# API keys - moderate rotation
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: production
spec:
  refreshInterval: 1h  # Check every hour
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-keys
  dataFrom:
  - extract:
      key: production/api-keys
---
# TLS certificates - infrequent rotation
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tls-cert
  namespace: production
spec:
  refreshInterval: 24h  # Check daily
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: tls-cert
    type: kubernetes.io/tls
  data:
  - secretKey: tls.crt
    remoteRef:
      key: production/tls
      property: cert
  - secretKey: tls.key
    remoteRef:
      key: production/tls
      property: key
```

## Automating Pod Restarts with Reloader

When secrets change, pods need to restart to pick up new values (unless your application implements hot reload). Stakater Reloader automates this:

```bash
# Install Reloader
helm repo add stakater https://stakater.github.io/stakater-charts
helm install reloader stakater/reloader \
  --namespace reloader \
  --create-namespace
```

Add annotations to deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "api-keys,database-credentials"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: web-app:latest
        envFrom:
        - secretRef:
            name: api-keys
        - secretRef:
            name: database-credentials
```

When External Secrets Operator updates `api-keys` or `database-credentials`, Reloader automatically triggers a rolling restart.

## Implementing Database Credential Rotation

Database credentials require careful rotation to avoid downtime. Use a two-phase approach:

### Phase 1: Create New Credentials

Update the secret in your secret manager (Vault example):

```bash
# Current credentials
vault kv put secret/production/database \
  username=dbuser \
  password=OldPassword123

# Add new credentials while keeping old ones valid
vault kv put secret/production/database \
  username=dbuser \
  password=NewPassword456
```

### Phase 2: Sync and Restart

ExternalSecret configuration:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 10m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: production/database
      property: username
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
```

Deployment with Reloader:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "database-credentials"
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Ensure zero downtime
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: api-server:latest
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
```

The rolling update ensures at least one pod is always available during the secret rotation.

## Rotating Dynamic Secrets from Vault

Vault can generate dynamic database credentials with automatic expiration:

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL
vault write database/config/production \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@postgres.example.com:5432/production" \
  allowed_roles="app-role" \
  username="vault" \
  password="vault-password"

# Create role with 1-hour TTL
vault write database/roles/app-role \
  db_name=production \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="2h"
```

ExternalSecret with refresh interval shorter than TTL:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: postgres-dynamic-creds
  namespace: production
spec:
  refreshInterval: 30m  # Refresh before 1h expiration
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: postgres-dynamic-creds
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: database/creds/app-role
      property: username
  - secretKey: password
    remoteRef:
      key: database/creds/app-role
      property: password
```

This generates new credentials every 30 minutes, ensuring they're always valid.

## Rotating API Keys with Canary Deployment

For external API keys, use a canary deployment to test new keys before full rollout:

```yaml
# Production deployment with old key
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-consumer
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "api-keys"
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api-consumer
      track: stable
  template:
    metadata:
      labels:
        app: api-consumer
        track: stable
    spec:
      containers:
      - name: app
        image: api-consumer:latest
        envFrom:
        - secretRef:
            name: api-keys
---
# Canary deployment with new key
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-consumer-canary
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "api-keys-new"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api-consumer
      track: canary
  template:
    metadata:
      labels:
        app: api-consumer
        track: canary
    spec:
      containers:
      - name: app
        image: api-consumer:latest
        envFrom:
        - secretRef:
            name: api-keys-new
```

After verifying the canary works, promote the new key to production.

## Handling TLS Certificate Rotation

TLS certificates require coordination between cert rotation and ingress updates:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tls-certificate
  namespace: production
spec:
  refreshInterval: 12h  # Check twice daily
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: tls-certificate
    type: kubernetes.io/tls
    creationPolicy: Owner
  data:
  - secretKey: tls.crt
    remoteRef:
      key: production/tls
      property: cert
  - secretKey: tls.key
    remoteRef:
      key: production/tls
      property: key
```

Ingress automatically picks up updated certificates:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  namespace: production
spec:
  tls:
  - hosts:
    - example.com
    secretName: tls-certificate
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

Most ingress controllers automatically reload certificates without restart.

## Monitoring Secret Rotation

Track rotation events using ExternalSecret status:

```bash
# Check last refresh time
kubectl get externalsecret database-credentials -n production -o jsonpath='{.status.refreshTime}'

# Watch for changes
kubectl get externalsecret database-credentials -n production -w
```

Create alerts for rotation failures:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  external-secrets.yml: |
    groups:
    - name: external-secrets
      interval: 30s
      rules:
      - alert: ExternalSecretSyncFailure
        expr: externalsecret_sync_calls_error > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "External Secret sync failing"
          description: "ExternalSecret {{ $labels.name }} in {{ $labels.namespace }} has failed to sync for 5 minutes"

      - alert: ExternalSecretStale
        expr: (time() - externalsecret_sync_last_success_time) > 3600
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "External Secret not refreshed"
          description: "ExternalSecret {{ $labels.name }} hasn't synced successfully in over 1 hour"
```

## Testing Secret Rotation

Create a test script to verify rotation:

```bash
#!/bin/bash

NAMESPACE="production"
SECRET_NAME="api-keys"
EXTERNAL_SECRET="api-keys"

# Get current secret value
CURRENT=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath='{.data.api_key}' | base64 -d)
echo "Current secret value: $CURRENT"

# Update secret in Vault (or your secret manager)
vault kv put secret/production/api-keys api_key="NewAPIKey123"

# Wait for refresh interval
echo "Waiting for refresh interval..."
sleep 60

# Get new secret value
NEW=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath='{.data.api_key}' | base64 -d)
echo "New secret value: $NEW"

# Verify change
if [ "$CURRENT" != "$NEW" ]; then
  echo "SUCCESS: Secret rotated successfully"
else
  echo "FAILURE: Secret not updated"
  exit 1
fi

# Check if pods restarted (if using Reloader)
RESTARTS=$(kubectl get deployment api-consumer -n $NAMESPACE -o jsonpath='{.status.updatedReplicas}')
echo "Pods restarted: $RESTARTS"
```

## Best Practices

1. **Set refresh intervals based on secret sensitivity**: Highly sensitive secrets should refresh more frequently.

2. **Use rolling updates**: Configure deployments with `maxUnavailable: 0` to ensure zero downtime during rotation.

3. **Implement health checks**: Ensure pods are healthy before Kubernetes marks them ready during rotation.

4. **Test rotation in staging**: Always test secret rotation workflows in non-production environments first.

5. **Monitor rotation failures**: Set up alerts for failed syncs or stale secrets.

6. **Use dynamic secrets when possible**: Let Vault or your secret manager generate short-lived credentials automatically.

7. **Coordinate multi-service rotation**: When rotating shared secrets, ensure all consuming services update simultaneously.

8. **Keep audit logs**: Track all secret rotation events for compliance and troubleshooting.

External Secrets Operator's refresh intervals enable fully automated secret rotation. Combined with Reloader for pod restarts and proper rolling update strategies, you achieve zero-downtime secret rotation without manual intervention. This reduces security risk while eliminating operational overhead.
