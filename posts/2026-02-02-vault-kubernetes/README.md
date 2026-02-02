# How to Use Vault with Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Kubernetes, Secrets Management, Security, DevOps, HashiCorp, Helm

Description: A comprehensive guide to integrating HashiCorp Vault with Kubernetes for secure secrets management, covering installation, authentication methods, secret injection, and production best practices.

---

Managing secrets in Kubernetes is one of the most critical security challenges teams face. Native Kubernetes Secrets are base64-encoded (not encrypted) and stored in etcd. HashiCorp Vault provides a robust, centralized secrets management solution that integrates seamlessly with Kubernetes workloads.

## Why Vault for Kubernetes?

Kubernetes Secrets have significant limitations:

- Base64 encoding is not encryption
- Anyone with etcd access can read all secrets
- No audit trail for secret access
- No automatic rotation
- Secrets are static

Vault addresses all of these concerns with encryption, access policies, audit logging, dynamic secrets, and automatic rotation.

```mermaid
flowchart LR
    subgraph Kubernetes["Kubernetes Cluster"]
        Pod[Application Pod]
        SA[Service Account]
        Injector[Vault Agent Injector]
    end

    subgraph Vault["Vault Server"]
        Auth[Kubernetes Auth]
        Secrets[Secret Engines]
        Policies[Access Policies]
    end

    Pod --> SA
    SA --> Auth
    Auth --> Policies
    Policies --> Secrets
    Secrets --> Injector
    Injector --> Pod
```

## Prerequisites

Before getting started, ensure you have:

- A running Kubernetes cluster (minikube, kind, EKS, GKE, or AKS)
- kubectl configured to access your cluster
- Helm 3.x installed
- Basic understanding of Kubernetes concepts

## Installing Vault on Kubernetes

HashiCorp provides an official Helm chart for deploying Vault. Let me walk you through the installation process.

### Add the HashiCorp Helm Repository

Run the following commands to add the Helm repository and update your local cache.

```bash
# Add the HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com

# Update your local Helm chart repository cache
helm repo update
```

### Install Vault in Development Mode

For learning and testing purposes, deploy Vault in development mode. Note that development mode should never be used in production.

```yaml
# vault-values-dev.yaml
# Development mode configuration - NOT for production use
server:
  dev:
    enabled: true
    devRootToken: "root"

  # Resource limits for the Vault server pod
  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m

# Enable the injector for automatic secret injection
injector:
  enabled: true

ui:
  enabled: true
  serviceType: ClusterIP
```

Install Vault using the Helm chart with your custom values file.

```bash
# Create a dedicated namespace for Vault
kubectl create namespace vault

# Install Vault using Helm with the development values
helm install vault hashicorp/vault \
  --namespace vault \
  -f vault-values-dev.yaml
```

### Install Vault in Production Mode

Production deployments require high availability, TLS, and persistent storage. Here is a comprehensive production configuration.

```yaml
# vault-values-prod.yaml
# Production-ready Vault configuration with HA and auto-unseal
global:
  enabled: true
  tlsDisable: false

server:
  # Run 3 replicas for high availability
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      setNodeId: true
      config: |
        ui = true

        listener "tcp" {
          tls_disable = 0
          address = "[::]:8200"
          cluster_address = "[::]:8201"
          tls_cert_file = "/vault/userconfig/vault-tls/tls.crt"
          tls_key_file = "/vault/userconfig/vault-tls/tls.key"
        }

        storage "raft" {
          path = "/vault/data"
          retry_join {
            leader_api_addr = "https://vault-0.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
          retry_join {
            leader_api_addr = "https://vault-1.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
          retry_join {
            leader_api_addr = "https://vault-2.vault-internal:8200"
            leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
          }
        }

        service_registration "kubernetes" {}

  # Mount TLS certificates
  volumes:
    - name: vault-tls
      secret:
        secretName: vault-tls

  volumeMounts:
    - name: vault-tls
      mountPath: /vault/userconfig/vault-tls
      readOnly: true

  # Resource allocation for production workloads
  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m

  # Persistent storage for Raft data
  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: "standard"

  # Anti-affinity ensures pods run on different nodes
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: vault
          topologyKey: kubernetes.io/hostname

injector:
  enabled: true
  replicas: 2

ui:
  enabled: true
```

## Initializing and Unsealing Vault

