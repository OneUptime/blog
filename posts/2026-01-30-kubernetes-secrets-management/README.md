# How to Build Kubernetes Secrets Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Security, DevOps, Secrets

Description: Implement secure secrets management in Kubernetes with encryption at rest, external secret stores, rotation strategies, and RBAC controls.

---

Managing secrets in Kubernetes requires more than just creating Secret objects. Production workloads demand encryption at rest, external secret stores, proper access controls, and rotation mechanisms. This guide walks through building a complete secrets management strategy from basic usage to advanced patterns.

## Understanding Kubernetes Secrets

Kubernetes Secrets store sensitive data like passwords, tokens, and certificates. By default, secrets are base64-encoded (not encrypted) and stored in etcd. This means anyone with etcd access can read your secrets.

The base64 encoding is for data transport, not security. Here is what a typical secret looks like when decoded:

```bash
# Decode a secret value
kubectl get secret my-secret -o jsonpath='{.data.password}' | base64 -d
```

## Creating Secrets

### Method 1: Using kubectl

The simplest way to create secrets is through kubectl. This approach works well for quick operations and scripting.

Create a secret from literal values:

```bash
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password='S3cur3P@ssw0rd!'
```

Create a secret from files (useful for certificates and keys):

```bash
kubectl create secret generic tls-certs \
  --from-file=cert.pem=/path/to/cert.pem \
  --from-file=key.pem=/path/to/key.pem
```

Create a TLS secret specifically for ingress:

```bash
kubectl create secret tls my-tls-secret \
  --cert=/path/to/tls.crt \
  --key=/path/to/tls.key
```

### Method 2: Using YAML Manifests

YAML manifests provide version control and GitOps compatibility. Remember that values must be base64-encoded.

Basic secret manifest with base64-encoded values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
  labels:
    app: myapp
    environment: production
type: Opaque
data:
  # echo -n 'admin' | base64
  username: YWRtaW4=
  # echo -n 'S3cur3P@ssw0rd!' | base64
  password: UzNjdXIzUEBzc3cwcmQh
```

Use stringData for plain text values (Kubernetes handles encoding):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-credentials
  namespace: production
type: Opaque
stringData:
  api-key: "your-api-key-here"
  api-secret: "your-api-secret-here"
```

### Secret Types

Kubernetes supports several secret types for different use cases:

| Type | Description | Required Keys |
|------|-------------|---------------|
| Opaque | Generic secret (default) | None |
| kubernetes.io/tls | TLS certificate and key | tls.crt, tls.key |
| kubernetes.io/dockerconfigjson | Docker registry auth | .dockerconfigjson |
| kubernetes.io/basic-auth | Basic authentication | username, password |
| kubernetes.io/ssh-auth | SSH authentication | ssh-privatekey |
| kubernetes.io/service-account-token | Service account token | Auto-generated |

Docker registry secret for pulling private images:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: docker-registry-creds
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6eyJodHRwczovL2luZGV4LmRvY2tlci5pby92MS8iOnsidXNlcm5hbWUiOiJ1c2VyIiwicGFzc3dvcmQiOiJwYXNzIiwiYXV0aCI6ImRYTmxjanB3WVhOeiJ9fX0=
```

## Mounting Secrets in Pods

### Environment Variables

Expose secrets as environment variables. This approach works well for applications expecting configuration through environment variables.

Mount specific keys from a secret:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    env:
    # Mount a single key as an environment variable
    - name: DATABASE_USERNAME
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: username
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password
          optional: false  # Pod fails if secret/key missing
```

Mount all keys from a secret as environment variables:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    envFrom:
    # All keys become environment variables
    - secretRef:
        name: db-credentials
      prefix: DB_  # Optional: adds prefix to all keys
```

### Volume Mounts

Volume mounts create files containing secret values. This works better for certificates, configuration files, and applications that read from files.

Mount secrets as files in a volume:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
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

Mount specific keys with custom file names:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: tls-volume
      mountPath: /etc/tls
      readOnly: true
  volumes:
  - name: tls-volume
    secret:
      secretName: tls-certs
      items:
      # Map secret keys to specific file names
      - key: tls.crt
        path: server.crt
        mode: 0444
      - key: tls.key
        path: server.key
        mode: 0400
```

