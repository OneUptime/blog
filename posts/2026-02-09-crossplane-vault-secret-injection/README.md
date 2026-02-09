# How to Implement Crossplane with Vault for Secret Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Vault, Secrets Management, Security, Kubernetes

Description: Learn how to integrate Crossplane with HashiCorp Vault to securely inject secrets into managed resources and handle credentials using enterprise secret management patterns.

---

Cloud resources need secrets. Databases require passwords. API keys authenticate service accounts. Certificates secure connections. Storing these in plain Kubernetes secrets creates security risks. Vault centralizes secret storage with encryption, access control, and audit logging.

Crossplane integrates with Vault through External Secrets Operator and the Vault Agent Injector. This guide shows you how to pull secrets from Vault into Crossplane managed resources and push generated credentials back to Vault for centralized management.

## Architecture Overview

The integration works in two directions. Crossplane reads secrets from Vault when provisioning resources. After provisioning, Crossplane can write generated credentials back to Vault. Applications then read those credentials through Vault's standard mechanisms.

External Secrets Operator pulls secrets from Vault and creates Kubernetes secrets that Crossplane references. For the reverse flow, Crossplane function pipelines can push connection details to Vault after resource creation.

## Installing External Secrets Operator

Start by deploying ESO to bridge Kubernetes and Vault.

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

Verify the installation.

```bash
kubectl get pods -n external-secrets-system
```

## Configuring Vault Authentication

Set up Kubernetes authentication in Vault.

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

Create a policy for Crossplane to read secrets.

```hcl
# crossplane-policy.hcl
path "secret/data/crossplane/*" {
  capabilities = ["read", "list"]
}

path "database/creds/crossplane-*" {
  capabilities = ["read"]
}
```

Apply the policy.

```bash
vault policy write crossplane-read crossplane-policy.hcl
```

Create a Vault role for Crossplane.

```bash
vault write auth/kubernetes/role/crossplane \
  bound_service_account_names=crossplane \
  bound_service_account_namespaces=crossplane-system \
  policies=crossplane-read \
  ttl=24h
```

## Setting Up SecretStore

Create a SecretStore that connects to Vault.

```yaml
# vault-secretstore.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: crossplane-system
spec:
  provider:
    vault:
      server: "http://vault.vault-system.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "crossplane"
          serviceAccountRef:
            name: crossplane
```

Apply the SecretStore.

```bash
kubectl apply -f vault-secretstore.yaml
```

## Pulling Secrets from Vault for Crossplane

Store a database password in Vault.

```bash
vault kv put secret/crossplane/database/master-password password="$(openssl rand -base64 32)"
```

Create an ExternalSecret to sync from Vault.

```yaml
# external-secret-db-password.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-master-password
  namespace: crossplane-system
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-master-password
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: crossplane/database/master-password
        property: password
```

Apply the ExternalSecret.

```bash
kubectl apply -f external-secret-db-password.yaml
```

ESO creates a Kubernetes secret with the password from Vault.

```bash
kubectl get secret db-master-password -n crossplane-system
```

## Using Vault Secrets in Managed Resources

Reference the synchronized secret in a managed resource.

```yaml
# rds-with-vault-password.yaml
apiVersion: rds.aws.upbound.io/v1beta1
kind: Instance
metadata:
  name: postgres-db
spec:
  forProvider:
    region: us-west-2
    engine: postgres
    engineVersion: "15.4"
    instanceClass: db.t3.medium
    allocatedStorage: 100
    username: dbadmin
    # Reference the secret synced from Vault
    passwordSecretRef:
      namespace: crossplane-system
      name: db-master-password
      key: password
  writeConnectionSecretToRef:
    namespace: production
    name: postgres-connection
```

The RDS instance uses the password from Vault without Crossplane ever seeing it in plaintext.

## Using Vault in Compositions

Pull multiple secrets from Vault for a composition.

```yaml
# external-secret-app-credentials.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-infrastructure-secrets
  namespace: crossplane-system
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-infrastructure-secrets
    creationPolicy: Owner
  dataFrom:
    # Pull entire path
    - extract:
        key: crossplane/applications/myapp
```

