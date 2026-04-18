# How to Set Up Vault Integration with Rancher - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, HashiCorp Vault, Secrets Management, Kubernetes, Security, RBAC

Description: Deploy HashiCorp Vault on Rancher, configure Kubernetes authentication, and inject secrets into pods using the Vault Agent Injector.

## Introduction

HashiCorp Vault is the most widely adopted secrets management platform in Kubernetes environments. Running Vault on Rancher and integrating it with the Vault Agent Injector enables automatic secret injection into pods without any application code changes.

## Step 1: Deploy Vault on Rancher

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set server.ha.enabled=true \
  --set server.ha.raft.enabled=true \
  --set server.ha.replicas=3 \
  --set injector.enabled=true
```

## Step 2: Initialize and Unseal Vault

```bash
# Initialize Vault (only needed on first run)

kubectl exec -it vault-0 -n vault -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-keys.json

# Unseal Vault with 3 of the 5 unseal keys
kubectl exec -it vault-0 -n vault -- vault operator unseal $(cat vault-keys.json | jq -r '.unseal_keys_b64[0]')
kubectl exec -it vault-0 -n vault -- vault operator unseal $(cat vault-keys.json | jq -r '.unseal_keys_b64[1]')
kubectl exec -it vault-0 -n vault -- vault operator unseal $(cat vault-keys.json | jq -r '.unseal_keys_b64[2]')
```

## Step 3: Configure Kubernetes Authentication

```bash
# Login to Vault with root token
export VAULT_TOKEN=$(cat vault-keys.json | jq -r '.root_token')
kubectl exec -it vault-0 -n vault -- env VAULT_TOKEN=$VAULT_TOKEN vault auth enable kubernetes

# Configure the Kubernetes auth method
kubectl exec -it vault-0 -n vault -- vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

## Step 4: Create a Policy and Role

```bash
# Create a policy that allows reading app secrets
kubectl exec -it vault-0 -n vault -- vault policy write myapp - << 'EOF'
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
EOF

# Create a role binding a Kubernetes ServiceAccount to the policy
kubectl exec -it vault-0 -n vault -- vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp \
  bound_service_account_namespaces=production \
  policies=myapp \
  ttl=1h
```

## Step 5: Store a Secret in Vault

```bash
# Enable KV v2 secrets engine
kubectl exec -it vault-0 -n vault -- vault secrets enable -path=secret kv-v2

# Write a secret
kubectl exec -it vault-0 -n vault -- vault kv put secret/myapp/database \
  username=appuser \
  password=supersecret
```

## Step 6: Inject Secrets via Pod Annotations

The Vault Agent Injector reads annotations and injects secrets as files:

```yaml
# deployment.yaml
spec:
  serviceAccountName: myapp   # Must match the Vault role
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-db: "secret/data/myapp/database"
        vault.hashicorp.com/agent-inject-template-db: |
          {{- with secret "secret/data/myapp/database" -}}
          export DB_USERNAME="{{ .Data.data.username }}"
          export DB_PASSWORD="{{ .Data.data.password }}"
          {{- end }}
    spec:
      containers:
        - name: myapp
          command: ["sh", "-c", "source /vault/secrets/db && ./myapp"]
```

## Conclusion

Vault integration with Rancher provides enterprise-grade secrets management with automatic rotation, audit logging, and fine-grained access controls. The Agent Injector's annotation-based approach requires zero changes to existing application code.
