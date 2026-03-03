# How to Set Up HashiCorp Vault on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, HashiCorp Vault, Kubernetes, Secrets Management, Security

Description: A complete guide to deploying and configuring HashiCorp Vault on Talos Linux for centralized secrets management in Kubernetes.

---

HashiCorp Vault is one of the most popular tools for managing secrets, encryption keys, and certificates in modern infrastructure. Running Vault on Kubernetes gives you a centralized secrets management system that your applications can query at runtime, avoiding the need to bake secrets into container images or environment variables. Talos Linux, with its minimal and immutable design, provides a hardened platform for running Vault securely.

In this guide, we will deploy HashiCorp Vault on a Talos Linux cluster using the official Helm chart, configure it for production use, and integrate it with Kubernetes workloads.

## Prerequisites

You will need:

- A Talos Linux cluster with at least three nodes (for high availability)
- kubectl and Helm installed locally
- talosctl configured for your cluster
- A storage class available in the cluster (for persistent volumes)

## Installing Vault with Helm

Start by adding the HashiCorp Helm repository and installing Vault.

```bash
# Add the HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com

# Update the local repo cache
helm repo update
```

Create a values file for a high-availability deployment.

```yaml
# vault-values.yaml
server:
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
        }

        service_registration "kubernetes" {}

  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: "local-path"

  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m

ui:
  enabled: true
  serviceType: ClusterIP

injector:
  enabled: true
  resources:
    requests:
      memory: 64Mi
      cpu: 50m
    limits:
      memory: 128Mi
      cpu: 100m
```

Install Vault using this configuration.

```bash
# Create a namespace for Vault
kubectl create namespace vault

# Install Vault with the custom values
helm install vault hashicorp/vault \
  --namespace vault \
  --values vault-values.yaml

# Watch the pods come up (they will be in a not-ready state until initialized)
kubectl get pods -n vault -w
```

## Initializing Vault

After installation, Vault needs to be initialized. This process generates the master keys and root token.

```bash
# Initialize Vault on the first pod
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init.json

# The output contains unseal keys and the root token
# Store this file securely - you will need it to unseal Vault
```

The `-key-shares=5` flag creates five key shares, and `-key-threshold=3` means three of those shares are needed to unseal Vault. Store these keys in separate secure locations.

## Unsealing Vault

Each Vault pod must be unsealed before it can serve requests. You need to provide three of the five unseal keys.

```bash
# Unseal the first pod (repeat with three different keys)
kubectl exec -n vault vault-0 -- vault operator unseal <KEY_1>
kubectl exec -n vault vault-0 -- vault operator unseal <KEY_2>
kubectl exec -n vault vault-0 -- vault operator unseal <KEY_3>

# Join the second and third pods to the Raft cluster
kubectl exec -n vault vault-1 -- vault operator raft join \
  http://vault-0.vault-internal:8200

kubectl exec -n vault vault-2 -- vault operator raft join \
  http://vault-0.vault-internal:8200

# Unseal the second and third pods as well
kubectl exec -n vault vault-1 -- vault operator unseal <KEY_1>
kubectl exec -n vault vault-1 -- vault operator unseal <KEY_2>
kubectl exec -n vault vault-1 -- vault operator unseal <KEY_3>

kubectl exec -n vault vault-2 -- vault operator unseal <KEY_1>
kubectl exec -n vault vault-2 -- vault operator unseal <KEY_2>
kubectl exec -n vault vault-2 -- vault operator unseal <KEY_3>
```

After unsealing all three pods, check the cluster status.

```bash
# Verify Raft cluster members
kubectl exec -n vault vault-0 -- vault operator raft list-peers
```

## Configuring Kubernetes Authentication

The Kubernetes auth method allows pods running in the cluster to authenticate with Vault using their service account tokens.

```bash
# Log in with the root token
kubectl exec -n vault vault-0 -- vault login <ROOT_TOKEN>

# Enable the Kubernetes auth method
kubectl exec -n vault vault-0 -- vault auth enable kubernetes

# Configure it to use the in-cluster service account
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"
```

## Creating Secrets and Policies

Now let us create a sample secret and a policy that controls access to it.