After installing Vault in production mode, you must initialize and unseal it. Vault starts in a sealed state and cannot process requests until unsealed.

```mermaid
sequenceDiagram
    participant Admin
    participant Vault
    participant Storage

    Admin->>Vault: vault operator init
    Vault->>Storage: Generate master key
    Vault-->>Admin: Return 5 key shares + root token

    Admin->>Vault: vault operator unseal (key 1)
    Vault-->>Admin: Sealed (1/3 keys)
    Admin->>Vault: vault operator unseal (key 2)
    Vault-->>Admin: Sealed (2/3 keys)
    Admin->>Vault: vault operator unseal (key 3)
    Vault-->>Admin: Unsealed!
```

### Initialize Vault

Run the initialization command on one of the Vault pods. Store the output securely as it contains the unseal keys and root token.

```bash
# Initialize Vault with 5 key shares and a threshold of 3
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init.json

# Extract the unseal keys and root token
UNSEAL_KEY_1=$(cat vault-init.json | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(cat vault-init.json | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(cat vault-init.json | jq -r '.unseal_keys_b64[2]')
ROOT_TOKEN=$(cat vault-init.json | jq -r '.root_token')
```

### Unseal Vault

Each Vault pod must be unsealed individually. Provide at least 3 of the 5 unseal keys.

```bash
# Unseal vault-0 with three keys
kubectl exec -n vault vault-0 -- vault operator unseal $UNSEAL_KEY_1
kubectl exec -n vault vault-0 -- vault operator unseal $UNSEAL_KEY_2
kubectl exec -n vault vault-0 -- vault operator unseal $UNSEAL_KEY_3

# Join and unseal vault-1
kubectl exec -n vault vault-1 -- vault operator raft join http://vault-0.vault-internal:8200
kubectl exec -n vault vault-1 -- vault operator unseal $UNSEAL_KEY_1
kubectl exec -n vault vault-1 -- vault operator unseal $UNSEAL_KEY_2
kubectl exec -n vault vault-1 -- vault operator unseal $UNSEAL_KEY_3

# Join and unseal vault-2
kubectl exec -n vault vault-2 -- vault operator raft join http://vault-0.vault-internal:8200
kubectl exec -n vault vault-2 -- vault operator unseal $UNSEAL_KEY_1
kubectl exec -n vault vault-2 -- vault operator unseal $UNSEAL_KEY_2
kubectl exec -n vault vault-2 -- vault operator unseal $UNSEAL_KEY_3
```

## Configuring Kubernetes Authentication

Kubernetes authentication allows pods to authenticate to Vault using their service account tokens. Vault verifies the token with the Kubernetes API.

```mermaid
flowchart TB
    subgraph K8s["Kubernetes"]
        Pod[Application Pod]
        SA[Service Account]
        Token[JWT Token]
        API[Kubernetes API]
    end

    subgraph Vault["Vault"]
        KAuth[Kubernetes Auth Method]
        Policy[Vault Policy]
        Secret[Secret Data]
    end

    Pod --> SA
    SA --> Token
    Token --> KAuth
    KAuth --> API
    API --> KAuth
    KAuth --> Policy
    Policy --> Secret
    Secret --> Pod
```

### Enable Kubernetes Authentication

Connect to Vault and enable the Kubernetes auth method.

```bash
# Port forward to access Vault
kubectl port-forward -n vault svc/vault 8200:8200 &

# Set environment variables for Vault CLI
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='root'  # Use your actual root token in production

# Enable the Kubernetes auth method
vault auth enable kubernetes

# Configure Kubernetes auth to communicate with the Kubernetes API
vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443"
```

### Configure Authentication from Inside the Cluster

When configuring Vault from within the cluster, you can use the service account token mounted in the pod.

```bash
# Execute inside the vault-0 pod
kubectl exec -it -n vault vault-0 -- /bin/sh

# Inside the pod, configure Kubernetes auth
vault write auth/kubernetes/config \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_host="https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT}" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
```

## Creating Secrets and Policies

Vault policies define what secrets a client can access. Each policy uses HCL (HashiCorp Configuration Language) to specify paths and capabilities.

### Enable the KV Secrets Engine

Enable the key-value secrets engine where you will store application secrets.

