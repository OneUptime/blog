# How to Manage ConfigMaps and Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, ConfigMap, Secrets, Configuration Management, Security

Description: A complete guide to creating, managing, and using ConfigMaps and Secrets for applications running on Talos Linux clusters.

---

ConfigMaps and Secrets are the standard Kubernetes mechanisms for injecting configuration and sensitive data into your workloads. On a Talos Linux cluster, they play an even more important role because the immutable nature of the OS means you cannot drop configuration files onto nodes or set environment variables at the host level. Everything flows through the Kubernetes API.

This guide covers everything from basic creation to advanced patterns for managing ConfigMaps and Secrets on Talos Linux.

## Understanding ConfigMaps

A ConfigMap holds non-sensitive configuration data as key-value pairs. Applications can consume this data as environment variables, command-line arguments, or mounted files.

### Creating ConfigMaps

There are several ways to create ConfigMaps:

```bash
# Create from literal key-value pairs
kubectl create configmap app-config \
  --namespace my-app \
  --from-literal=DATABASE_HOST=postgres.db.svc.cluster.local \
  --from-literal=DATABASE_PORT=5432 \
  --from-literal=LOG_LEVEL=info

# Create from a file
kubectl create configmap nginx-config \
  --namespace my-app \
  --from-file=nginx.conf=./config/nginx.conf

# Create from an entire directory of files
kubectl create configmap config-files \
  --namespace my-app \
  --from-file=./config/
```

Or define them declaratively in YAML:

```yaml
# app-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: my-app
data:
  DATABASE_HOST: "postgres.db.svc.cluster.local"
  DATABASE_PORT: "5432"
  LOG_LEVEL: "info"
  CACHE_TTL: "300"
  MAX_CONNECTIONS: "100"
```

```yaml
# file-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-files
  namespace: my-app
data:
  config.json: |
    {
      "server": {
        "port": 3000,
        "host": "0.0.0.0"
      },
      "database": {
        "pool_size": 10,
        "timeout": 30
      },
      "logging": {
        "level": "info",
        "format": "json"
      }
    }
  startup.sh: |
    #!/bin/sh
    echo "Starting application..."
    exec /app/server
```

### Using ConfigMaps as Environment Variables

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:1.0.0
          # Load all keys from the ConfigMap as environment variables
          envFrom:
            - configMapRef:
                name: app-config
          # Or load specific keys
          env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: DATABASE_HOST
```

### Mounting ConfigMaps as Files

```yaml
# Mount config files into the container
spec:
  containers:
    - name: my-app
      image: myorg/my-app:1.0.0
      volumeMounts:
        - name: config-volume
          mountPath: /etc/app/config.json
          subPath: config.json
          readOnly: true
        - name: config-volume
          mountPath: /etc/app/startup.sh
          subPath: startup.sh
          readOnly: true
  volumes:
    - name: config-volume
      configMap:
        name: app-files
        defaultMode: 0644
```

## Understanding Secrets

Secrets are similar to ConfigMaps but designed for sensitive data like passwords, tokens, and certificates. Kubernetes stores Secrets base64-encoded (not encrypted by default), so you need additional measures for real security.

### Creating Secrets

```bash
# Create from literal values
kubectl create secret generic db-credentials \
  --namespace my-app \
  --from-literal=username=appuser \
  --from-literal=password=super-secret-password

# Create from files
kubectl create secret generic tls-cert \
  --namespace my-app \
  --from-file=tls.crt=./certs/server.crt \
  --from-file=tls.key=./certs/server.key

# Create a TLS secret specifically
kubectl create secret tls my-tls-secret \
  --namespace my-app \
  --cert=./certs/server.crt \
  --key=./certs/server.key

# Create a Docker registry secret
kubectl create secret docker-registry regcred \
  --namespace my-app \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword
```

Declarative YAML (note that values must be base64-encoded):

```yaml
# db-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: my-app
type: Opaque
data:
  # echo -n 'appuser' | base64
  username: YXBwdXNlcg==
  # echo -n 'super-secret-password' | base64
  password: c3VwZXItc2VjcmV0LXBhc3N3b3Jk
```

Or use `stringData` to avoid manual base64 encoding:

```yaml
# db-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: my-app
type: Opaque
stringData:
  username: appuser
  password: super-secret-password
```

### Using Secrets in Pods

```yaml
spec:
  containers:
    - name: my-app
      image: myorg/my-app:1.0.0
      env:
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
      volumeMounts:
        - name: tls-certs
          mountPath: /etc/tls
          readOnly: true
  volumes:
    - name: tls-certs
      secret:
        secretName: tls-cert
        defaultMode: 0400
```

## Encrypting Secrets at Rest on Talos Linux

By default, Secrets are only base64-encoded in etcd. On Talos Linux, you can enable encryption at rest through the machine configuration:

```yaml
# Talos machine config snippet for secret encryption
cluster:
  secretboxEncryptionSecret: your-encryption-key-here
```

Generate and apply this using talosctl:

```bash
# Generate an encryption key
talosctl gen secrets

# Apply the machine config with encryption enabled
talosctl apply-config --nodes <control-plane-ip> -f controlplane.yaml
```

## Using Sealed Secrets

Sealed Secrets let you safely store encrypted secrets in Git. The SealedSecret controller running on your Talos cluster decrypts them.

```bash
# Install the Sealed Secrets controller
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system

# Install the kubeseal CLI
brew install kubeseal  # macOS

# Seal a secret
kubectl create secret generic db-credentials \
  --namespace my-app \
  --from-literal=password=super-secret \
  --dry-run=client -o yaml | kubeseal --format yaml > sealed-secret.yaml
```

```yaml
# The sealed secret can be safely committed to Git
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: my-app
spec:
  encryptedData:
    password: AgBy3i4OJSWK+PiTySYZZA9rO... # encrypted
```

## Using External Secrets Operator

For pulling secrets from external vaults:

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

```yaml
# Create a SecretStore pointing to your vault
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "my-app"

---
# Create an ExternalSecret that syncs from the vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: myapp/database
        property: username
    - secretKey: password
      remoteRef:
        key: myapp/database
        property: password
```

## ConfigMap and Secret Updates

When you update a ConfigMap or Secret, pods using environment variables will not pick up the change until they restart. However, mounted volumes update automatically (with a short delay).

```bash
# Update a ConfigMap
kubectl edit configmap app-config -n my-app

# Force pods to restart and pick up new env vars
kubectl rollout restart deployment/my-app -n my-app

# Watch the rollout
kubectl rollout status deployment/my-app -n my-app
```

## Viewing and Debugging

```bash
# View ConfigMap data
kubectl get configmap app-config -n my-app -o yaml

# View Secret data (base64 encoded)
kubectl get secret db-credentials -n my-app -o yaml

# Decode a specific secret value
kubectl get secret db-credentials -n my-app -o jsonpath='{.data.password}' | base64 -d

# Check what a pod sees
kubectl exec -it my-app-pod -n my-app -- env | grep DB_
```

## Summary

ConfigMaps and Secrets are the primary way to pass configuration and credentials to workloads on Talos Linux. Since the operating system is immutable and does not support traditional configuration file management, everything must go through Kubernetes resources. For sensitive data, go beyond the default base64 encoding by enabling etcd encryption in Talos, using Sealed Secrets for GitOps workflows, or integrating with an external secrets manager. These patterns keep your Talos Linux deployments both flexible and secure.
