# How to use Vault Secrets Operator for declarative secret management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Vault Secrets Operator, Kubernetes, GitOps, Declarative Management

Description: Learn how to use the Vault Secrets Operator for GitOps-friendly declarative secret management, enabling automated secret synchronization and rotation in Kubernetes.

---

Managing secrets imperatively through scripts or manual commands doesn't fit well with GitOps workflows. The Vault Secrets Operator (VSO) provides Kubernetes-native custom resources for declaratively managing Vault authentication, secret synchronization, and dynamic credential generation. This guide shows you how to implement GitOps-friendly secret management with VSO.

## Understanding Vault Secrets Operator

VSO is the official HashiCorp operator that manages Vault resources using Kubernetes custom resources. Unlike External Secrets Operator which is third-party, VSO is built and maintained by HashiCorp specifically for Vault integration. It supports all Vault authentication methods, secret engines, and advanced features like secret caching and transformation.

The operator watches VaultAuth, VaultStaticSecret, and VaultDynamicSecret resources, automatically creating Kubernetes Secrets with data from Vault.

## Installing Vault Secrets Operator

Deploy VSO using Helm:

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault Secrets Operator
helm install vault-secrets-operator hashicorp/vault-secrets-operator \
  --namespace vault-secrets-operator-system \
  --create-namespace \
  --version 0.4.0

# Verify installation
kubectl -n vault-secrets-operator-system get pods
kubectl get crds | grep secrets.hashicorp.com
```

## Configuring Vault Connection

Create VaultConnection resource:

```yaml
# vault-connection.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultConnection
metadata:
  name: vault-connection
  namespace: vault-secrets-operator-system
spec:
  # Vault server address
  address: http://vault.vault.svc.cluster.local:8200

  # Skip TLS verification (use proper TLS in production)
  skipTLSVerify: false

  # Optional: CA certificate
  caCertSecretRef: vault-ca-cert

  # Optional: Headers for custom routing
  headers:
    X-Vault-Namespace: "root"
```

## Setting Up Authentication

Configure Kubernetes authentication:

```yaml
# vault-auth.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultAuth
metadata:
  name: vault-auth
  namespace: default
spec:
  # Reference to VaultConnection
  vaultConnectionRef: vault-connection

  # Authentication method
  method: kubernetes

  # Mount path for auth method
  mount: kubernetes

  # Kubernetes auth configuration
  kubernetes:
    role: app
    serviceAccount: app-sa

  # Namespace where VaultConnection exists
  namespace: vault-secrets-operator-system
```

```bash
kubectl apply -f vault-connection.yaml
kubectl apply -f vault-auth.yaml

# Verify authentication
kubectl get vaultauth vault-auth -o yaml
```

## Syncing Static Secrets

Create VaultStaticSecret for KV secrets:

```yaml
# vault-static-secret.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: app-config
  namespace: default
spec:
  # Authentication reference
  vaultAuthRef: vault-auth

  # Vault path (KV v2)
  mount: secret
  type: kv-v2
  path: app/config

  # Kubernetes Secret to create
  destination:
    name: app-config-secret
    create: true

  # Refresh interval
  refreshAfter: 1h

  # Rollout restart annotations
  rolloutRestartTargets:
  - kind: Deployment
    name: myapp
```

```bash
kubectl apply -f vault-static-secret.yaml

# Verify secret was created
kubectl get secret app-config-secret
kubectl describe vaultstaticsecret app-config

# Check synchronized data
kubectl get secret app-config-secret -o yaml
```

## Generating Dynamic Database Credentials

Create VaultDynamicSecret for database credentials:

```yaml
# vault-dynamic-secret.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultDynamicSecret
metadata:
  name: db-credentials
  namespace: default
spec:
  # Authentication reference
  vaultAuthRef: vault-auth

  # Vault path for dynamic credentials
  mount: database
  path: creds/app-role

  # Kubernetes Secret to create
  destination:
    name: db-credentials
    create: true

  # Renewal configuration
  renewalPercent: 67
  revoke: true

  # Rollout restart on credential rotation
  rolloutRestartTargets:
  - kind: Deployment
    name: myapp
```

```bash
kubectl apply -f vault-dynamic-secret.yaml

# Monitor dynamic secret
kubectl get vaultdynamicsecret db-credentials -w

# Check generated credentials
kubectl get secret db-credentials -o jsonpath='{.data}' | jq
```

## Transforming Secret Data

Use templates to transform secrets:

```yaml
# vault-secret-transform.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: app-config-transformed
  namespace: default
spec:
  vaultAuthRef: vault-auth

  mount: secret
  type: kv-v2
  path: app/config

  destination:
    name: app-config-transformed
    create: true
    transformation:
      templates:
        # Create connection string from parts
        connection_string:
          text: |
            postgresql://{{ get .Secrets "username" }}:{{ get .Secrets "password" }}@{{ get .Secrets "host" }}:5432/{{ get .Secrets "database" }}

        # Create JSON configuration
        config.json:
          text: |
            {
              "database": {
                "host": "{{ get .Secrets "host" }}",
                "port": 5432,
                "name": "{{ get .Secrets "database" }}"
              },
              "api": {
                "key": "{{ get .Secrets "api_key" }}"
              }
            }
```

## Managing PKI Certificates

Generate TLS certificates dynamically:

```yaml
# vault-pki-secret.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultPKISecret
metadata:
  name: app-tls
  namespace: default