```bash
# Enable KV secrets engine version 2 at the path 'secret'
vault secrets enable -path=secret kv-v2

# Store a database credential
vault kv put secret/myapp/config \
  username="db-user" \
  password="super-secret-password" \
  host="postgres.database.svc.cluster.local" \
  port="5432"

# Store API keys for the application
vault kv put secret/myapp/api-keys \
  stripe_key="sk_live_abc123" \
  sendgrid_key="SG.xyz789"
```

### Create a Vault Policy

Define a policy that grants read access to specific secret paths. Policies follow the principle of least privilege.

```bash
# Create a policy file that grants read access to myapp secrets
vault policy write myapp-policy - <<EOF
# Policy for myapp application
# Grants read access to configuration and API keys

# Allow reading database configuration
path "secret/data/myapp/config" {
  capabilities = ["read"]
}

# Allow reading API keys
path "secret/data/myapp/api-keys" {
  capabilities = ["read"]
}

# Allow listing secrets under myapp path
path "secret/metadata/myapp/*" {
  capabilities = ["list"]
}
EOF
```

### Create a Kubernetes Auth Role

Bind the policy to a Kubernetes service account. Pods using the specified service account can authenticate and receive a token with the attached policies.

```bash
# Create a role that binds the policy to a service account
vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp-sa \
  bound_service_account_namespaces=default \
  policies=myapp-policy \
  ttl=1h
```

## Injecting Secrets into Pods

Vault provides two primary methods for injecting secrets into Kubernetes pods: the Vault Agent Injector and the Vault CSI Provider.

### Method 1: Vault Agent Injector

The Vault Agent Injector uses a mutating webhook to inject a sidecar container that handles authentication and secret retrieval.

```mermaid
flowchart LR
    subgraph Pod["Application Pod"]
        Init[Init Container]
        Agent[Vault Agent Sidecar]
        App[Application Container]
        Secrets["/vault/secrets"]
    end

    Vault[Vault Server]

    Init -->|Authenticate| Vault
    Init -->|Fetch secrets| Vault
    Init -->|Write to| Secrets
    Agent -->|Renew token| Vault
    Agent -->|Update| Secrets
    App -->|Read| Secrets
```

First, create the service account that your application will use.

```yaml
# service-account.yaml
# Service account for the application
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: default
```

Now deploy an application with Vault Agent annotations. The annotations tell the injector what secrets to fetch and where to place them.

```yaml
# deployment-with-vault.yaml
# Application deployment with Vault Agent Injector annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        # Enable Vault Agent injection
        vault.hashicorp.com/agent-inject: "true"

        # Vault role to use for authentication
        vault.hashicorp.com/role: "myapp"

        # Inject database config as a file
        vault.hashicorp.com/agent-inject-secret-database.txt: "secret/data/myapp/config"

        # Use a template to format the secret
        vault.hashicorp.com/agent-inject-template-database.txt: |
          {{- with secret "secret/data/myapp/config" -}}
          DATABASE_HOST={{ .Data.data.host }}
          DATABASE_PORT={{ .Data.data.port }}
          DATABASE_USER={{ .Data.data.username }}
          DATABASE_PASSWORD={{ .Data.data.password }}
          {{- end -}}

        # Inject API keys as JSON
        vault.hashicorp.com/agent-inject-secret-api-keys.json: "secret/data/myapp/api-keys"
        vault.hashicorp.com/agent-inject-template-api-keys.json: |
          {{- with secret "secret/data/myapp/api-keys" -}}
          {
            "stripe_key": "{{ .Data.data.stripe_key }}",
            "sendgrid_key": "{{ .Data.data.sendgrid_key }}"
          }
          {{- end -}}

        # Keep the agent running to handle token renewal
        vault.hashicorp.com/agent-pre-populate-only: "false"
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myapp:latest
          # Read secrets from the injected files
          command:
            - /bin/sh
            - -c
            - |
              source /vault/secrets/database.txt
              export STRIPE_KEY=$(cat /vault/secrets/api-keys.json | jq -r '.stripe_key')
              exec /app/start.sh
          volumeMounts:
            - name: vault-secrets
              mountPath: /vault/secrets
              readOnly: true
      volumes:
        - name: vault-secrets
          emptyDir:
            medium: Memory
```

### Method 2: Vault CSI Provider

The CSI provider mounts secrets as volumes without requiring a sidecar container, reducing resource overhead.

Install the Vault CSI Provider using Helm.

```bash
# Install the Secrets Store CSI Driver
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system

# Install the Vault CSI Provider
helm upgrade vault hashicorp/vault \
  --namespace vault \
  --set "csi.enabled=true"
```

