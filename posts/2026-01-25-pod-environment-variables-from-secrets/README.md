# How to Configure Pod Environment Variables from Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Secrets, Environment Variables, Security, Configuration, DevOps

Description: Learn how to securely configure pod environment variables using Kubernetes Secrets. This guide covers creating secrets, referencing them in pods, and best practices for managing sensitive configuration data.

---

Hardcoding passwords and API keys in container images or pod specs is a security risk. Kubernetes Secrets provide a secure way to store sensitive data and inject it into pods as environment variables. Here is how to do it properly.

## Creating Secrets

### From Literal Values

```bash
# Create secret with multiple key-value pairs
kubectl create secret generic myapp-secrets \
  --from-literal=DATABASE_PASSWORD=supersecret123 \
  --from-literal=API_KEY=abc123xyz \
  --from-literal=JWT_SECRET=myjwtsecret \
  -n production
```

### From Files

```bash
# Create secret from file contents
echo -n 'supersecret123' > ./password.txt
kubectl create secret generic db-credentials \
  --from-file=password=./password.txt \
  -n production

# Clean up file
rm ./password.txt
```

### From YAML Manifest

Values must be base64 encoded:

```bash
# Encode values
echo -n 'supersecret123' | base64
# Output: c3VwZXJzZWNyZXQxMjM=

echo -n 'admin' | base64
# Output: YWRtaW4=
```

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
  namespace: production
type: Opaque
data:
  DATABASE_PASSWORD: c3VwZXJzZWNyZXQxMjM=
  DATABASE_USER: YWRtaW4=
  API_KEY: YWJjMTIzeHl6
```

### Using stringData (No Encoding Required)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: supersecret123
  DATABASE_USER: admin
  API_KEY: abc123xyz
```

Kubernetes encodes `stringData` values automatically.

## Injecting Secrets as Environment Variables

### Single Secret Key

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  namespace: production
spec:
  containers:
    - name: myapp
      image: myapp:1.0.0
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: DATABASE_PASSWORD
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: myapp-secrets
              key: DATABASE_USER
```

### All Keys from a Secret

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myapp:1.0.0
      envFrom:
        - secretRef:
            name: myapp-secrets
```

All keys in the secret become environment variables with the same names.

### With Prefix

```yaml
envFrom:
  - secretRef:
      name: myapp-secrets
    prefix: APP_  # Variables become APP_DATABASE_PASSWORD, etc.
```

## Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
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
          image: api-server:1.0.0
          ports:
            - containerPort: 8080
          env:
            # From Secret
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection-string
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: auth-secrets
                  key: jwt-secret
            # Non-sensitive config from ConfigMap
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: log-level
            # Regular env var
            - name: PORT
              value: "8080"
```

## Optional Secrets

By default, if a secret does not exist, the pod fails to start. Make it optional:

```yaml
env:
  - name: OPTIONAL_API_KEY
    valueFrom:
      secretKeyRef:
        name: optional-secrets
        key: api-key
        optional: true  # Pod starts even if secret is missing
```

## Combining Secrets and ConfigMaps

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myapp:1.0.0
      envFrom:
        # Sensitive data from secret
        - secretRef:
            name: myapp-secrets
        # Non-sensitive config from configmap
        - configMapRef:
            name: myapp-config
      env:
        # Override specific values if needed
        - name: ENVIRONMENT
          value: production
```

## Secrets as Files (Alternative Approach)

Sometimes you need secrets as files instead of env vars:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myapp:1.0.0
      volumeMounts:
        - name: secrets
          mountPath: /etc/secrets
          readOnly: true
  volumes:
    - name: secrets
      secret:
        secretName: myapp-secrets
        items:
          - key: DATABASE_PASSWORD
            path: db-password  # Creates /etc/secrets/db-password
```

Read in application:

```python
# Python example
with open('/etc/secrets/db-password') as f:
    db_password = f.read()
```

## Managing Secrets

### View Secret

```bash
# List secrets
kubectl get secrets -n production

# View secret details (values are encoded)
kubectl get secret myapp-secrets -n production -o yaml

# Decode a specific value
kubectl get secret myapp-secrets -n production -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 -d
```

### Update Secret

```bash
# Edit directly
kubectl edit secret myapp-secrets -n production

# Replace from file
kubectl create secret generic myapp-secrets \
  --from-literal=DATABASE_PASSWORD=newsecret \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Delete Secret

```bash
kubectl delete secret myapp-secrets -n production
```

## Automatic Secret Rotation

Pods do not automatically see secret updates for env vars. You need to restart pods:

```bash
# Restart deployment to pick up new secret values
kubectl rollout restart deployment/api-server -n production
```

For file-mounted secrets, updates propagate automatically (with a delay).

### Using Reloader

Install Reloader to auto-restart pods on secret changes:

```bash
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml
```

Annotate your deployment:

```yaml
metadata:
  annotations:
    reloader.stakater.com/auto: "true"
```

## External Secret Management

### Using External Secrets Operator

Sync secrets from external providers (AWS Secrets Manager, HashiCorp Vault, etc.):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-secrets
  data:
    - secretKey: DATABASE_PASSWORD
      remoteRef:
        key: production/database
        property: password
```

### Using Sealed Secrets

Encrypt secrets for GitOps:

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal a secret
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# Apply sealed secret (controller decrypts it)
kubectl apply -f sealed-secret.yaml
```

## Security Best Practices

### RBAC for Secrets

Limit who can read secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["myapp-secrets"]  # Only specific secrets
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-secret-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: myapp
    namespace: production
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### Enable Encryption at Rest

Configure API server for secret encryption:

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

### Avoid Secrets in Logs

```yaml
# Bad: Logs might expose secrets
env:
  - name: DATABASE_URL
    value: "postgres://user:password@host/db"  # Password visible

# Good: Use secret reference
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-secrets
        key: password
```

### Do Not Store Secrets in Git

Use sealed-secrets, external-secrets, or separate secret management.

## Troubleshooting

### Pod Failing to Start

```bash
# Check events
kubectl describe pod myapp -n production

# Look for:
# Error: secret "myapp-secrets" not found
# Error: couldn't find key DATABASE_PASSWORD in Secret production/myapp-secrets
```

### Verify Secret Contents

```bash
# Check secret exists
kubectl get secret myapp-secrets -n production

# Check keys
kubectl get secret myapp-secrets -n production -o jsonpath='{.data}' | jq 'keys'

# Decode and verify values
kubectl get secret myapp-secrets -n production -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 -d
```

### Check Environment in Running Pod

```bash
# View env vars (be careful in production)
kubectl exec myapp-pod -n production -- env | grep -i database
```

---

Secrets keep sensitive data out of your container images and pod specs. Use them for passwords, API keys, and certificates. Combine with external secret management for production environments, and always restrict access with RBAC. Your security team will appreciate it.
