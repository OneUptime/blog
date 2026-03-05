# How to Create Opaque Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Secret, Security, Configuration Management

Description: Learn how to create and manage Opaque Secrets on Talos Linux for storing sensitive configuration data like passwords, API keys, and tokens.

---

Secrets in Kubernetes are designed to hold sensitive information such as passwords, OAuth tokens, SSH keys, and API credentials. On Talos Linux, where security is a first-class concern and the operating system itself is hardened and immutable, understanding how to properly manage Secrets is essential. The Opaque type is the default and most commonly used Secret type in Kubernetes.

This guide covers how to create, manage, and consume Opaque Secrets on a Talos Linux cluster.

## What Are Opaque Secrets?

Opaque Secrets are the default type of Kubernetes Secret. When you create a Secret without specifying a type, it becomes an Opaque Secret. The data is stored as base64-encoded key-value pairs in etcd. While base64 encoding is not encryption, it prevents accidental exposure of sensitive values in logs and terminal output.

It is important to understand that by default, Secrets in etcd are not encrypted at rest. On Talos Linux, you can enable encryption at rest through the machine configuration, which is something you should do for production clusters.

## Prerequisites

Make sure you have:

- A running Talos Linux cluster
- `kubectl` configured and working
- Appropriate RBAC permissions to create Secrets

```bash
# Verify cluster connectivity
kubectl cluster-info

# Check your permissions
kubectl auth can-i create secrets
```

## Creating Secrets from the Command Line

The fastest way to create an Opaque Secret is using `kubectl create secret`:

```bash
# Create a secret with literal values
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password='S3cur3P@ssw0rd!' \
  --from-literal=host=postgres.default.svc.cluster.local

# Verify the secret was created
kubectl get secret db-credentials
```

```bash
# View the secret details (values are base64-encoded)
kubectl get secret db-credentials -o yaml
```

The output will show something like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
data:
  host: cG9zdGdyZXMuZGVmYXVsdC5zdmMuY2x1c3Rlci5sb2NhbA==
  password: UzNjdXIzUEBzc3cwcmQh
  username: YWRtaW4=
```

To decode a specific value:

```bash
# Decode the password
kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 -d
```

## Creating Secrets from Files

You often have credentials stored in files. You can create Secrets directly from them:

```bash
# Create files with credentials
echo -n 'admin' > ./username.txt
echo -n 'S3cur3P@ssw0rd!' > ./password.txt

# Create the secret from files
kubectl create secret generic db-credentials-from-files \
  --from-file=username=./username.txt \
  --from-file=password=./password.txt

# Clean up the local files
rm ./username.txt ./password.txt
```

Note the `-n` flag in the echo commands. This prevents a trailing newline character from being included in the secret data, which can cause authentication failures in some applications.

## Creating Secrets with YAML Manifests

For reproducible and version-controlled secret management, use YAML manifests. There are two approaches:

### Using base64-encoded data

```yaml
# secret-base64.yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-credentials
  namespace: default
  labels:
    app: myapp
    environment: production
type: Opaque
data:
  # Values must be base64-encoded
  # echo -n 'my-api-key-12345' | base64
  api-key: bXktYXBpLWtleS0xMjM0NQ==
  # echo -n 'my-api-secret-67890' | base64
  api-secret: bXktYXBpLXNlY3JldC02Nzg5MA==
```

### Using plain text with stringData

```yaml
# secret-plaintext.yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-credentials-v2
  namespace: default
type: Opaque
stringData:
  # Values in stringData are plain text - Kubernetes encodes them automatically
  api-key: "my-api-key-12345"
  api-secret: "my-api-secret-67890"
  connection-string: "Server=db.example.com;Database=mydb;User=admin;Password=secret;"
```

The `stringData` field is a write-only convenience field. When you apply this manifest, Kubernetes automatically base64-encodes the values and stores them in the `data` field. If you retrieve the Secret later, you will see the base64-encoded `data` field, not the plain text `stringData`.

```bash
# Apply either manifest
kubectl apply -f secret-plaintext.yaml
```

## Consuming Secrets as Environment Variables

The most common way to use Secrets is to inject them as environment variables:

```yaml
# pod-with-secrets.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    env:
    # Reference specific keys
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
    # Load all keys from a secret
    envFrom:
    - secretRef:
        name: api-credentials
```

## Consuming Secrets as Volume Mounts

You can also mount Secrets as files in your containers:

```yaml
# pod-with-secret-volume.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-with-files
spec:
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: db-credentials
      # Set file permissions
      defaultMode: 0400
```

Each key in the Secret becomes a file at the mount path. The file contents are the decoded (plain text) values.

## Enabling Encryption at Rest on Talos Linux

By default, Secrets are stored unencrypted in etcd. On Talos Linux, you can enable encryption at rest through the machine configuration:

```yaml
# Talos machine config snippet for encryption at rest
cluster:
  apiServer:
    extraArgs:
      encryption-provider-config: /etc/kubernetes/encryption-config.yaml
    extraVolumes:
    - hostPath: /var/etc/kubernetes/encryption-config.yaml
      mountPath: /etc/kubernetes/encryption-config.yaml
      readonly: true
```

You would configure this through `talosctl`:

```bash
# Apply machine configuration patch for encryption
talosctl patch machineconfig --nodes <control-plane-ip> --patch @encryption-patch.yaml
```

## RBAC for Secrets

Limit who can access Secrets using RBAC policies:

```yaml
# secret-reader-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["db-credentials"]  # Restrict to specific secrets
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-secrets
  namespace: default
subjects:
- kind: ServiceAccount
  name: myapp-sa
  namespace: default
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Updating and Rotating Secrets

To update an existing Secret:

```bash
# Replace the entire secret
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password='NewP@ssw0rd2024!' \
  --dry-run=client -o yaml | kubectl apply -f -

# Patch a specific key
kubectl patch secret db-credentials --type merge \
  -p '{"stringData":{"password":"NewP@ssw0rd2024!"}}'
```

After updating a Secret, remember:
- Environment variables from Secrets do not auto-update. You need to restart pods.
- Volume-mounted Secrets do auto-update (unless using subPath), typically within 60 seconds.

```bash
# Restart pods to pick up new secret values
kubectl rollout restart deployment myapp
```

## Best Practices for Secrets on Talos Linux

1. **Enable encryption at rest.** This is especially important on Talos Linux since the platform is built with security in mind.

2. **Use RBAC to limit access.** Not every service account needs to read every Secret. Follow the principle of least privilege.

3. **Avoid storing Secrets in Git.** Use tools like Sealed Secrets, SOPS, or external secret managers (HashiCorp Vault, AWS Secrets Manager) to handle Secret lifecycle.

4. **Use namespaces for isolation.** Secrets are namespace-scoped, so use namespaces to create security boundaries.

5. **Rotate secrets regularly.** Build rotation into your operational processes.

6. **Audit Secret access.** Enable audit logging on your Talos cluster to track who reads Secrets and when.

```bash
# List all secrets in a namespace
kubectl get secrets -n default

# Check which service accounts have access to secrets
kubectl auth can-i get secrets --as=system:serviceaccount:default:myapp-sa
```

## Wrapping Up

Opaque Secrets on Talos Linux work the same as on any Kubernetes distribution, but the security-focused nature of Talos means you should pay extra attention to encryption at rest and RBAC policies. Use `stringData` for convenience when creating Secrets from manifests, mount them as volumes when you need auto-updates, and always keep your sensitive data out of version control. Combined with Talos Linux's immutable and hardened OS, properly managed Secrets give you a solid security foundation for your workloads.