Create a SecretProviderClass that defines how to fetch secrets from Vault.

```yaml
# secret-provider-class.yaml
# Defines how the CSI driver fetches secrets from Vault
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-myapp-secrets
  namespace: default
spec:
  provider: vault
  parameters:
    # Vault server address
    vaultAddress: "http://vault.vault.svc.cluster.local:8200"

    # Role for Kubernetes authentication
    roleName: "myapp"

    # Secrets to fetch from Vault
    objects: |
      - objectName: "db-username"
        secretPath: "secret/data/myapp/config"
        secretKey: "username"
      - objectName: "db-password"
        secretPath: "secret/data/myapp/config"
        secretKey: "password"
      - objectName: "stripe-key"
        secretPath: "secret/data/myapp/api-keys"
        secretKey: "stripe_key"

  # Optionally sync to Kubernetes secrets
  secretObjects:
    - secretName: myapp-secrets
      type: Opaque
      data:
        - objectName: db-username
          key: DATABASE_USER
        - objectName: db-password
          key: DATABASE_PASSWORD
```

Deploy an application using the CSI provider.

```yaml
# deployment-with-csi.yaml
# Application using Vault CSI Provider for secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-csi
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp-csi
  template:
    metadata:
      labels:
        app: myapp-csi
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myapp:latest
          env:
            # Reference secrets from the synced Kubernetes secret
            - name: DATABASE_USER
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: DATABASE_USER
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: DATABASE_PASSWORD
          volumeMounts:
            - name: secrets
              mountPath: /mnt/secrets
              readOnly: true
      volumes:
        - name: secrets
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: vault-myapp-secrets
```

## Dynamic Secrets with Database Engine

Vault can generate short-lived database credentials on demand, eliminating the need for long-lived credentials.

```mermaid
sequenceDiagram
    participant App as Application
    participant Vault as Vault
    participant DB as Database

    App->>Vault: Request database credentials
    Vault->>DB: CREATE USER with random password
    DB-->>Vault: User created
    Vault-->>App: Return credentials (TTL: 1 hour)

    Note over App: Application uses credentials

    Vault->>DB: REVOKE USER (after TTL)
    DB-->>Vault: User revoked
```

### Configure the Database Secrets Engine

Enable the database secrets engine and configure it to connect to your PostgreSQL database.

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/myapp-postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="myapp-db-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres.database.svc.cluster.local:5432/myapp?sslmode=disable" \
  username="vault-admin" \
  password="admin-password"

# Create a role that defines credential generation
vault write database/roles/myapp-db-role \
  db_name=myapp-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Update the Policy for Dynamic Secrets

Modify the application policy to allow reading dynamic database credentials.

```bash
# Update the policy to include dynamic database credentials
vault policy write myapp-policy - <<EOF
# Static secrets
path "secret/data/myapp/*" {
  capabilities = ["read"]
}

# Dynamic database credentials
path "database/creds/myapp-db-role" {
  capabilities = ["read"]
}
EOF
```

### Use Dynamic Secrets in Your Application

Update your deployment to fetch dynamic credentials from Vault.

```yaml
# deployment-dynamic-secrets.yaml
# Application using Vault dynamic database credentials
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-dynamic
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp-dynamic
  template:
    metadata:
      labels:
        app: myapp-dynamic
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"

        # Inject dynamic database credentials
        vault.hashicorp.com/agent-inject-secret-db-creds.txt: "database/creds/myapp-db-role"
        vault.hashicorp.com/agent-inject-template-db-creds.txt: |
          {{- with secret "database/creds/myapp-db-role" -}}
          export DATABASE_USER="{{ .Data.username }}"
          export DATABASE_PASSWORD="{{ .Data.password }}"
          {{- end -}}

        # Refresh credentials before they expire
        vault.hashicorp.com/agent-pre-populate-only: "false"
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myapp:latest
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                source /vault/secrets/db-creds.txt
                # Application reconnects when credentials change
                exec /app/start.sh
              done
```

## Auto-Unseal with Cloud KMS

Manual unsealing is impractical for production. Configure auto-unseal using a cloud KMS provider.

### AWS KMS Auto-Unseal

Configure Vault to use AWS KMS for automatic unsealing.

