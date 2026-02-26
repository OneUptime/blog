# How to Manage Secrets with ArgoCD and HashiCorp Vault

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, HashiCorp Vault, Security

Description: A complete guide to integrating HashiCorp Vault with ArgoCD for dynamic secret management using the Vault Agent, CSI driver, and External Secrets Operator.

---

HashiCorp Vault is the industry standard for secret management. Integrating it with ArgoCD requires bridging two paradigms: GitOps (everything in Git) and dynamic secrets (secrets generated on demand). This guide covers three approaches to making Vault work with ArgoCD, from simple to advanced.

## The Challenge

ArgoCD deploys what is in Git. Vault stores secrets that should never be in Git. The integration patterns all solve the same problem differently:

```mermaid
graph TD
    A[ArgoCD] -->|Deploys manifests| B[Kubernetes]
    C[Vault] -->|Provides secrets| B
    D[How do we connect A and C?]
    D --> E[External Secrets Operator]
    D --> F[Vault Agent Sidecar]
    D --> G[CSI Secrets Store Driver]
    D --> H[ArgoCD Vault Plugin]
```

Each approach has trade-offs. Let us explore all of them.

## Approach 1: External Secrets Operator with Vault

This is the most GitOps-native approach. You store ExternalSecret resources in Git, and the ESO controller fetches secrets from Vault.

### Configure Vault for Kubernetes Auth

```bash
# Enable Kubernetes auth method in Vault
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create a policy for ESO
vault policy write external-secrets - <<EOF
path "secret/data/*" {
  capabilities = ["read"]
}
EOF

# Create a role for ESO
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=external-secrets \
  ttl=1h
```

### Create the SecretStore

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault
spec:
  provider:
    vault:
      server: https://vault.example.com
      path: secret
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: external-secrets
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

### Create ExternalSecrets

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: app
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: secret/data/production/my-app
        property: db_password
    - secretKey: API_KEY
      remoteRef:
        key: secret/data/production/my-app
        property: api_key
```

## Approach 2: ArgoCD Vault Plugin (AVP)

The ArgoCD Vault Plugin (AVP) is a Config Management Plugin that replaces placeholder values in your manifests with secrets from Vault at sync time.

### Installing AVP

Create a custom ArgoCD repo-server with AVP installed:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      initContainers:
        - name: download-tools
          image: alpine:3.19
          command: [sh, -c]
          args:
            - >-
              wget -O argocd-vault-plugin
              https://github.com/argoproj-labs/argocd-vault-plugin/releases/download/v1.18.0/argocd-vault-plugin_1.18.0_linux_amd64 &&
              chmod +x argocd-vault-plugin &&
              mv argocd-vault-plugin /custom-tools/
          volumeMounts:
            - name: custom-tools
              mountPath: /custom-tools
      containers:
        - name: argocd-repo-server
          volumeMounts:
            - name: custom-tools
              mountPath: /usr/local/bin/argocd-vault-plugin
              subPath: argocd-vault-plugin
      volumes:
        - name: custom-tools
          emptyDir: {}
```

Register AVP as a Config Management Plugin:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmp-cm
  namespace: argocd
data:
  avp.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: argocd-vault-plugin
    spec:
      allowConcurrency: true
      discover:
        find:
          command:
            - sh
            - "-c"
            - "find . -name '*.yaml' | xargs -I {} grep '<path\\|<secret' {} | grep ."
      generate:
        command:
          - argocd-vault-plugin
          - generate
          - "."
      lockRepo: false
```

### Using AVP Placeholders

With AVP installed, use placeholder syntax in your manifests:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: app
  annotations:
    avp.kubernetes.io/path: "secret/data/production/my-app"
type: Opaque
stringData:
  DB_PASSWORD: <db_password>
  API_KEY: <api_key>
```

When ArgoCD syncs this application, AVP replaces `<db_password>` and `<api_key>` with the actual values from Vault's `secret/data/production/my-app` path.

### Configuring AVP Authentication

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-vault-plugin-credentials
  namespace: argocd
type: Opaque
stringData:
  VAULT_ADDR: https://vault.example.com
  AVP_TYPE: vault
  AVP_AUTH_TYPE: k8s
  AVP_K8S_ROLE: argocd-vault-plugin
```

Mount this in the repo server:

```yaml
containers:
  - name: argocd-repo-server
    envFrom:
      - secretRef:
          name: argocd-vault-plugin-credentials
```

### AVP with Helm

AVP can also process Helm templates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmp-cm
  namespace: argocd
data:
  avp-helm.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: argocd-vault-plugin-helm
    spec:
      allowConcurrency: true
      generate:
        command:
          - sh
          - "-c"
          - |
            helm template $ARGOCD_APP_NAME -n $ARGOCD_APP_NAMESPACE -f <(echo "$ARGOCD_ENV_HELM_VALUES") . |
            argocd-vault-plugin generate -
      lockRepo: false
```

## Approach 3: Vault Dynamic Secrets

Vault can generate short-lived database credentials on demand. Here is how to use them with ArgoCD:

### Configure Vault Database Secrets Engine

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure a PostgreSQL connection
vault write database/config/my-database \
  plugin_name=postgresql-database-plugin \
  allowed_roles="my-app" \
  connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/mydb" \
  username="vault-admin" \
  password="admin-password"

# Create a role that generates temporary credentials
vault write database/roles/my-app \
  db_name=my-database \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Using Dynamic Secrets with ESO

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: app
spec:
  refreshInterval: 30m  # Refresh before TTL expires
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: database/creds/my-app
```

## Vault Namespaces for Multi-Team Isolation

If you use Vault Enterprise with namespaces:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-team-frontend
spec:
  provider:
    vault:
      server: https://vault.example.com
      namespace: teams/frontend  # Vault namespace
      path: secret
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: frontend-team
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Monitoring Vault Integration

```bash
# Check ExternalSecret sync status
kubectl get externalsecret -A -o wide

# Check Vault agent logs if using sidecar
kubectl logs deployment/my-app -n app -c vault-agent

# Verify secrets are being refreshed
kubectl get externalsecret my-app-secrets -n app \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")]}'
```

## Best Practices

1. Use Kubernetes authentication instead of static tokens
2. Create separate Vault policies per team/application
3. Set appropriate refresh intervals based on secret TTLs
4. Use dynamic secrets for database credentials when possible
5. Monitor Vault audit logs alongside ArgoCD audit logs
6. Implement Vault namespace isolation for multi-team environments

## Conclusion

HashiCorp Vault with ArgoCD gives you the best of both worlds - GitOps workflows with centralized, dynamic secret management. The External Secrets Operator approach is the most GitOps-native. The ArgoCD Vault Plugin is simpler for teams already familiar with Vault paths. For dynamic database credentials, ESO with Vault's database secrets engine is the way to go. Choose the approach that fits your team's skills and your organization's security requirements.

For alternative approaches, see our guides on [using Sealed Secrets with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-sealed-secrets-management/view) and [using SOPS with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-sops-secrets/view).