Reference in composition.

```yaml
# composition-with-vault-secrets.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: application-stack
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: ApplicationStack
  resources:
    - name: database
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
            allocatedStorage: 100
            username: appuser
            passwordSecretRef:
              namespace: crossplane-system
              name: app-infrastructure-secrets
              key: db_password

    - name: s3-bucket
      base:
        apiVersion: s3.aws.upbound.io/v1beta1
        kind: Bucket
        spec:
          forProvider:
            region: us-west-2

    - name: bucket-policy
      base:
        apiVersion: s3.aws.upbound.io/v1beta1
        kind: BucketPolicy
        spec:
          forProvider:
            region: us-west-2
            bucket: ""
            policy: ""
      patches:
        # Pull policy from Vault secret
        - type: FromCompositeFieldPath
          fromFieldPath: metadata.name
          toFieldPath: spec.forProvider.bucket
```

## Pushing Generated Credentials to Vault

Use Crossplane functions to push connection secrets to Vault.

```yaml
# function-push-to-vault.yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: Function
metadata:
  name: function-vault-push
spec:
  package: xpkg.upbound.io/crossplane-contrib/function-vault-push:v0.1.0
```

Create a composition that uses the function.

```yaml
# composition-with-vault-push.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-with-vault-storage
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance

  mode: Pipeline
  pipeline:
    - step: provision-resources
      functionRef:
        name: function-auto-ready

    - step: push-to-vault
      functionRef:
        name: function-vault-push
      input:
        apiVersion: vault.fn.crossplane.io/v1beta1
        kind: PushSecrets
        spec:
          vaultAddress: "http://vault.vault-system.svc.cluster.local:8200"
          authMethod: kubernetes
          path: "secret/data/databases"
          secrets:
            - name: endpoint
              connectionSecretKey: endpoint
            - name: port
              connectionSecretKey: port
            - name: username
              connectionSecretKey: username
            - name: password
              connectionSecretKey: password

  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
            allocatedStorage: 100
      connectionDetails:
        - name: endpoint
          fromConnectionSecretKey: endpoint
        - name: port
          fromConnectionSecretKey: port
        - name: username
          fromConnectionSecretKey: username
        - name: password
          fromConnectionSecretKey: password
```

When the database provisions, Crossplane pushes its connection details to Vault.

## Using Vault Dynamic Secrets

Configure Vault to generate database credentials dynamically.

```bash
# Enable database secrets engine
vault secrets enable database

# Configure database connection
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="crossplane-app" \
  connection_url="postgresql://{{username}}:{{password}}@postgres-db.example.com:5432/postgres" \
  username="vault" \
  password="vault-password"

# Create a role for application access
vault write database/roles/crossplane-app \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

Applications request credentials from Vault instead of using static passwords.

```yaml
# external-secret-dynamic-db-creds.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-db-credentials
  namespace: production
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: database/creds/crossplane-app
        property: username
    - secretKey: password
      remoteRef:
        key: database/creds/crossplane-app
        property: password
```

Vault generates new credentials every 30 minutes, automatically rotating them.

## Vault Agent Injector for Crossplane Providers

Inject Vault secrets directly into Crossplane provider pods.

```yaml
# provider-aws-with-vault.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws:v0.45.0
---
apiVersion: pkg.crossplane.io/v1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: InjectedIdentity
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: provider-aws
  namespace: crossplane-system
spec:
  template:
    metadata:
      annotations:
        # Inject AWS credentials from Vault
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "crossplane-aws"
        vault.hashicorp.com/agent-inject-secret-credentials: "secret/crossplane/aws/credentials"
        vault.hashicorp.com/agent-inject-template-credentials: |
          {{- with secret "secret/crossplane/aws/credentials" -}}
          [default]
          aws_access_key_id = {{ .Data.data.access_key }}
          aws_secret_access_key = {{ .Data.data.secret_key }}
          {{- end }}
    spec:
      serviceAccountName: provider-aws
      containers:
        - name: provider-aws
          env:
            - name: AWS_SHARED_CREDENTIALS_FILE
              value: /vault/secrets/credentials