```yaml
# vault-values-aws-autounseal.yaml
# Vault configuration with AWS KMS auto-unseal
server:
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      config: |
        ui = true

        listener "tcp" {
          tls_disable = 0
          address = "[::]:8200"
          cluster_address = "[::]:8201"
        }

        # AWS KMS auto-unseal configuration
        seal "awskms" {
          region     = "us-east-1"
          kms_key_id = "alias/vault-unseal-key"
        }

        storage "raft" {
          path = "/vault/data"
        }

        service_registration "kubernetes" {}

  # AWS credentials via service account
  serviceAccount:
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/vault-kms-role
```

### GCP Cloud KMS Auto-Unseal

For GKE deployments, use Google Cloud KMS.

```yaml
# vault-values-gcp-autounseal.yaml
# Vault configuration with GCP Cloud KMS auto-unseal
server:
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      config: |
        ui = true

        listener "tcp" {
          tls_disable = 0
          address = "[::]:8200"
          cluster_address = "[::]:8201"
        }

        # GCP Cloud KMS auto-unseal configuration
        seal "gcpckms" {
          project     = "my-gcp-project"
          region      = "us-central1"
          key_ring    = "vault-keyring"
          crypto_key  = "vault-unseal-key"
        }

        storage "raft" {
          path = "/vault/data"
        }

        service_registration "kubernetes" {}

  # GCP credentials via Workload Identity
  serviceAccount:
    annotations:
      iam.gke.io/gcp-service-account: vault-server@my-gcp-project.iam.gserviceaccount.com
```

## Monitoring Vault

Vault exposes Prometheus metrics that you can scrape for monitoring and alerting.

### Enable Telemetry

Update your Vault configuration to enable Prometheus metrics.

```yaml
# vault-values-monitoring.yaml
# Vault configuration with Prometheus metrics enabled
server:
  ha:
    enabled: true
    raft:
      enabled: true
      config: |
        ui = true

        listener "tcp" {
          address = "[::]:8200"
          cluster_address = "[::]:8201"
          telemetry {
            unauthenticated_metrics_access = true
          }
        }

        telemetry {
          prometheus_retention_time = "30s"
          disable_hostname = true
        }

        storage "raft" {
          path = "/vault/data"
        }
```

### Create a ServiceMonitor for Prometheus

If you use the Prometheus Operator, create a ServiceMonitor to scrape Vault metrics.

```yaml
# servicemonitor.yaml
# ServiceMonitor for Prometheus Operator to scrape Vault metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vault
  namespace: vault
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: vault
  endpoints:
    - port: http
      interval: 30s
      path: /v1/sys/metrics
      params:
        format:
          - prometheus
```

### Key Metrics to Monitor

Create alerts for critical Vault metrics.

```yaml
# prometheusrule.yaml
# Alerting rules for Vault
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vault-alerts
  namespace: vault
spec:
  groups:
    - name: vault
      rules:
        # Alert if Vault is sealed
        - alert: VaultSealed
          expr: vault_core_unsealed == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Vault is sealed"
            description: "Vault instance {{ $labels.instance }} is sealed"

        # Alert on high request latency
        - alert: VaultHighLatency
          expr: vault_core_handle_request{quantile="0.99"} > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Vault request latency is high"
            description: "P99 latency is {{ $value }}s"

        # Alert if leadership is lost
        - alert: VaultLeadershipLost
          expr: vault_core_leadership_lost_count > 0
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "Vault leadership was lost"
```

## Backup and Disaster Recovery

Implement regular backups of your Vault data to ensure you can recover from disasters.

### Automated Raft Snapshots

Create a CronJob that takes periodic snapshots of the Raft storage.

```yaml
# backup-cronjob.yaml
# CronJob for automated Vault Raft snapshots
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vault-backup
  namespace: vault
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: vault-backup-sa
          containers:
            - name: backup
              image: hashicorp/vault:latest
              env:
                - name: VAULT_ADDR
                  value: "http://vault-active.vault.svc.cluster.local:8200"
                - name: VAULT_TOKEN
                  valueFrom:
                    secretKeyRef:
                      name: vault-backup-token
                      key: token
              command:
                - /bin/sh
                - -c
                - |
                  # Create a Raft snapshot
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  vault operator raft snapshot save /backups/vault-snapshot-${TIMESTAMP}.snap

                  # Upload to S3 (requires AWS CLI)
                  aws s3 cp /backups/vault-snapshot-${TIMESTAMP}.snap \
                    s3://my-vault-backups/snapshots/

                  # Keep only last 10 local snapshots
                  ls -t /backups/*.snap | tail -n +11 | xargs rm -f
              volumeMounts:
                - name: backups
                  mountPath: /backups
          volumes:
            - name: backups
              persistentVolumeClaim:
                claimName: vault-backups-pvc
          restartPolicy: OnFailure
```

