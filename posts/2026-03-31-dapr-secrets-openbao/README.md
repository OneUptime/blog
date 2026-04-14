# How to Configure Dapr with OpenBao Secret Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, OpenBao, Secret Management, Open Source, Security

Description: Learn how to configure Dapr to use OpenBao as a secret store backend, an open-source fork of HashiCorp Vault that maintains the Mozilla Public License.

---

OpenBao is an open-source fork of HashiCorp Vault maintained by the Linux Foundation, created after HashiCorp changed Vault's license to Business Source License (BSL). It is API-compatible with Vault, making it a drop-in replacement. Dapr supports OpenBao through the HashiCorp Vault secret store component, which works with both Vault and OpenBao.

## Deploy OpenBao

Deploy OpenBao on Kubernetes using the official Helm chart:

```bash
helm repo add openbao https://openbao.github.io/openbao-helm
helm repo update

helm install openbao openbao/openbao \
  --namespace openbao \
  --create-namespace \
  --set "server.dev.enabled=true"
```

For production, use proper storage backend configuration:

```yaml
# values.yaml for production OpenBao
server:
  ha:
    enabled: true
    replicas: 3
    config: |
      ui = true

      listener "tcp" {
        tls_disable = 1
        address = "[::]:8200"
        cluster_address = "[::]:8201"
      }

      storage "consul" {
        path = "openbao/"
        address = "consul:8500"
      }

      service_registration "kubernetes" {}

ui:
  enabled: true
```

## Initialize and Configure OpenBao

```bash
# Initialize (production mode only)
kubectl exec -it openbao-0 -n openbao -- bao operator init \
  -key-shares=5 \
  -key-threshold=3

# Unseal and login
kubectl exec -it openbao-0 -n openbao -- bao operator unseal <unseal-key>
kubectl exec -it openbao-0 -n openbao -- bao login <root-token>

# Enable KV v2 secrets engine
kubectl exec -it openbao-0 -n openbao -- bao secrets enable -version=2 -path=secret kv

# Create a secret
kubectl exec -it openbao-0 -n openbao -- \
  bao kv put secret/myapp/credentials \
  db-password="mysecurepassword" \
  api-key="my-api-key"
```

## Configure Kubernetes Auth in OpenBao

```bash
kubectl exec -it openbao-0 -n openbao -- bao auth enable kubernetes

kubectl exec -it openbao-0 -n openbao -- bao write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

kubectl exec -it openbao-0 -n openbao -- bao policy write myapp-policy - <<'EOF'
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
EOF

kubectl exec -it openbao-0 -n openbao -- bao write auth/kubernetes/role/myapp \
  bound_service_account_names=my-service-sa \
  bound_service_account_namespaces=production \
  policies=myapp-policy \
  ttl=1h
```

## Configure the Dapr Component

Since OpenBao is API-compatible with Vault, use the HashiCorp Vault component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openbao-store
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "http://openbao.openbao.svc.cluster.local:8200"
    - name: vaultTokenMountPath
      value: "/var/run/secrets/tokens/openbao-token"
    - name: vaultKVUsePrefix
      value: "true"
    - name: vaultKVPrefix
      value: "secret"
```

## Retrieve Secrets

```bash
curl http://localhost:3500/v1.0/secrets/openbao-store/myapp%2Fcredentials
```

Response:

```json
{
  "db-password": "mysecurepassword",
  "api-key": "my-api-key"
}
```

## Summary

Configuring Dapr with OpenBao uses the same HashiCorp Vault component since OpenBao maintains full API compatibility. Deploy OpenBao via Helm, configure Kubernetes auth, define a Dapr component pointing to the OpenBao address, and your applications can use the standard Dapr secrets API to retrieve credentials from this fully open-source secret store.