```

The Vault agent injects AWS credentials into the provider pod at runtime.

## Encrypting Crossplane Connection Secrets with Vault Transit

Use Vault's transit engine to encrypt connection secrets.

```bash
# Enable transit engine
vault secrets enable transit

# Create encryption key
vault write -f transit/keys/crossplane-secrets
```

Create a function to encrypt secrets.

```yaml
# composition-encrypted-secrets.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-encrypted-secrets
spec:
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance

  mode: Pipeline
  pipeline:
    - step: provision-resources
      functionRef:
        name: function-auto-ready

    - step: encrypt-secrets
      functionRef:
        name: function-vault-transit-encrypt
      input:
        apiVersion: vault.fn.crossplane.io/v1beta1
        kind: EncryptSecrets
        spec:
          vaultAddress: "http://vault.vault-system.svc.cluster.local:8200"
          transitKey: "crossplane-secrets"
          secrets:
            - password

  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-west-2
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.t3.medium
```

Connection secrets get encrypted before storage in Kubernetes.

## Auditing Secret Access

Enable Vault audit logging to track secret access.

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Query audit logs for Crossplane access
cat /vault/logs/audit.log | jq 'select(.auth.metadata.service_account_name == "crossplane")'
```

Create alerts for suspicious access patterns.

```yaml
# prometheus-vault-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-crossplane-alerts
  namespace: monitoring
data:
  rules.yaml: |
    groups:
      - name: vault-crossplane
        rules:
          - alert: CrossplaneVaultAccessDenied
            expr: |
              rate(vault_core_handle_request{path=~"secret/crossplane/.*",error!=""}[5m]) > 0
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Crossplane Vault access denied"

          - alert: CrossplaneVaultSecretNotFound
            expr: |
              vault_core_handle_request{path=~"secret/crossplane/.*",code="404"}
            labels:
              severity: critical
            annotations:
              summary: "Crossplane trying to access non-existent Vault secret"
```

## Rotating Vault Secrets

Implement automatic secret rotation for Crossplane credentials.

```bash
# Create rotation script
vault write sys/rotate/crossplane-database \
  rotation_period=24h \
  secrets_path=secret/crossplane/database
```

ExternalSecrets automatically picks up rotated values.

```yaml
# external-secret-with-rotation.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotated-db-password
  namespace: crossplane-system
spec:
  # Refresh every 15 minutes to pick up rotations
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: rotated-db-password
    creationPolicy: Owner
    template:
      type: Opaque
      metadata:
        annotations:
          rotated-at: "{{ now }}"
  data:
    - secretKey: password
      remoteRef:
        key: crossplane/database/master-password
        property: password
```

## High Availability Configuration

Configure ESO and Vault for high availability.

```yaml
# vault-secretstore-ha.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend-ha
spec:
  provider:
    vault:
      # Multiple Vault servers
      server: "https://vault.example.com"
      namespace: "crossplane"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "crossplane"
          serviceAccountRef:
            name: crossplane
            namespace: crossplane-system
      # TLS configuration
      caBundle: |
        -----BEGIN CERTIFICATE-----
        ...
        -----END CERTIFICATE-----
```

## Summary

Integrating Crossplane with Vault centralizes secret management. External Secrets Operator syncs secrets from Vault to Kubernetes. Crossplane references these secrets when provisioning resources. Function pipelines can push generated credentials back to Vault.

Use Vault's dynamic secrets for automatic credential rotation. Encrypt connection secrets with Vault Transit. Audit all secret access through Vault's logging. This pattern provides enterprise-grade secret management for infrastructure provisioning.

Vault integration removes secrets from Git repositories and Kubernetes manifests. Credentials stay encrypted in Vault with fine-grained access control. Applications and infrastructure components retrieve secrets on demand with automatic rotation and comprehensive audit trails.
