# How to implement ArgoCD with Vault for dynamic secret injection during sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Vault, Secrets Management, GitOps, Security

Description: Learn how to integrate ArgoCD with HashiCorp Vault to inject secrets dynamically during application sync, enabling secure GitOps workflows without storing sensitive data in Git repositories.

---

Storing secrets in Git repositories, even encrypted ones, creates security risks and operational overhead. HashiCorp Vault provides a centralized secrets management solution that can inject secrets dynamically into Kubernetes workloads. By integrating ArgoCD with Vault, you can keep your Git repositories free of sensitive data while still maintaining a complete GitOps workflow.

This guide demonstrates multiple approaches to implementing ArgoCD with Vault for dynamic secret injection, from simple plugin-based solutions to advanced patterns using init containers and CSI drivers.

## Understanding ArgoCD and Vault integration patterns

Several patterns exist for integrating ArgoCD with Vault:

**Vault Plugin for ArgoCD:** Injects secrets during manifest generation
**External Secrets Operator:** Creates Kubernetes Secrets from Vault
**Vault Agent Injector:** Sidecar-based secret injection
**Vault CSI Provider:** Mounts secrets as volumes
**argocd-vault-plugin:** Third-party plugin for secret substitution

Each approach has different trade-offs in complexity, security, and flexibility.

## Installing argocd-vault-plugin

The argocd-vault-plugin (AVP) is the most common integration method. Install it by modifying the argocd-repo-server:

```yaml
# argocd-repo-server-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          volumeMounts:
            - name: custom-tools
              mountPath: /usr/local/bin/argocd-vault-plugin
              subPath: argocd-vault-plugin
          env:
            - name: AVP_TYPE
              value: vault
            - name: AVP_AUTH_TYPE
              value: k8s
            - name: AVP_K8S_ROLE
              value: argocd
            - name: VAULT_ADDR
              value: http://vault.vault.svc:8200
      initContainers:
        - name: download-tools
          image: alpine:3.18
          command:
            - sh
            - -c
            - |
              wget -O argocd-vault-plugin https://github.com/argoproj-labs/argocd-vault-plugin/releases/download/v1.17.0/argocd-vault-plugin_1.17.0_linux_amd64
              chmod +x argocd-vault-plugin
              mv argocd-vault-plugin /custom-tools/
          volumeMounts:
            - name: custom-tools
              mountPath: /custom-tools
      volumes:
        - name: custom-tools
          emptyDir: {}
```

Apply the patch:

```bash
kubectl patch deployment argocd-repo-server -n argocd --patch-file argocd-repo-server-patch.yaml
```

## Configuring Vault Kubernetes authentication

Set up Kubernetes authentication in Vault:

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host=https://kubernetes.default.svc \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create a policy for ArgoCD
vault policy write argocd - <<EOF
path "secret/data/argocd/*" {
  capabilities = ["read", "list"]
}
path "secret/data/applications/*" {
  capabilities = ["read", "list"]
}
EOF

# Create a role for ArgoCD
vault write auth/kubernetes/role/argocd \
  bound_service_account_names=argocd-repo-server \
  bound_service_account_namespaces=argocd \
  policies=argocd \
  ttl=1h
```

## Storing secrets in Vault

Store application secrets in Vault:

```bash
# Enable KV secrets engine
vault secrets enable -version=2 -path=secret kv

# Store database credentials
vault kv put secret/argocd/database \
  username=dbuser \
  password=SecurePassword123 \
  host=postgres.database.svc

# Store API keys
vault kv put secret/applications/api-keys \
  github_token=ghp_token123 \
  slack_webhook=https://hooks.slack.com/services/xxx

# Store TLS certificates
vault kv put secret/applications/tls \
  cert=@tls.crt \
  key=@tls.key
```

## Using argocd-vault-plugin in manifests

Reference Vault secrets in your Kubernetes manifests using AVP placeholders:

```yaml
# secret.yaml in Git repository
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: <username>
  password: <password>
  host: <host>
  # AVP will replace these placeholders with values from:
  # path: secret/data/argocd/database
```

Create an ArgoCD Application using the plugin:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-with-vault-secrets
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: k8s
    plugin:
      name: argocd-vault-plugin
      env:
        - name: AVP_SECRET_NAME
          value: database-credentials
        - name: AVP_PATH_PREFIX
          value: secret/data/argocd
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Register the plugin in argocd-cm ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  configManagementPlugins: |
    - name: argocd-vault-plugin
      generate:
        command: ["argocd-vault-plugin"]
        args: ["generate", "./"]
```

## Using path-based secret injection

Reference specific Vault paths in annotations:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  annotations:
    avp.kubernetes.io/path: secret/data/applications/api-keys
spec:
  replicas: 3
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
          image: myorg/api:v1.2.3
          env:
            - name: GITHUB_TOKEN
              value: <github_token>
            - name: SLACK_WEBHOOK
              value: <slack_webhook>
            - name: DATABASE_PASSWORD
              value: <path:secret/data/argocd/database#password>
