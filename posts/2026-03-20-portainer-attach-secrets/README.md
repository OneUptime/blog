# How to Attach Secrets to Applications in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Secret, Security, DevOps

Description: Learn how to create Kubernetes Secrets and attach them to applications as environment variables or mounted files in Portainer.

## Introduction

Kubernetes Secrets provide a way to store and manage sensitive information that applications need - database passwords, API tokens, TLS certificates. Unlike ConfigMaps, Secrets are base64-encoded (not encrypted by default, but can be configured with at-rest encryption). Portainer makes creating and attaching Secrets straightforward. This guide covers the complete workflow.

## Prerequisites

- Portainer with Kubernetes environment
- Understanding that Secrets should be treated with care

## Security Note

Kubernetes Secrets are base64-encoded, not encrypted, by default. For production:
- Enable etcd encryption at rest
- Use external secret management (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault)
- Control RBAC access to Secrets tightly

## Step 1: Create a Secret in Portainer

### Via Form

1. Select your Kubernetes environment
2. Click **ConfigMaps & Secrets** in the sidebar, then open the **Secrets** tab
3. Click **Add with form**
4. Configure:

```text
Name:      db-credentials
Namespace: production
Type:      Opaque
```

5. Add key-value pairs:

```text
Key: DB_PASSWORD    Value: MySecurePassword123!
Key: DB_USER        Value: appuser
Key: REDIS_PASSWORD Value: RedisPass456!
Key: API_SECRET     Value: sk-xxxxxxxxxxxxxxxxxxxx
```

6. Click **Create Secret**

### Via YAML

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:    # Use stringData for plain text (auto-encoded)
  DB_PASSWORD: "MySecurePassword123!"
  DB_USER: "appuser"
  REDIS_PASSWORD: "RedisPass456!"
  API_SECRET: "sk-xxxxxxxxxxxxxxxxxxxx"
```

**Note:** When creating the Secret from a manifest in Portainer, you can use `stringData` for plain text. Kubernetes stores it as base64-encoded `data`.

## Step 2: Attach Secret as Environment Variables

### Via Portainer Form

When creating/editing an application:

1. Go to the **Secrets** section
2. Select `db-credentials`
3. Portainer exposes all keys as environment variables by default:

```text
Secret: db-credentials
Default behavior: expose all keys as environment variables
```

### In a Pod spec

```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
      # Load all keys from Secret as env vars
      envFrom:
        - secretRef:
            name: db-credentials

      # Or load specific keys
      env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: DB_PASSWORD
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: REDIS_PASSWORD
```

## Step 3: Attach Secret as a Volume (File Mount)

In a Pod spec, for applications that read credentials from files (like the official PostgreSQL image's `POSTGRES_PASSWORD_FILE`):

```yaml
spec:
  containers:
    - name: postgres
      image: postgres:15
      env:
        - name: POSTGRES_PASSWORD_FILE
          value: /run/secrets/db-password    # Point to the file
      volumeMounts:
        - name: db-secret
          mountPath: /run/secrets
          readOnly: true

  volumes:
    - name: db-secret
      secret:
        secretName: db-credentials
        defaultMode: 0400    # Strictly owner-readable only
        items:
          - key: DB_PASSWORD     # Mount specific key
            path: db-password    # As this filename
```

## Step 4: Attach TLS Certificate Secret

For HTTPS/TLS configuration:

```bash
# Create TLS secret from cert files

kubectl create secret tls my-tls-secret \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=production

# Or from an existing cert
kubectl create secret tls my-tls-secret \
  --cert=fullchain.pem \
  --key=privkey.pem \
  --namespace=production
```

Use in an Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: production
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: my-tls-secret    # Reference the TLS secret
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

## Step 5: Secret for Docker Registry Pull

```bash
# Create image pull secret
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.company.com \
  --docker-username=user \
  --docker-password=password \
  --namespace=production
```

Reference in a Pod:

```yaml
spec:
  imagePullSecrets:
    - name: registry-credentials
```

## Step 6: Verify Secret Attachment

```bash
# Confirm the secret exists
kubectl get secret db-credentials -n production

# See secret keys (not values)
kubectl describe secret db-credentials -n production

# Verify inside pod (env var approach)
kubectl exec -it <pod-name> -n production -- printenv DB_PASSWORD

# Verify inside pod (file approach)
kubectl exec -it <pod-name> -n production -- cat /run/secrets/db-password
```

## Step 7: Rotate Secrets

To rotate a secret in place:

```bash
# Recreate the Secret manifest with every key you want to keep, then apply it
kubectl create secret generic db-credentials \
  --from-literal=DB_PASSWORD="NewSecurePassword!" \
  --from-literal=DB_USER="appuser" \
  --from-literal=REDIS_PASSWORD="RedisPass456!" \
  --from-literal=API_SECRET="sk-xxxxxxxxxxxxxxxxxxxx" \
  --namespace=production \
  --dry-run=client -o yaml | kubectl apply -f -
```

For file-mounted secrets, Kubernetes updates the projected files in running Pods automatically on an eventually consistent basis. For environment variables from Secrets, restart the Pods:

```bash
kubectl rollout restart deployment myapp -n production
```

## Conclusion

Kubernetes Secrets in Portainer provide a straightforward way to manage sensitive application configuration. Use environment variable references for simple credentials and file mounts for applications that expect file-based secrets. Always be mindful of Secrets security: restrict RBAC access, consider at-rest encryption, and for highly sensitive credentials, integrate with dedicated secret management systems like HashiCorp Vault.