### Projected Volumes

Combine multiple secrets into a single volume mount:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: combined-secrets
      mountPath: /etc/config
      readOnly: true
  volumes:
  - name: combined-secrets
    projected:
      sources:
      - secret:
          name: db-credentials
          items:
          - key: password
            path: db-password
      - secret:
          name: api-credentials
          items:
          - key: api-key
            path: api-key
```

## Encryption at Rest

By default, Kubernetes stores secrets unencrypted in etcd. Encryption at rest protects secrets if an attacker gains access to etcd storage.

### Configuring Encryption

Create an encryption configuration file on the control plane node:

```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # AES-CBC encryption (recommended for most cases)
      - aescbc:
          keys:
            - name: key1
              # Generate with: head -c 32 /dev/urandom | base64
              secret: dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleQ==
      # Fallback to identity for reading old unencrypted secrets
      - identity: {}
```

For stronger encryption, use AES-GCM or secretbox:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
      - configmaps  # Optionally encrypt configmaps too
    providers:
      # AES-GCM provides authenticated encryption
      - aesgcm:
          keys:
            - name: key1
              secret: dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleQ==
      # secretbox uses XSalsa20 and Poly1305
      - secretbox:
          keys:
            - name: key1
              secret: dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleQ==
      - identity: {}
```

### Enabling Encryption on the API Server

Modify the kube-apiserver manifest to use the encryption configuration:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    # Add this flag
    - --encryption-provider-config=/etc/kubernetes/encryption-config.yaml
    # Other existing flags...
    volumeMounts:
    # Mount the encryption config
    - mountPath: /etc/kubernetes/encryption-config.yaml
      name: encryption-config
      readOnly: true
  volumes:
  - hostPath:
      path: /etc/kubernetes/encryption-config.yaml
      type: File
    name: encryption-config
```

### Encrypting Existing Secrets

After enabling encryption, re-encrypt all existing secrets:

```bash
# Re-encrypt all secrets in all namespaces
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -
```

Verify encryption is working:

```bash
# Check etcd directly (requires etcd access)
ETCDCTL_API=3 etcdctl get /registry/secrets/default/my-secret \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Encrypted secrets start with k8s:enc:aescbc:v1: or similar
```

### Key Rotation

Rotate encryption keys periodically. Add the new key first, then remove the old one:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            # New key first (used for encryption)
            - name: key2
              secret: bmV3LXNlY3JldC1rZXktZm9yLXJvdGF0aW9u
            # Old key second (still used for decryption)
            - name: key1
              secret: dGhpcy1pcy1hLTMyLWJ5dGUtc2VjcmV0LWtleQ==
      - identity: {}
```

After rotation, re-encrypt all secrets and remove the old key.

## External Secrets Operator

The External Secrets Operator synchronizes secrets from external stores like AWS Secrets Manager, HashiCorp Vault, and Azure Key Vault into Kubernetes.

### Installation

Install using Helm:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

### AWS Secrets Manager Integration

Create IAM credentials for the operator:

```yaml
# AWS credentials secret for the operator
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: external-secrets
type: Opaque
stringData:
  access-key-id: AKIAIOSFODNN7EXAMPLE
  secret-access-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Configure a ClusterSecretStore for AWS:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-west-2
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: secret-access-key
```

Create an ExternalSecret to sync from AWS:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  # Sync every 5 minutes
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        # Template the secret data
        connection-string: "postgresql://{{ .username }}:{{ .password }}@db.example.com:5432/mydb"
  data:
    - secretKey: username
      remoteRef:
        key: production/database
        property: username
    - secretKey: password
      remoteRef:
        key: production/database
        property: password