```bash
# Enable the KV secrets engine (version 2)
kubectl exec -n vault vault-0 -- vault secrets enable -path=secret kv-v2

# Write a sample secret
kubectl exec -n vault vault-0 -- vault kv put secret/database \
  username="admin" \
  password="s3cureP@ssw0rd" \
  host="postgres.default.svc"
```

Create a policy that grants read access to the database secret.

```bash
# Create a policy file
kubectl exec -n vault vault-0 -- /bin/sh -c 'cat <<EOF > /tmp/app-policy.hcl
path "secret/data/database" {
  capabilities = ["read"]
}
EOF'

# Apply the policy
kubectl exec -n vault vault-0 -- vault policy write app-readonly /tmp/app-policy.hcl

# Create a Kubernetes auth role that binds the policy to a service account
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/role/app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=default \
  policies=app-readonly \
  ttl=24h
```

## Using the Vault Agent Injector

The Vault Agent Injector automatically injects secrets into pod containers using annotations. This is the simplest way to consume Vault secrets.

First, create the service account referenced in the role.

```yaml
# app-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: default
```

Now create a deployment that uses Vault annotations to inject secrets.

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
      annotations:
        # Tell the injector to inject secrets
        vault.hashicorp.com/agent-inject: "true"
        # Specify the Vault role to use
        vault.hashicorp.com/role: "app"
        # Define the secret to inject and the file path
        vault.hashicorp.com/agent-inject-secret-db-creds: "secret/data/database"
        # Use a template to format the output
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "secret/data/database" -}}
          export DB_USER="{{ .Data.data.username }}"
          export DB_PASS="{{ .Data.data.password }}"
          export DB_HOST="{{ .Data.data.host }}"
          {{- end }}
    spec:
      serviceAccountName: app-sa
      containers:
        - name: app
          image: alpine:latest
          command: ["/bin/sh", "-c", "source /vault/secrets/db-creds && env | grep DB_ && sleep 3600"]
```

```bash
# Apply both resources
kubectl apply -f app-sa.yaml
kubectl apply -f app-deployment.yaml

# Check that the secrets were injected
kubectl logs deployment/sample-app -c app
```

## Auto-Unseal on Talos Linux

Manual unsealing is impractical for production clusters. You can configure Vault to auto-unseal using a cloud KMS provider.

```yaml
# Updated Vault config for AWS KMS auto-unseal
storage "raft" {
  path = "/vault/data"
}

listener "tcp" {
  tls_disable = 1
  address = "[::]:8200"
  cluster_address = "[::]:8201"
}

# Auto-unseal using AWS KMS
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "your-kms-key-id-here"
}

service_registration "kubernetes" {}
```

With auto-unseal configured, Vault will automatically unseal itself after a restart by contacting the KMS service. This is especially important on Talos Linux, where node reboots can happen during upgrades and you cannot manually intervene.

## Talos-Specific Considerations

Running Vault on Talos Linux introduces some unique considerations:

1. **Persistent storage**: Vault needs persistent storage for the Raft data. Make sure your Talos cluster has a CSI driver or local path provisioner installed.

2. **No manual intervention**: Since you cannot SSH into Talos nodes, auto-unseal is strongly recommended for production deployments.

3. **Resource planning**: Vault can be memory-intensive under load. Plan your Talos node resources accordingly.

4. **Backup strategy**: Regularly back up the Raft snapshots. You can automate this with a CronJob that takes snapshots and stores them in object storage.

```bash
# Take a Raft snapshot manually
kubectl exec -n vault vault-0 -- vault operator raft snapshot save /tmp/vault-snapshot.snap

# Copy it locally
kubectl cp vault/vault-0:/tmp/vault-snapshot.snap ./vault-snapshot.snap
```

## Wrapping Up

HashiCorp Vault on Talos Linux gives you a production-grade secrets management platform on a hardened, immutable operating system. The combination of Vault's dynamic secrets, fine-grained access policies, and audit logging with Talos Linux's minimal attack surface creates a strong security foundation for your Kubernetes workloads. The key takeaway is to always configure auto-unseal for Talos deployments, since manual intervention on nodes is not possible. With the Vault Agent Injector, your applications can consume secrets without any code changes, making adoption straightforward across your teams.
