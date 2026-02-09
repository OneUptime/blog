# How to Configure Secret Store CSI Driver with Auto Rotation for Vault Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vault, CSI

Description: Learn how to use the Secret Store CSI Driver to mount Vault secrets directly into pods with automatic rotation, eliminating the need for Kubernetes Secrets entirely.

---

Traditional secret management in Kubernetes involves syncing secrets from external stores into Kubernetes Secrets, then mounting them in pods. This creates a delay between secret updates and pod availability, requires additional operators, and stores secrets redundantly.

The Secret Store CSI Driver eliminates this by mounting secrets directly from external stores like Vault into pod volumes. Secrets stay in Vault, never touch etcd, and can automatically rotate without pod restarts. This reduces attack surface and simplifies secret lifecycle management.

In this guide, you'll learn how to install the CSI Driver, configure it with HashiCorp Vault, implement automatic rotation, and handle dynamic secrets with short TTLs.

## Understanding CSI Driver Architecture

The Secret Store CSI Driver works differently from traditional approaches:

Traditional flow:
1. External Secrets Operator syncs from Vault
2. Creates Kubernetes Secret in etcd
3. Kubelet mounts Secret into pod

CSI Driver flow:
1. Pod starts with CSI volume definition
2. CSI Driver fetches secret directly from Vault
3. Mounts secret into pod without touching etcd
4. Periodically refreshes secret content

Benefits:
- Secrets never stored in etcd
- No intermediate Kubernetes Secrets
- Automatic rotation without pod restarts
- Direct integration with external secret stores

## Installing Secret Store CSI Driver

Install using Helm:

```bash
# Add Helm repository
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo update

# Install CSI Driver
helm install csi-secrets-store \
  secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true \
  --set rotationPollInterval=60s
```

Verify installation:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=secrets-store-csi-driver
kubectl get csidriver
```

## Installing Vault CSI Provider

Install the Vault-specific CSI provider:

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault CSI Provider
helm install vault-csi-provider hashicorp/vault-csi-provider \
  --namespace kube-system \
  --set vault.address="https://vault.example.com:8200"
```

Verify:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=vault-csi-provider
```

## Configuring Vault

Set up Vault with Kubernetes authentication:

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

Create secrets in Vault:

```bash
# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Store database credentials
vault kv put secret/database/config \
  username=dbuser \
  password=SecurePassword123 \
  host=postgres.example.com \
  port=5432

# Store API keys
vault kv put secret/api/keys \
  stripe_key=sk_live_abc123 \
  datadog_key=dd_api_xyz789
```

Create a Vault policy:

```bash
vault policy write app-policy - <<EOF
path "secret/data/database/config" {
  capabilities = ["read"]
}
path "secret/data/api/keys" {
  capabilities = ["read"]
}
EOF
```

Create a Vault role for the Kubernetes service account:

```bash
vault write auth/kubernetes/role/app-role \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=production \
  policies=app-policy \
  ttl=24h
```

## Creating SecretProviderClass

Define how to fetch secrets from Vault:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-database-creds
  namespace: production
spec:
  provider: vault
  parameters:
    vaultAddress: "https://vault.example.com:8200"
    roleName: "app-role"
    objects: |
      - objectName: "db-username"
        secretPath: "secret/data/database/config"
        secretKey: "username"
      - objectName: "db-password"
        secretPath: "secret/data/database/config"
        secretKey: "password"
      - objectName: "db-host"
        secretPath: "secret/data/database/config"
        secretKey: "host"
      - objectName: "db-port"
        secretPath: "secret/data/database/config"
        secretKey: "port"
```

## Mounting Secrets in Pods

Create a ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production
```

Deploy application with CSI volume:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
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
      serviceAccountName: app-sa
      containers:
      - name: app
        image: web-app:latest
        volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets"
          readOnly: true
        env:
        # Read secrets from mounted files
        - name: DB_USERNAME
          value: "/mnt/secrets/db-username"
        - name: DB_PASSWORD
          value: "/mnt/secrets/db-password"
      volumes:
      - name: secrets-store
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "vault-database-creds"
```

Application reads secrets from files:

```python
# Read database credentials
with open('/mnt/secrets/db-username', 'r') as f:
    db_username = f.read().strip()

with open('/mnt/secrets/db-password', 'r') as f:
    db_password = f.read().strip()

# Use credentials
db_connection = create_connection(username=db_username, password=db_password)
```

## Enabling Automatic Rotation

Configure rotation in the CSI Driver:

```yaml
# Already enabled during installation
# --set enableSecretRotation=true
# --set rotationPollInterval=60s
```

The CSI Driver automatically:
1. Polls Vault every 60 seconds
2. Detects changed secrets
3. Updates mounted files
4. Application reads new values

Configure your application to watch file changes:

