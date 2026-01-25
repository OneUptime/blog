# How to Use Kubernetes Secrets for Sensitive Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Secrets, Security, DevOps, Configuration Management

Description: A comprehensive guide to managing sensitive data in Kubernetes using Secrets, including creation methods, mounting options, encryption at rest, and security best practices.

---

Kubernetes Secrets store sensitive information like passwords, API keys, and TLS certificates separately from your application code. While Secrets are base64-encoded by default (not encrypted), Kubernetes provides multiple ways to secure them properly.

## Creating Secrets

### From Literal Values

```bash
# Create secret with username and password
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=secretpass123

# Verify creation
kubectl get secret db-credentials

# View secret details (base64 encoded)
kubectl get secret db-credentials -o yaml
```

### From Files

```bash
# Create secret from files
echo -n 'admin' > ./username.txt
echo -n 'secretpass123' > ./password.txt

kubectl create secret generic db-credentials \
  --from-file=username=./username.txt \
  --from-file=password=./password.txt

# Clean up local files
rm ./username.txt ./password.txt
```

### From YAML Manifest

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
data:
  # Values must be base64 encoded
  username: YWRtaW4=           # echo -n 'admin' | base64
  password: c2VjcmV0cGFzczEyMw==  # echo -n 'secretpass123' | base64
```

Or use stringData for plain text (Kubernetes encodes it automatically):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:
  username: admin
  password: secretpass123
```

## Secret Types

| Type | Usage |
|------|-------|
| Opaque | Generic secrets (default) |
| kubernetes.io/tls | TLS certificates |
| kubernetes.io/dockerconfigjson | Docker registry credentials |
| kubernetes.io/basic-auth | Basic authentication |
| kubernetes.io/ssh-auth | SSH credentials |

### TLS Secret

```bash
# Create TLS secret from certificate files
kubectl create secret tls app-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

Or from YAML:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-tls
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

### Docker Registry Secret

```bash
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=pass \
  --docker-email=user@example.com
```

## Using Secrets in Pods

### As Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: myapp:v1
      env:
        # Single key from secret
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

### All Keys as Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: myapp:v1
      envFrom:
        - secretRef:
            name: db-credentials
            # Optional prefix
            # prefix: DB_
```

### As Volume Mount

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: myapp:v1
      volumeMounts:
        - name: secrets-volume
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secrets-volume
      secret:
        secretName: db-credentials
        # Optional: set file permissions
        defaultMode: 0400
```

This creates files at:
- /etc/secrets/username
- /etc/secrets/password

### Mount Specific Keys

```yaml
volumes:
  - name: secrets-volume
    secret:
      secretName: db-credentials
      items:
        - key: password
          path: db-password    # Mount as /etc/secrets/db-password
```

## Reading Secrets in Applications

### From Environment Variables

```python
# Python
import os

db_user = os.environ.get('DB_USERNAME')
db_pass = os.environ.get('DB_PASSWORD')
```

```javascript
// Node.js
const dbUser = process.env.DB_USERNAME;
const dbPass = process.env.DB_PASSWORD;
```

### From Mounted Files

```python
# Python
def read_secret(path):
    with open(path, 'r') as f:
        return f.read().strip()

db_user = read_secret('/etc/secrets/username')
db_pass = read_secret('/etc/secrets/password')
```

```bash
# Shell script
DB_USER=$(cat /etc/secrets/username)
DB_PASS=$(cat /etc/secrets/password)
```

## Updating Secrets

### Update Existing Secret

```bash
# Edit secret interactively
kubectl edit secret db-credentials

# Update from new values
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=newpassword \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Secret Updates and Pods

- Environment variables: Pod must restart to see changes
- Volume mounts: Updated automatically (may take a minute)

For immediate updates with volume mounts:

```yaml
volumes:
  - name: secrets-volume
    secret:
      secretName: db-credentials
      # Force specific mount options
      optional: false
```

## Encryption at Rest

By default, Secrets are stored unencrypted in etcd. Enable encryption:

### Create Encryption Config

```yaml
# /etc/kubernetes/encryption-config.yaml
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
      - identity: {}    # Fallback to unencrypted
```

Generate encryption key:

```bash
head -c 32 /dev/urandom | base64
```

### Configure API Server

Add to kube-apiserver:

```bash
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

### Verify Encryption

```bash
# Check etcd directly (from control plane)
ETCDCTL_API=3 etcdctl get /registry/secrets/default/db-credentials \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Encrypted data should be unreadable
```

## External Secret Managers

For production, consider external secret managers:

### HashiCorp Vault

```yaml
# Using External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials
  data:
    - secretKey: username
      remoteRef:
        key: secret/data/database
        property: username
    - secretKey: password
      remoteRef:
        key: secret/data/database
        property: password
```

### AWS Secrets Manager

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-credentials
  dataFrom:
    - extract:
        key: production/database
```

## RBAC for Secrets

Restrict secret access:

```yaml
# Role allowing read access to specific secret
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["db-credentials"]
    verbs: ["get"]
---
# Bind role to service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-db-credentials
  namespace: production
subjects:
  - kind: ServiceAccount
    name: app-service-account
    namespace: production
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Security Best Practices

### 1. Never Commit Secrets to Git

```bash
# Add to .gitignore
*.secret.yaml
*-secret.yaml
```

Use sealed-secrets or external secret managers instead.

### 2. Use Namespaces for Isolation

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production    # Isolated to this namespace
```

### 3. Set Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: secret-quota
  namespace: production
spec:
  hard:
    secrets: "10"    # Limit secrets per namespace
```

### 4. Enable Audit Logging

```yaml
# Audit policy for secrets
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
```

### 5. Rotate Secrets Regularly

```bash
# Create new secret
kubectl create secret generic db-credentials-v2 \
  --from-literal=username=admin \
  --from-literal=password=newpassword

# Update deployment to use new secret
kubectl set env deployment/app --from=secret/db-credentials-v2

# Delete old secret after verification
kubectl delete secret db-credentials
```

### 6. Use Immutable Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-config
immutable: true    # Cannot be modified after creation
data:
  api-key: <base64-encoded-key>
```

## Debugging Secrets

```bash
# List secrets
kubectl get secrets -n production

# Describe secret (shows keys, not values)
kubectl describe secret db-credentials

# Decode secret value
kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 -d

# Check if pod can access secret
kubectl exec -it app-pod -- env | grep DB_

# Check mounted secret files
kubectl exec -it app-pod -- ls -la /etc/secrets/
kubectl exec -it app-pod -- cat /etc/secrets/username
```

## Complete Example

```yaml
# Secret
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:
  database-url: postgresql://admin:secret@postgres:5432/mydb
  redis-password: redispass123
  api-key: sk-1234567890abcdef
---
# Deployment using the secret
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      serviceAccountName: web-app
      containers:
        - name: app
          image: myapp:v1
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: redis-password
          volumeMounts:
            - name: api-key
              mountPath: /etc/api
              readOnly: true
      volumes:
        - name: api-key
          secret:
            secretName: app-secrets
            items:
              - key: api-key
                path: key
            defaultMode: 0400
```

---

Kubernetes Secrets provide a foundation for managing sensitive data, but they require additional security measures for production use. Enable encryption at rest, implement strict RBAC policies, consider external secret managers for advanced use cases, and always follow the principle of least privilege when granting secret access.
