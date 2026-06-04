# How to Implement Crossplane with Vault for Secret Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Crossplane, Vault, Secrets Management, Security, Kubernetes

Description: Learn how to integrate Crossplane with HashiCorp Vault to securely inject secrets into managed resources and handle credentials using enterprise secret management patterns.

---

Cloud resources need secrets. Databases require passwords. API keys authenticate service accounts. Certificates secure connections. Storing these in plain Kubernetes secrets creates security risks. Vault centralizes secret storage with encryption, access control, and audit logging.

Crossplane integrates with Vault through External Secrets Operator and the Vault Agent Injector. This guide shows you how to pull secrets from Vault into Kubernetes secrets that Crossplane managed resources can reference, and how Crossplane v1.x can publish generated connection details to Vault through its External Secret Stores feature.

## Architecture Overview

The integration works in two directions. External Secrets Operator reads secrets from Vault and writes Kubernetes secrets that Crossplane providers reference when provisioning resources. After provisioning, Crossplane v1.x can write generated credentials back to Vault with External Secret Stores. Applications then read those credentials through Vault's standard mechanisms.

External Secrets Operator pulls secrets from Vault and creates Kubernetes secrets that Crossplane references. For the reverse flow, Crossplane can publish connection details to Vault with External Secret Stores. This feature is alpha, is disabled by default, and is not recommended for production deployments.

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
# Run this from the Vault pod, or substitute the reviewer JWT and CA values.
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

Allow the Vault service account to call the Kubernetes TokenReview API.

```bash
kubectl create clusterrolebinding vault-tokenreview \
  --clusterrole=system:auth-delegator \
  --serviceaccount=vault-system:vault
```

Create a policy for Crossplane to read secrets.

```hcl
# crossplane-policy.hcl
path "secret/data/crossplane/*" {
  capabilities = ["read"]
}

path "secret/metadata/crossplane/*" {
  capabilities = ["list"]
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
  audience=vault \
  token_policies=crossplane-read \
  ttl=24h
```

## Setting Up SecretStore

Create a SecretStore that connects to Vault.

```yaml
# vault-secretstore.yaml
apiVersion: external-secrets.io/v1
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
            audiences:
              - vault
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
apiVersion: external-secrets.io/v1
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

The RDS provider reads the password from the Kubernetes secret created by ESO, so the secret does not need to be stored in Git or written directly in the managed resource manifest.

## Using Vault in Compositions

Pull multiple secrets from Vault for a composition.

```yaml
# external-secret-app-credentials.yaml
apiVersion: external-secrets.io/v1
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
  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
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
              - type: FromCompositeFieldPath
                fromFieldPath: metadata.name
                toFieldPath: spec.forProvider.bucket
```

## Pushing Generated Credentials to Vault

Use Crossplane External Secret Stores to publish connection details to Vault. This feature is alpha in Crossplane v1.x, disabled by default, and is not recommended for production use. Crossplane v2 migration guidance recommends using native Kubernetes secrets or External Secrets Operator instead of External Secret Stores.

```yaml
# function-patch-and-transform.yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-patch-and-transform
spec:
  package: xpkg.crossplane.io/crossplane-contrib/function-patch-and-transform:v0.8.2
---
# provider-vault-runtime.yaml
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: enable-ess
spec:
  deploymentTemplate:
    spec:
      selector: {}
      template:
        spec:
          containers:
            - name: package-runtime
              args:
                - --enable-external-secret-stores
---
# vault-storeconfig.yaml
apiVersion: aws.upbound.io/v1alpha1
kind: StoreConfig
metadata:
  name: vault
spec:
  type: Plugin
  defaultScope: crossplane-system
  plugin:
    endpoint: ess-plugin-vault.crossplane-system:4040
    configRef:
      apiVersion: secrets.crossplane.io/v1alpha1
      kind: VaultConfig
      name: vault-internal
```

Create a composition that uses the function.

```yaml
# composition-with-vault-push.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: database-with-vault-storage
spec:
  publishConnectionDetailsWithStoreConfigRef:
    name: vault
  compositeTypeRef:
    apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance

  mode: Pipeline
  pipeline:
    - step: patch-and-transform
      functionRef:
        name: function-patch-and-transform
      input:
        apiVersion: pt.fn.crossplane.io/v1beta1
        kind: Resources
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
                publishConnectionDetailsTo:
                  name: postgres-connection
                  configRef:
                    name: vault
            connectionDetails:
              - name: endpoint
                type: FromConnectionSecretKey
                fromConnectionSecretKey: endpoint
              - name: port
                type: FromConnectionSecretKey
                fromConnectionSecretKey: port
              - name: username
                type: FromConnectionSecretKey
                fromConnectionSecretKey: username
              - name: password
                type: FromConnectionSecretKey
                fromConnectionSecretKey: password
