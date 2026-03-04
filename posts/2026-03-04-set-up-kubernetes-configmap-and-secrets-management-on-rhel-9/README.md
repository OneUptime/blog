# How to Set Up Kubernetes ConfigMap and Secrets Management on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Kubernetes, ConfigMap, Secrets, Configuration, Linux

Description: Learn how to create, manage, and use Kubernetes ConfigMaps and Secrets on RHEL for application configuration, including volume mounts, environment variables, encryption at rest, and external...

---

Kubernetes ConfigMaps and Secrets are the standard way to decouple configuration from container images. ConfigMaps hold non-sensitive configuration data while Secrets store sensitive information like passwords, tokens, and certificates. This guide covers creating, managing, and securely using both on RHEL Kubernetes clusters.

## ConfigMaps vs Secrets

Both ConfigMaps and Secrets store key-value pairs, but they differ in how they handle the data:

- **ConfigMaps** store data as plain text, intended for non-sensitive configuration
- **Secrets** base64-encode the data and can be encrypted at rest in etcd

Neither is encrypted by default in etcd. If you need real encryption for Secrets, you must enable encryption at rest, which we cover later.

## Prerequisites

- A Kubernetes cluster running on RHEL
- kubectl configured and working
- Cluster admin access for encryption configuration

## Creating ConfigMaps

### From Literal Values

```bash
# Create a ConfigMap from literal key-value pairs
kubectl create configmap app-config \
  --from-literal=database_host=db.example.com \
  --from-literal=database_port=5432 \
  --from-literal=log_level=info \
  --from-literal=cache_ttl=300
```

### From a File

```bash
# Create a configuration file
cat > app.properties << 'EOF'
database.host=db.example.com
database.port=5432
database.pool.size=20
cache.host=redis.example.com
cache.port=6379
log.level=info
EOF
```

```bash
# Create a ConfigMap from the file
kubectl create configmap app-config --from-file=app.properties
```

### From a YAML Manifest

```yaml
# app-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  database_host: "db.example.com"
  database_port: "5432"
  log_level: "info"
  nginx.conf: |
    server {
        listen 80;
        server_name app.example.com;
        location / {
            proxy_pass http://localhost:8080;
        }
    }
```

```bash
# Apply the ConfigMap
kubectl apply -f app-configmap.yaml
```

## Using ConfigMaps in Pods

### As Environment Variables

```yaml
# pod-env.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: DB_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_host
    - name: DB_PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_port
```

### As a Volume Mount

```yaml
# pod-volume.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config-volume
      mountPath: /etc/app/config
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: app-config
```

Each key in the ConfigMap becomes a file in the mounted directory, with the value as the file content.

### Inject All Keys as Environment Variables

```yaml
spec:
  containers:
  - name: app
    image: myapp:latest
    envFrom:
    - configMapRef:
        name: app-config
```

## Creating Secrets

### From Literal Values

```bash
# Create a Secret from literal values
kubectl create secret generic db-credentials \
  --from-literal=username=appuser \
  --from-literal=password='s3cur3P@ssw0rd'
```

### From Files

```bash
# Create a Secret from certificate files
kubectl create secret tls app-tls \
  --cert=server.crt \
  --key=server.key
```

### From a YAML Manifest

Note that values must be base64-encoded:

```bash
# Encode the values
echo -n 'appuser' | base64
echo -n 's3cur3P@ssw0rd' | base64
```

```yaml
# db-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: YXBwdXNlcg==
  password: czNjdXIzUEBzc3cwcmQ=
```

Or use `stringData` to avoid manual base64 encoding:

```yaml
# db-secret-string.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: appuser
  password: "s3cur3P@ssw0rd"
```

## Using Secrets in Pods

### As Environment Variables

```yaml
spec:
  containers:
  - name: app
    image: myapp:latest
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
```

### As a Volume Mount

```yaml
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/app/secrets
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: db-credentials
      defaultMode: 0400
```

## Enabling Encryption at Rest

By default, Secrets are stored as base64 in etcd, which is not encryption. Enable real encryption:

```yaml
# encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
    - secrets
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: <base64-encoded-32-byte-key>
    - identity: {}
```

Generate a key:

```bash
# Generate a 32-byte encryption key
head -c 32 /dev/urandom | base64
```

Configure the API server to use the encryption config by adding the flag:

```bash
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

After enabling, encrypt existing secrets:

```bash
# Re-encrypt all existing secrets
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

## Immutable ConfigMaps and Secrets

Mark a ConfigMap or Secret as immutable to prevent accidental changes and improve cluster performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v2
data:
  database_host: "db.example.com"
immutable: true
```

Immutable resources cannot be updated. You must create a new one with a different name and update the pods that reference it.

## Updating ConfigMaps

```bash
# Edit a ConfigMap directly
kubectl edit configmap app-config
```

```bash
# Replace from a file
kubectl create configmap app-config --from-file=app.properties --dry-run=client -o yaml | kubectl apply -f -
```

When a ConfigMap mounted as a volume changes, kubelet eventually updates the mounted files. The delay is typically up to the kubelet sync period (default 60 seconds).

## Conclusion

Kubernetes ConfigMaps and Secrets on RHEL provide a clean separation between your application code and its configuration. ConfigMaps handle non-sensitive settings while Secrets protect credentials, and both can be consumed as environment variables or volume mounts. For production use, always enable encryption at rest for Secrets and consider external secret stores for additional security.