```python
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class SecretChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith('/db-password'):
            print("Password changed, reloading...")
            reload_database_connection()

# Watch for secret changes
observer = Observer()
observer.schedule(SecretChangeHandler(), path='/mnt/secrets', recursive=False)
observer.start()
```

## Syncing to Kubernetes Secrets

Optionally sync CSI-mounted secrets to Kubernetes Secrets:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-database-creds
  namespace: production
spec:
  provider: vault
  secretObjects:
  - secretName: database-credentials
    type: Opaque
    data:
    - objectName: db-username
      key: username
    - objectName: db-password
      key: password
  parameters:
    vaultAddress: "https://vault.example.com:8200"
    roleName: "app-role"
    objects: |
      - objectName: "db-username"
        secretPath: "secret/data/database/config"
        secretKey: "username"
      - objectName: "db-password"
        secretPath: "secret/data/database/config"
        secretKey: "password"
```

This creates a Kubernetes Secret that applications can use:

```yaml
env:
- name: DB_USERNAME
  valueFrom:
    secretKeyRef:
      name: database-credentials
      key: username
```

## Working with Dynamic Secrets

Configure Vault dynamic database credentials:

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL
vault write database/config/mydb \
  plugin_name=postgresql-database-plugin \
  allowed_roles="readonly" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/mydb" \
  username="vault" \
  password="vault-password"

# Create role with 30-minute TTL
vault write database/roles/readonly \
  db_name=mydb \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="30m" \
  max_ttl="1h"
```

Update Vault policy:

```bash
vault policy write app-policy - <<EOF
path "database/creds/readonly" {
  capabilities = ["read"]
}
EOF
```

SecretProviderClass for dynamic secrets:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-dynamic-db-creds
  namespace: production
spec:
  provider: vault
  parameters:
    vaultAddress: "https://vault.example.com:8200"
    roleName: "app-role"
    objects: |
      - objectName: "db-username"
        secretPath: "database/creds/readonly"
        secretKey: "username"
      - objectName: "db-password"
        secretPath: "database/creds/readonly"
        secretKey: "password"
```

The CSI Driver automatically requests new credentials before expiration.

## Handling Multiple Secret Paths

Fetch secrets from multiple Vault paths:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-all-secrets
  namespace: production
spec:
  provider: vault
  parameters:
    vaultAddress: "https://vault.example.com:8200"
    roleName: "app-role"
    objects: |
      # Database credentials
      - objectName: "db-username"
        secretPath: "secret/data/database/config"
        secretKey: "username"
      - objectName: "db-password"
        secretPath: "secret/data/database/config"
        secretKey: "password"
      # API keys
      - objectName: "stripe-key"
        secretPath: "secret/data/api/keys"
        secretKey: "stripe_key"
      - objectName: "datadog-key"
        secretPath: "secret/data/api/keys"
        secretKey: "datadog_key"
      # TLS certificates
      - objectName: "tls-cert"
        secretPath: "secret/data/tls/certs"
        secretKey: "certificate"
      - objectName: "tls-key"
        secretPath: "secret/data/tls/certs"
        secretKey: "private_key"
```

All secrets mount to the same directory:

```
/mnt/secrets/
├── db-username
├── db-password
├── stripe-key
├── datadog-key
├── tls-cert
└── tls-key
```

## Monitoring and Troubleshooting

Check CSI Driver logs:

```bash
# Driver logs
kubectl logs -n kube-system -l app.kubernetes.io/name=secrets-store-csi-driver

# Provider logs
kubectl logs -n kube-system -l app.kubernetes.io/name=vault-csi-provider
```

Verify secrets are mounted:

```bash
# Check mounted secrets
kubectl exec -it <pod-name> -n production -- ls -la /mnt/secrets

# View secret content
kubectl exec -it <pod-name> -n production -- cat /mnt/secrets/db-password
```

Debug SecretProviderClass:

```bash
kubectl describe secretproviderclass vault-database-creds -n production
```

## Best Practices

1. **Set appropriate rotation intervals**: Balance between freshness and API load (60-300 seconds is typical).

2. **Use rotation with dynamic secrets**: Essential for short-lived credentials that expire quickly.

3. **Implement file watchers**: Make applications reload when secrets change.

4. **Monitor CSI metrics**: Track secret fetch failures and rotation events.

5. **Use service accounts**: Always bind SecretProviderClass to specific service accounts.

6. **Limit secret access**: Use Vault policies to grant minimal required permissions.

7. **Handle startup delays**: CSI volumes mount during pod startup, which can add 1-2 seconds.

8. **Back up Vault**: CSI Driver depends on Vault availability.

The Secret Store CSI Driver provides direct integration between Vault and Kubernetes without storing secrets in etcd. Combined with automatic rotation, it creates a secure, efficient secret management solution that keeps sensitive data in your secret manager while making it seamlessly available to applications.