```

### HashiCorp Vault Integration

Configure Vault authentication using Kubernetes service account:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

Sync secrets from Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: app-secrets
  data:
    - secretKey: api-key
      remoteRef:
        key: secret/data/production/api
        property: key
    - secretKey: api-secret
      remoteRef:
        key: secret/data/production/api
        property: secret
```

### Azure Key Vault Integration

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-keyvault
spec:
  provider:
    azurekv:
      tenantId: "your-tenant-id"
      vaultUrl: "https://your-vault.vault.azure.net"
      authSecretRef:
        clientId:
          name: azure-credentials
          namespace: external-secrets
          key: client-id
        clientSecret:
          name: azure-credentials
          namespace: external-secrets
          key: client-secret
```

## Sealed Secrets

Sealed Secrets allows you to store encrypted secrets in Git. Only the cluster can decrypt them.

### Installation

Install the controller and CLI:

```bash
# Install controller
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system

# Install CLI (macOS)
brew install kubeseal

# Install CLI (Linux)
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-0.24.0-linux-amd64.tar.gz
tar -xvzf kubeseal-0.24.0-linux-amd64.tar.gz
sudo mv kubeseal /usr/local/bin/
```

### Creating Sealed Secrets

Create a regular secret and seal it:

```bash
# Create a secret manifest (do not apply it)
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password='S3cur3P@ssw0rd!' \
  --dry-run=client -o yaml > secret.yaml

# Seal the secret
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# Apply the sealed secret
kubectl apply -f sealed-secret.yaml
```

The sealed secret looks like this:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: default
spec:
  encryptedData:
    password: AgBy3i4OJSWK+PiTySYZZA9rO43cGD...
    username: AgBy3i4OJSWK+PiTySYZZA9rO43cGD...
  template:
    metadata:
      name: db-credentials
      namespace: default
    type: Opaque
```

### Scopes

Control where sealed secrets can be used:

```bash
# Strict scope: secret name and namespace must match
kubeseal --scope strict < secret.yaml > sealed-secret.yaml

# Namespace-wide: can be renamed within the namespace
kubeseal --scope namespace-wide < secret.yaml > sealed-secret.yaml

# Cluster-wide: can be used anywhere in the cluster
kubeseal --scope cluster-wide < secret.yaml > sealed-secret.yaml
```

### Backup and Recovery

Backup the sealing key for disaster recovery:

```bash
# Backup the private key
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-key-backup.yaml

# Store this backup securely outside the cluster
```

## RBAC for Secrets

Restrict access to secrets using Role-Based Access Control.

### Namespace-Scoped Access

Create a Role that allows reading specific secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
  # Allow reading secrets
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch"]
    # Optionally restrict to specific secrets by name
    resourceNames: ["db-credentials", "api-credentials"]
```

Bind the role to a service account:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-secret-reader
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

### Cluster-Wide Secret Management

Create a ClusterRole for secret administrators:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-admin
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["create", "delete", "get", "list", "patch", "update", "watch"]
```

Restrict to specific namespaces using RoleBinding:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: production-secret-admin
  namespace: production
subjects:
  - kind: Group
    name: production-admins
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-admin
  apiGroup: rbac.authorization.k8s.io
```

### Deny Access Pattern

Create a restrictive policy that denies secret access by default:

```yaml
# Default role with no secret access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer-no-secrets
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "deployments"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
  # Explicitly exclude secrets by not listing them
```

### Audit Logging

Enable audit logging to track secret access:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all secret operations at RequestResponse level
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["secrets"]
    # Omit the request/response body (contains secret data)
    omitStages:
      - RequestReceived
```

## Secret Rotation Strategies

### Manual Rotation

Update secrets and restart pods:

```bash
# Update the secret
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password='NewP@ssw0rd!' \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployments to pick up new secret
kubectl rollout restart deployment/myapp -n production
```

### Automatic Rotation with External Secrets

Configure automatic refresh in ExternalSecret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-secret
spec:
  # Refresh every hour
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: app-secret
  data:
    - secretKey: api-key
      remoteRef:
        key: production/api-key