```

AVP supports multiple placeholder formats:
- `<key>` - Uses path from annotation
- `<path:vault/path#key>` - Explicit path and key
- `<path:vault/path#key | base64encode>` - With modifier

## Implementing External Secrets Operator with Vault

For a Kubernetes-native approach, use External Secrets Operator:

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
```

Create a SecretStore for Vault:

```yaml
# vault-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: http://vault.vault.svc:8200
      path: secret
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: argocd
          serviceAccountRef:
            name: external-secrets
```

Create ExternalSecret resources:

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: argocd/database
```

ArgoCD Application definition:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-with-external-secrets
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/app.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

The ExternalSecret manifests in Git create Kubernetes Secrets populated from Vault.

## Using Vault Agent Injector with ArgoCD

Vault Agent Injector uses init and sidecar containers for secret injection:

```yaml
# deployment-with-vault-agent.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-vault-agent
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "argocd"
        vault.hashicorp.com/agent-inject-secret-database: "secret/data/argocd/database"
        vault.hashicorp.com/agent-inject-template-database: |
          {{- with secret "secret/data/argocd/database" -}}
          export DATABASE_USERNAME="{{ .Data.data.username }}"
          export DATABASE_PASSWORD="{{ .Data.data.password }}"
          export DATABASE_HOST="{{ .Data.data.host }}"
          {{- end }}
    spec:
      serviceAccountName: app-sa
      containers:
        - name: app
          image: myorg/app:v1.2.3
          command:
            - /bin/sh
            - -c
            - |
              source /vault/secrets/database
              exec /app/start
```

The Vault Agent handles authentication and secret retrieval automatically.

## Implementing Vault CSI Provider

For mounting secrets as files, use Vault CSI Provider:

```yaml
# Install Vault CSI Provider
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault-csi-provider hashicorp/vault-csi-provider -n vault-system --create-namespace
```

Create SecretProviderClass:

```yaml
# secret-provider-class.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-database
  namespace: production
spec:
  provider: vault
  parameters:
    vaultAddress: http://vault.vault.svc:8200
    roleName: argocd
    objects: |
      - objectName: "username"
        secretPath: "secret/data/argocd/database"
        secretKey: "username"
      - objectName: "password"
        secretPath: "secret/data/argocd/database"
        secretKey: "password"
```

Mount secrets in Pod:

```yaml
# deployment-with-csi.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-csi
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: app-sa
      containers:
        - name: app
          image: myorg/app:v1.2.3
          volumeMounts:
            - name: secrets-store
              mountPath: /mnt/secrets
              readOnly: true
          env:
            - name: DATABASE_USERNAME
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: username
      volumes:
        - name: secrets-store
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: vault-database
```

## Rotating secrets with ArgoCD and Vault

Implement automatic secret rotation:

```yaml
# external-secret-with-rotation.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-credentials
  namespace: production
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
spec:
  refreshInterval: 5m  # Check for updates every 5 minutes
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-credentials
    creationPolicy: Owner
    template:
      metadata:
        annotations:
          reloader.stakater.com/match: "true"
  data:
    - secretKey: password
      remoteRef:
        key: argocd/database
        property: password
```

Use Reloader to restart pods when secrets change:

```bash
# Install Reloader
helm repo add stakater https://stakater.github.io/stakater-charts
helm install reloader stakater/reloader -n kube-system
```

Annotate Deployments to watch for secret changes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  # ... deployment spec
```

## Monitoring Vault integration

Track secret sync status:

```bash
# Check ExternalSecret status
kubectl get externalsecrets -n production
kubectl describe externalsecret database-credentials -n production

# View Vault Agent logs
kubectl logs -n production pod-name -c vault-agent

# Check argocd-vault-plugin logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server | grep avp
```

Set up alerts for secret sync failures:

```yaml
groups:
  - name: vault-secrets-alerts
    rules:
      - alert: ExternalSecretSyncFailed
        expr: |
          external_secrets_sync_calls_error > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "External Secret sync failed"
```

## Best practices for Vault with ArgoCD

1. **Use short-lived tokens:** Configure appropriate TTLs for Vault tokens
2. **Implement least privilege:** Grant minimal necessary Vault permissions
3. **Rotate secrets regularly:** Automate secret rotation processes
4. **Monitor secret access:** Audit Vault access logs
5. **Use namespaced SecretStores:** Isolate secrets by namespace
6. **Test secret injection:** Validate secrets are injected correctly
7. **Document secret paths:** Maintain inventory of Vault secret locations
8. **Implement backup strategy:** Back up Vault data regularly

## Conclusion

Integrating ArgoCD with HashiCorp Vault enables secure GitOps workflows where sensitive data never enters your Git repositories. Whether using argocd-vault-plugin for simple substitution, External Secrets Operator for Kubernetes-native integration, or Vault Agent for advanced use cases, you can maintain security best practices while enjoying the benefits of declarative configuration management. Choose the integration pattern that best fits your security requirements and operational complexity tolerance.
