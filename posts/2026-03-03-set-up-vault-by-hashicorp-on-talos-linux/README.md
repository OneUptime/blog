# How to Set Up Vault by HashiCorp on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, HashiCorp Vault, Secrets Management, Kubernetes, Security, DevOps

Description: Learn how to deploy and configure HashiCorp Vault on Talos Linux for secure secrets management in your Kubernetes cluster.

---

HashiCorp Vault is the industry standard for secrets management, providing a centralized place to store, access, and distribute secrets like API keys, passwords, certificates, and encryption keys. Running Vault on Talos Linux is a natural fit because both tools share the same philosophy of minimal attack surface and security by default. Talos's immutable OS means the host running your secrets infrastructure cannot be tampered with, which adds an extra layer of protection to your most sensitive data.

This guide walks you through deploying Vault on Talos Linux using Helm, configuring the storage backend, initializing and unsealing Vault, and integrating it with Kubernetes workloads.

## Prerequisites

Make sure you have:

- A Talos Linux Kubernetes cluster with at least three nodes (recommended for HA)
- kubectl configured for your cluster
- Helm v3 installed
- A storage provisioner for persistent volumes
- An ingress controller (optional, for UI access)

## Installing Vault with Helm

Add the HashiCorp Helm repository:

```bash
# Add the HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
```

Create a namespace:

```bash
kubectl create namespace vault
```

Create a values file tailored for Talos Linux:

```yaml
# vault-values.yaml
server:
  # Run Vault in HA mode with Raft integrated storage
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      config: |
        ui = true

        listener "tcp" {
          tls_disable = 1
          address = "[::]:8200"
          cluster_address = "[::]:8201"
        }

        storage "raft" {
          path = "/vault/data"
          retry_join {
            leader_api_addr = "http://vault-0.vault-internal:8200"
          }
          retry_join {
            leader_api_addr = "http://vault-1.vault-internal:8200"
          }
          retry_join {
            leader_api_addr = "http://vault-2.vault-internal:8200"
          }
        }

        service_registration "kubernetes" {}

  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: local-path

  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m

# Enable the Vault UI
ui:
  enabled: true
  serviceType: ClusterIP

# Install the injector for automatic secret injection
injector:
  enabled: true
  replicas: 2
```

Install Vault:

```bash
# Install Vault using Helm
helm install vault hashicorp/vault \
  --namespace vault \
  -f vault-values.yaml
```

## Initializing Vault

After the pods are running (they will be in a not-ready state initially because Vault is sealed), initialize the first node:

```bash
# Initialize Vault on the first pod
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init.json
```

This creates five unseal keys and a root token. Store these securely - losing them means losing access to your Vault. In production, consider using auto-unseal with a cloud KMS provider.

## Unsealing Vault

Vault starts in a sealed state and needs to be unsealed with at least three of the five keys. Unseal each pod:

```bash
# Extract unseal keys from the init output
UNSEAL_KEY_1=$(cat vault-init.json | jq -r '.unseal_keys_b64[0]')
UNSEAL_KEY_2=$(cat vault-init.json | jq -r '.unseal_keys_b64[1]')
UNSEAL_KEY_3=$(cat vault-init.json | jq -r '.unseal_keys_b64[2]')

# Unseal vault-0
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

Verify all pods are ready:

```bash
kubectl get pods -n vault
```

## Configuring Kubernetes Authentication

The Kubernetes auth method lets pods authenticate with Vault using their service account tokens. This is the most common pattern for Kubernetes workloads:

```bash
# Get the root token
ROOT_TOKEN=$(cat vault-init.json | jq -r '.root_token')

# Enable Kubernetes auth method
kubectl exec -n vault vault-0 -- sh -c "
  vault login $ROOT_TOKEN
  vault auth enable kubernetes
  vault write auth/kubernetes/config \
    kubernetes_host=https://kubernetes.default.svc:443
"
```

## Creating Secrets and Policies

Create a KV secrets engine and store some secrets:

```bash
kubectl exec -n vault vault-0 -- sh -c "
  # Enable KV v2 secrets engine
  vault secrets enable -path=secret kv-v2

  # Store a secret
  vault kv put secret/myapp/config \
    db_host=postgres.default.svc \
    db_user=myapp \
    db_password=supersecret123

  # Create a policy that allows reading the secret
  vault policy write myapp-policy - <<EOF
path \"secret/data/myapp/*\" {
  capabilities = [\"read\"]
}
EOF

  # Create a role binding the policy to a Kubernetes service account
  vault write auth/kubernetes/role/myapp \
    bound_service_account_names=myapp-sa \
    bound_service_account_namespaces=default \
    policies=myapp-policy \
    ttl=1h
"
```

## Using Vault Secrets in Pods

With the injector enabled, you can annotate pods to automatically inject secrets:

```yaml
# myapp-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        # Vault agent injector annotations
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/config"
        vault.hashicorp.com/agent-inject-template-config: |
          {{- with secret "secret/data/myapp/config" -}}
          DB_HOST={{ .Data.data.db_host }}
          DB_USER={{ .Data.data.db_user }}
          DB_PASSWORD={{ .Data.data.db_password }}
          {{- end }}
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myapp:latest
          command: ["sh", "-c", "source /vault/secrets/config && exec myapp"]
```

## Auto-Unseal Configuration

Manual unsealing is not practical for production. Configure auto-unseal using a cloud KMS or Transit secrets engine. Here is an example using AWS KMS:

```yaml
# vault-autounseal-values.yaml
server:
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      config: |
        seal "awskms" {
          region     = "us-east-1"
          kms_key_id = "your-kms-key-id"
        }

        listener "tcp" {
          tls_disable = 1
          address = "[::]:8200"
          cluster_address = "[::]:8201"
        }

        storage "raft" {
          path = "/vault/data"
        }
```

You will also need to provide AWS credentials through environment variables or IAM roles for service accounts.

## Monitoring Vault

Vault exposes Prometheus metrics that you can scrape. Enable telemetry in the Vault config:

```bash
kubectl exec -n vault vault-0 -- sh -c "
  vault write sys/config/auditing/enable-raw-body true
"
```

Create a ServiceMonitor to scrape metrics:

```yaml
# vault-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vault
  namespace: vault
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: vault
  endpoints:
    - port: http
      path: /v1/sys/metrics
      params:
        format: ["prometheus"]
      interval: 30s
```

## Conclusion

HashiCorp Vault on Talos Linux is a powerful combination for secrets management. Talos's immutable infrastructure means your secrets server runs on a host that cannot be compromised through OS-level attacks, while Vault provides fine-grained access control and audit logging for every secret access. With HA mode, auto-unseal, and Kubernetes integration configured, you have a production-grade secrets management platform that scales with your infrastructure.