```

### Reloader for Automatic Pod Restart

Install Reloader to automatically restart pods when secrets change:

```bash
helm repo add stakater https://stakater.github.io/stakater-charts
helm install reloader stakater/reloader --namespace kube-system
```

Annotate deployments for automatic reload:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    # Reload when specific secret changes
    reloader.stakater.com/auto: "true"
    # Or specify exact secrets
    secret.reloader.stakater.com/reload: "db-credentials,api-credentials"
spec:
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        envFrom:
        - secretRef:
            name: db-credentials
```

### Zero-Downtime Rotation

For zero-downtime rotation, support both old and new credentials simultaneously:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  # Current credentials
  username: admin
  password: CurrentP@ssw0rd!
  # New credentials (for transition period)
  username-new: admin
  password-new: NewP@ssw0rd!
```

Application code should try new credentials first, fall back to current:

```python
# Python example for dual-credential support
import os

def get_db_connection():
    # Try new credentials first
    new_user = os.getenv('DB_USERNAME_NEW')
    new_pass = os.getenv('DB_PASSWORD_NEW')

    if new_user and new_pass:
        try:
            return connect(username=new_user, password=new_pass)
        except AuthenticationError:
            pass

    # Fall back to current credentials
    return connect(
        username=os.getenv('DB_USERNAME'),
        password=os.getenv('DB_PASSWORD')
    )
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| Enable encryption at rest | Protect secrets in etcd storage |
| Use external secret stores | Keep secrets outside the cluster |
| Implement RBAC | Restrict who can access secrets |
| Rotate regularly | Change secrets on a schedule |
| Audit access | Log who accesses secrets and when |
| Use namespaces | Isolate secrets by environment |
| Avoid env vars for sensitive data | Prefer volume mounts (more secure) |
| Never commit plain secrets | Use Sealed Secrets or external stores |

## Complete Example: Production Setup

Here is a complete example combining multiple strategies:

```yaml
---
# Namespace with resource quotas
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
---
# Service account for the application
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
---
# RBAC: Allow reading specific secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-secrets
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames: ["app-secrets"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-secrets
  namespace: production
subjects:
  - kind: ServiceAccount
    name: myapp
    namespace: production
roleRef:
  kind: Role
  name: myapp-secrets
  apiGroup: rbac.authorization.k8s.io
---
# External secret synced from AWS
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: database-url
      remoteRef:
        key: production/database
        property: url
    - secretKey: api-key
      remoteRef:
        key: production/api
        property: key
---
# Deployment using the secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  annotations:
    reloader.stakater.com/auto: "true"
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
      serviceAccountName: myapp
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          volumeMounts:
            - name: secrets
              mountPath: /etc/secrets
              readOnly: true
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
      volumes:
        - name: secrets
          secret:
            secretName: app-secrets
            defaultMode: 0400
```

## Troubleshooting

Check if a secret exists and has expected keys:

```bash
# List all keys in a secret
kubectl get secret my-secret -o jsonpath='{.data}' | jq 'keys'

# Verify secret is mounted correctly
kubectl exec -it mypod -- ls -la /etc/secrets

# Check if pod can access secret
kubectl auth can-i get secrets --as=system:serviceaccount:production:myapp
```

Debug External Secrets Operator:

```bash
# Check ExternalSecret status
kubectl get externalsecret -n production

# View sync errors
kubectl describe externalsecret my-secret -n production

# Check operator logs
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets
```

## Conclusion

Building robust secrets management in Kubernetes requires layered security. Start with encryption at rest, add external secret stores for centralized management, implement strict RBAC controls, and establish rotation procedures. Each layer adds protection, and together they create a secure foundation for handling sensitive data in your clusters.

The tools and patterns covered here work together. Use External Secrets Operator or Sealed Secrets to avoid storing plain secrets in Git. Enable encryption at rest as a baseline. Implement RBAC to enforce least-privilege access. Set up automatic rotation to reduce the risk of compromised credentials.

Test your setup regularly. Verify that encryption is working, audit logs are capturing access, and rotation procedures complete successfully. Security is not a one-time configuration but an ongoing practice.