### Restore from Snapshot

Create a script to restore Vault from a Raft snapshot.

```bash
#!/bin/bash
# restore-vault.sh
# Script to restore Vault from a Raft snapshot

# Download the snapshot from S3
SNAPSHOT_FILE=$1
aws s3 cp s3://my-vault-backups/snapshots/${SNAPSHOT_FILE} /tmp/

# Restore the snapshot
kubectl exec -n vault vault-0 -- vault operator raft snapshot restore \
  -force /tmp/${SNAPSHOT_FILE}

echo "Vault restored from ${SNAPSHOT_FILE}"
```

## Security Best Practices

Follow these security recommendations for production Vault deployments.

### Namespace Isolation

Create a dedicated namespace with network policies for Vault.

```yaml
# vault-network-policy.yaml
# Network policy to restrict access to Vault
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: vault-network-policy
  namespace: vault
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: vault
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from application namespaces
    - from:
        - namespaceSelector:
            matchLabels:
              vault-access: "true"
      ports:
        - protocol: TCP
          port: 8200
    # Allow internal Raft communication
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: vault
      ports:
        - protocol: TCP
          port: 8201
  egress:
    # Allow Kubernetes API access
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
    # Allow internal Raft communication
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: vault
      ports:
        - protocol: TCP
          port: 8201
```

### Audit Logging

Enable audit logging to track all Vault operations.

```bash
# Enable file-based audit logging
vault audit enable file file_path=/vault/audit/audit.log

# Enable socket-based audit logging to external SIEM
vault audit enable socket address=siem.company.com:9000 socket_type=tcp
```

### Token and Lease Management

Configure appropriate TTLs and enforce token policies.

```bash
# Create a policy with explicit token properties
vault policy write restricted-policy - <<EOF
# Short-lived tokens for applications
path "auth/token/create" {
  capabilities = ["create", "update"]
  allowed_parameters = {
    "ttl" = ["1h"]
    "max_ttl" = ["4h"]
    "policies" = ["myapp-policy"]
  }
}
EOF

# Set system-wide defaults
vault write sys/auth/kubernetes/tune \
  default_lease_ttl=1h \
  max_lease_ttl=4h
```

## Troubleshooting Common Issues

### Pod Cannot Authenticate

Check the following if pods fail to authenticate with Vault.

```bash
# Verify the service account exists
kubectl get serviceaccount myapp-sa -n default

# Check if the Kubernetes auth role is configured correctly
vault read auth/kubernetes/role/myapp

# Verify the service account token is valid
kubectl exec -it myapp-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token | \
  jwt decode -

# Check Vault logs for authentication errors
kubectl logs -n vault vault-0 | grep -i "auth"
```

### Secrets Not Injected

Debug issues with the Vault Agent Injector.

```bash
# Check injector logs
kubectl logs -n vault -l app.kubernetes.io/name=vault-agent-injector

# Verify annotations on the pod
kubectl get pod myapp-xxx -o jsonpath='{.metadata.annotations}' | jq

# Check init container logs
kubectl logs myapp-xxx -c vault-agent-init

# Check sidecar logs
kubectl logs myapp-xxx -c vault-agent
```

### Vault is Sealed After Restart

If using manual unsealing, pods restart in a sealed state.

```bash
# Check seal status
kubectl exec -n vault vault-0 -- vault status

# Unseal each pod
for i in 0 1 2; do
  kubectl exec -n vault vault-$i -- vault operator unseal $UNSEAL_KEY_1
  kubectl exec -n vault vault-$i -- vault operator unseal $UNSEAL_KEY_2
  kubectl exec -n vault vault-$i -- vault operator unseal $UNSEAL_KEY_3
done
```

---

Vault provides enterprise-grade secrets management for Kubernetes workloads. By implementing the patterns described in this guide, you can significantly improve the security posture of your applications. Start with the Vault Agent Injector for simplicity, graduate to dynamic secrets for sensitive databases, and ensure you have proper backup and monitoring in place before going to production.