```

When the database provisions, the provider publishes its connection details to the configured Vault-backed StoreConfig.

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
apiVersion: generators.external-secrets.io/v1alpha1
kind: VaultDynamicSecret
metadata:
  name: app-db-credentials
  namespace: production
spec:
  path: "database/creds/crossplane-app"
  method: "GET"
  provider:
    server: "http://vault.vault-system.svc.cluster.local:8200"
    auth:
      kubernetes:
        mountPath: "kubernetes"
        role: "crossplane"
        serviceAccountRef:
          name: crossplane
          namespace: crossplane-system
          audiences:
            - vault
---
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: app-db-credentials
  namespace: production
spec:
  refreshInterval: 30m
  target:
    name: app-db-credentials
    creationPolicy: Owner
  dataFrom:
    - sourceRef:
        generatorRef:
          apiVersion: generators.external-secrets.io/v1alpha1
          kind: VaultDynamicSecret
          name: app-db-credentials
```

ESO requests fresh dynamic credentials on each refresh. Vault leases and expires the generated credentials according to the role TTLs.

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
  runtimeConfigRef:
    name: provider-aws-vault
---
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Filesystem
    fs:
      path: /vault/secrets/credentials
---
apiVersion: pkg.crossplane.io/v1beta1
kind: DeploymentRuntimeConfig
metadata:
  name: provider-aws-vault
spec:
  deploymentTemplate:
    spec:
      selector: {}
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
          containers:
            - name: package-runtime
              env:
                - name: AWS_SHARED_CREDENTIALS_FILE
                  value: /vault/secrets/credentials
```

The Vault agent injects AWS credentials into the provider pod at runtime.

## Encrypting Crossplane Connection Secrets

Vault Transit does not automatically encrypt Crossplane Kubernetes connection secrets, and Crossplane does not include a built-in `function-vault-transit-encrypt` function. Use Kubernetes encryption at rest for Kubernetes Secrets, or publish connection details to Vault with Crossplane External Secret Stores when that alpha feature fits your Crossplane version.

```bash
# Enable Kubernetes API server encryption at rest for Secret resources
kube-apiserver \
  --encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

Connection secrets are then encrypted by the Kubernetes API server before they are written to etcd.

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
          - alert: VaultAuditRequestFailure
            expr: |
              rate(vault_audit_log_request_failure[5m]) > 0
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "Vault audit request logging failed"

          - alert: VaultAuditResponseFailure
            expr: |
              rate(vault_audit_log_response_failure[5m]) > 0
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "Vault audit response logging failed"
```

Use audit-log processing in your log platform to alert on denied reads or missing secrets for `secret/crossplane/*`; Vault's request audit records include the request path, response errors, and Kubernetes auth metadata.

## Rotating Vault Secrets

Rotate static KV secrets by writing a new value to the same Vault path. For automatic rotation, schedule this update from an external rotation job or use Vault dynamic secrets instead of static KV secrets.

```bash
# Rotate the static password stored in Vault KV
vault kv put secret/crossplane/database/master-password password="$(openssl rand -base64 32)"
```

ExternalSecrets automatically picks up updated values.

```yaml
# external-secret-with-rotation.yaml
apiVersion: external-secrets.io/v1
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

For Vault database root credential rotation, use the database secrets engine endpoint.

```bash
# Rotate the root credentials for a Vault database secrets engine connection
vault write -force database/rotate-root/postgres
```

## High Availability Configuration

Configure ESO and Vault for high availability.

```yaml
# vault-secretstore-ha.yaml
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: vault-backend-ha
spec:
  provider:
    vault:
      # Use the Vault HA service or load balancer address
      server: "https://vault.example.com"
      # Vault Enterprise namespace; omit this field for Vault Community Edition
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
            audiences:
              - vault
      # TLS configuration
      caBundle: |
        -----BEGIN CERTIFICATE-----
        ...
        -----END CERTIFICATE-----
```

## Summary

Integrating Crossplane with Vault centralizes secret management. External Secrets Operator syncs secrets from Vault to Kubernetes. Crossplane references these secrets when provisioning resources. Crossplane v1.x External Secret Stores can publish generated connection details back to Vault when that alpha feature is enabled.

Use Vault's dynamic secrets for leased credentials and automatic expiration. Encrypt Kubernetes connection secrets with Kubernetes API server encryption at rest, or publish connection details to Vault with External Secret Stores when it fits your Crossplane version. Audit all secret access through Vault's logging. This pattern provides enterprise-grade secret management for infrastructure provisioning.

Vault integration removes secrets from Git repositories and Kubernetes manifests. Credentials stay encrypted in Vault with fine-grained access control. Applications and infrastructure components retrieve secrets on demand with automatic rotation and comprehensive audit trails.
