# How to Integrate Istio with HashiCorp Vault for Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HashiCorp Vault, Secret, Security, Kubernetes

Description: How to integrate HashiCorp Vault with Istio for secure secret management and dynamic credential injection in your mesh.

---

Kubernetes Secrets are base64-encoded, not encrypted. Anyone with access to etcd or the right RBAC permissions can read them. For production environments, especially those running a service mesh, you want something more robust. HashiCorp Vault provides encrypted secret storage, dynamic credentials, fine-grained access control, and audit logging. Integrating it with Istio means your mesh services can securely access secrets without storing them in Kubernetes objects.

## The Integration Points

There are several ways Vault and Istio work together:

1. **Vault Agent Injector** - Injects secrets into pods as files via a mutating webhook
2. **Vault CSI Provider** - Mounts secrets using the Secrets Store CSI Driver
3. **Vault as Istio's CA** - Vault signs the mTLS certificates used by Istio
4. **Application-level** - Your apps use the Vault SDK to fetch secrets directly

We will cover the most practical approaches.

## Installing Vault

Deploy Vault on Kubernetes using Helm:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set "server.dev.enabled=true" \
  --set "injector.enabled=true"
```

The `dev.enabled=true` flag runs Vault in development mode, which is fine for testing but should never be used in production. For production, configure proper storage backends and HA.

Verify Vault is running:

```bash
kubectl get pods -n vault
kubectl exec -n vault vault-0 -- vault status
```

## Configuring Kubernetes Authentication

Vault needs to authenticate requests from Kubernetes pods. Enable the Kubernetes auth method:

```bash
kubectl exec -n vault vault-0 -- vault auth enable kubernetes

kubectl exec -n vault vault-0 -- vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443"
```

Create a policy that allows reading secrets:

```bash
kubectl exec -n vault vault-0 -- vault policy write app-policy - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "database/creds/myapp" {
  capabilities = ["read"]
}
EOF
```

Create a Kubernetes auth role that maps service accounts to policies:

```bash
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp \
  bound_service_account_namespaces=default \
  policies=app-policy \
  ttl=1h
```

## Using the Vault Agent Injector with Istio

The Vault Agent Injector runs as a mutating webhook that injects a Vault Agent sidecar into your pods. This agent authenticates with Vault and renders secrets into files.

When using Istio, the pod already has the Istio sidecar. Adding the Vault Agent sidecar means you have three containers: your app, the Istio proxy, and the Vault agent. This works fine, but you need to handle init container ordering.

Store a secret in Vault:

```bash
kubectl exec -n vault vault-0 -- vault kv put secret/myapp/config \
  db_host="postgres.default.svc" \
  db_user="appuser" \
  db_password="s3cur3p4ss" \
  api_key="abc123xyz"
```

Deploy your application with Vault annotations:

```yaml
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
        sidecar.istio.io/inject: "true"
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-config.txt: "secret/data/myapp/config"
        vault.hashicorp.com/agent-inject-template-config.txt: |
          {{- with secret "secret/data/myapp/config" -}}
          DB_HOST={{ .Data.data.db_host }}
          DB_USER={{ .Data.data.db_user }}
          DB_PASSWORD={{ .Data.data.db_password }}
          API_KEY={{ .Data.data.api_key }}
          {{- end }}
    spec:
      serviceAccountName: myapp
      containers:
      - name: myapp
        image: myapp:latest
        ports:
        - containerPort: 8080
        volumeMounts: []
```

The secrets get rendered to `/vault/secrets/config.txt` inside the container. Your application reads them from there.

## Handling Sidecar Ordering

With both Istio and Vault sidecars, you might run into startup ordering issues. The Vault agent init container needs network access to reach Vault, but the Istio sidecar might not be ready yet.

Fix this by telling Istio to exclude Vault-related traffic from the sidecar:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeOutboundPorts: "8200"
```

Or use Istio's `holdApplicationUntilProxyStarts` option:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

## Dynamic Database Credentials

One of Vault's killer features is dynamic secrets. Instead of static database passwords, Vault generates short-lived credentials on demand:

```bash
# Enable the database secrets engine
kubectl exec -n vault vault-0 -- vault secrets enable database

# Configure the database connection
kubectl exec -n vault vault-0 -- vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="myapp" \
  connection_url="postgresql://{{username}}:{{password}}@postgres.default.svc:5432/mydb?sslmode=disable" \
  username="vault_admin" \
  password="vault_admin_password"

# Create a role that generates credentials
kubectl exec -n vault vault-0 -- vault write database/roles/myapp \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

Use dynamic credentials in your pod:

```yaml
annotations:
  vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/myapp"
  vault.hashicorp.com/agent-inject-template-db-creds: |
    {{- with secret "database/creds/myapp" -}}
    DB_USER={{ .Data.username }}
    DB_PASSWORD={{ .Data.password }}
    {{- end }}
```

The Vault agent automatically renews the credentials before they expire.

## Vault as Istio's Certificate Authority

You can configure Vault as the CA that signs Istio's mTLS certificates. This is done through the cert-manager istio-csr integration:

```bash
# Enable the PKI secrets engine
kubectl exec -n vault vault-0 -- vault secrets enable pki

# Configure the CA
kubectl exec -n vault vault-0 -- vault write pki/root/generate/internal \
  common_name="Istio CA" \
  ttl=87600h

# Create a role for issuing certificates
kubectl exec -n vault vault-0 -- vault write pki/roles/istio-ca \
  allowed_domains="svc.cluster.local" \
  allow_subdomains=true \
  max_ttl=72h
```

Then configure cert-manager to use the Vault issuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    server: http://vault.vault.svc:8200
    path: pki/sign/istio-ca
    auth:
      kubernetes:
        role: cert-manager
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: cert-manager
```

## Monitoring and Audit

Vault provides detailed audit logs. Enable the file audit backend:

```bash
kubectl exec -n vault vault-0 -- vault audit enable file file_path=/vault/audit/audit.log
```

Monitor secret access patterns:

```bash
kubectl exec -n vault vault-0 -- vault audit list
```

Check the Vault agent sidecar logs in your application pods:

```bash
kubectl logs myapp-pod -c vault-agent
```

The Vault and Istio combination addresses two different but complementary security concerns. Istio secures the communication channel between services with mTLS, while Vault secures the secrets those services need to operate. Together, they provide a comprehensive security posture where both data in transit and credentials at rest are properly protected.