spec:
  vaultAuthRef: vault-auth

  # PKI mount and role
  mount: pki_int
  role: app-server

  # Certificate parameters
  commonName: api.myapp.com
  altNames:
  - api.myapp.com
  - www.api.myapp.com
  ttl: 720h

  # Destination secret
  destination:
    name: app-tls-cert
    create: true
    type: kubernetes.io/tls

  # Auto-renew at 67% of TTL
  renewBefore: 240h

  # Restart deployment when cert rotates
  rolloutRestartTargets:
  - kind: Deployment
    name: myapp
```

## Using with Deployments

Reference VSO-managed secrets in deployments:

```yaml
# deployment-with-vso.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
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
      containers:
      - name: app
        image: myapp:latest
        env:
        # Static secrets
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-config-secret
              key: api_key

        # Dynamic database credentials
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password

        # TLS certificates
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
          readOnly: true

      volumes:
      - name: tls
        secret:
          secretName: app-tls-cert
```

When VSO updates secrets, it automatically restarts the deployment due to rolloutRestartTargets.

## Implementing Secret Caching

Enable caching for improved performance:

```yaml
# vault-auth-with-cache.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultAuth
metadata:
  name: vault-auth-cached
  namespace: default
spec:
  vaultConnectionRef: vault-connection
  method: kubernetes
  mount: kubernetes

  kubernetes:
    role: app
    serviceAccount: app-sa

  # Enable caching
  storageEncryption:
    mount: transit
    keyName: vso-cache-key

  namespace: vault-secrets-operator-system
```

## Managing Multiple Vault Instances

Connect to different Vault clusters:

```yaml
# Production Vault
---
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultConnection
metadata:
  name: vault-prod
  namespace: vault-secrets-operator-system
spec:
  address: https://vault.prod.company.com:8200
  skipTLSVerify: false
  caCertSecretRef: vault-prod-ca

# Development Vault
---
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultConnection
metadata:
  name: vault-dev
  namespace: vault-secrets-operator-system
spec:
  address: https://vault.dev.company.com:8200
  skipTLSVerify: true

# Auth for production
---
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultAuth
metadata:
  name: vault-auth-prod
  namespace: production
spec:
  vaultConnectionRef: vault-prod
  method: kubernetes
  mount: kubernetes
  kubernetes:
    role: prod-app
    serviceAccount: app-sa

# Secret from production Vault
---
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: prod-config
  namespace: production
spec:
  vaultAuthRef: vault-auth-prod
  mount: secret
  path: prod/app/config
  destination:
    name: prod-config-secret
```

## Monitoring VSO Operations

Track operator health and secret sync status:

```bash
# View operator logs
kubectl -n vault-secrets-operator-system logs -l app.kubernetes.io/name=vault-secrets-operator

# Check VaultAuth status
kubectl get vaultauth -A -o wide

# Check VaultStaticSecret status
kubectl get vaultstaticsecret -A -o wide

# Check VaultDynamicSecret status
kubectl get vaultdynamicsecret -A -o wide

# Detailed status of a secret
kubectl describe vaultstaticsecret app-config

# Events related to secret sync
kubectl get events --field-selector involvedObject.kind=VaultStaticSecret
```

## Implementing GitOps Workflow

Store VSO resources in Git:

```bash
# Directory structure
vault-secrets/
├── base/
│   ├── vault-connection.yaml
│   └── vault-auth.yaml
├── overlays/
│   ├── production/
│   │   ├── kustomization.yaml
│   │   ├── app-secrets.yaml
│   │   └── db-credentials.yaml
│   └── staging/
│       ├── kustomization.yaml
│       ├── app-secrets.yaml
│       └── db-credentials.yaml
```

Kustomization for production:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- ../../base/vault-connection.yaml
- ../../base/vault-auth.yaml
- app-secrets.yaml
- db-credentials.yaml

commonLabels:
  environment: production
  managed-by: gitops
```

## Handling Secret Rotation

Automate secret rotation with VSO:

```yaml
# rotated-secret.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultDynamicSecret
metadata:
  name: rotated-api-key
  namespace: default
spec:
  vaultAuthRef: vault-auth

  mount: database
  path: creds/api-user

  destination:
    name: api-credentials
    create: true

  # Renew at 67% of lease duration
  renewalPercent: 67

  # Revoke credentials when secret is deleted
  revoke: true

  # Force refresh every 6 hours
  refreshAfter: 6h

  # Automatically restart using rotated credentials
  rolloutRestartTargets:
  - kind: Deployment
    name: api-service
    selector:
      matchLabels:
        app: api-service
```

## Best Practices

Use VaultConnection in operator namespace for centralized management. Create separate VaultAuth resources per namespace for isolation. Set appropriate refreshAfter intervals based on secret sensitivity. Always use rolloutRestartTargets for automatic application updates. Enable secret caching for high-throughput applications. Store VSO resources in Git for GitOps workflows. Use transformations to format secrets for application requirements. Monitor VSO metrics and logs for sync issues. Implement proper RBAC for VaultAuth custom resources. Test secret rotation in non-production environments first.

Vault Secrets Operator provides Kubernetes-native, declarative secret management that fits naturally into GitOps workflows. By defining secrets as custom resources, you can version control secret configurations, automate synchronization, and implement proper secret lifecycle management. This approach provides the best integration between Vault and Kubernetes for production secret management.
