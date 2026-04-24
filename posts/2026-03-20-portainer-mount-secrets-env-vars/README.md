# How to Mount Secrets as Environment Variables in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Secret, Environment Variable, Security, DevOps

Description: Learn how to inject Kubernetes Secret data as environment variables into pods using Portainer for secure credential injection without hardcoding sensitive values.

## Introduction

Injecting Secrets as environment variables is a common way to provide sensitive data - database passwords, API tokens, encryption keys - to applications without hardcoding them in source code or container images. Kubernetes Secrets are intended for sensitive data and can be access-controlled via RBAC; if you need them protected in etcd, enable encryption at rest. Portainer supports Secret-backed environment variables through its form UI and by deploying Kubernetes YAML manifests through Portainer.

## Prerequisites

- Portainer with Kubernetes environment
- An existing Secret with sensitive data
- A deployment to configure

## Step 1: Create the Secret First

Ensure the Secret exists before referencing it:

```bash
# Verify Secret exists

kubectl get secret my-app-secrets -n production

# Check available keys (values are hidden)
kubectl describe secret my-app-secrets -n production
```

Example Secret:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: production
type: Opaque
stringData:
  DATABASE_PASSWORD: "super-secret-db-password"
  DATABASE_URL: "postgresql://user:super-secret-db-password@postgres:5432/mydb"
  JWT_SECRET: "a-long-random-jwt-signing-key-minimum-32-chars"
  API_KEY: "sk-prod-abc123def456ghi789"
  STRIPE_SECRET_KEY: "sk_live_abc123"
```

## Step 2: Mount Secret via Portainer Form

When creating or editing an application in Portainer:

1. Go to the **Secrets** section
2. Select the existing Secret, such as `my-app-secrets`
3. Portainer exposes the Secret keys as environment variables by default
4. Use **Override** only if you want a given key mounted as a file instead
5. Deploy or update the application

## Step 3: Mount Specific Secret Keys (YAML)

Inject individual keys from a Secret:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
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
          image: my-app:latest
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: DATABASE_PASSWORD

            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: DATABASE_URL

            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: JWT_SECRET

            - name: STRIPE_KEY
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: STRIPE_SECRET_KEY
```

## Step 4: Inject All Secret Keys with envFrom

To inject all keys from a Secret as environment variables:

```yaml
spec:
  containers:
    - name: my-app
      image: my-app:latest
      envFrom:
        - secretRef:
            name: my-app-secrets
```

All keys in `my-app-secrets` that are valid environment variable names become environment variables in the container.

## Step 5: Combine Secrets and ConfigMaps

Most applications need both non-sensitive config and sensitive credentials:

```yaml
spec:
  containers:
    - name: my-app
      image: my-app:latest
      envFrom:
        # Non-sensitive configuration
        - configMapRef:
            name: app-config
        # Sensitive credentials
        - secretRef:
            name: my-app-secrets
      env:
        # Additional static or override values
        - name: APP_VERSION
          value: "2.0.0"
        # Expose a specific secret key under a custom env var name
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: my-app-secrets
              key: DATABASE_PASSWORD
```

## Step 6: Make Secret References Optional

```yaml
env:
  - name: OPTIONAL_API_KEY
    valueFrom:
      secretKeyRef:
        name: optional-service-keys
        key: API_KEY
        optional: true   # Pod starts even if Secret doesn't exist
```

Useful for optional integrations that may not be configured in every environment.

## Step 7: Verify Secret Injection

```bash
# Check if env vars are set in the pod (WITHOUT revealing values)
kubectl exec <pod-name> -n production -- \
  printenv | grep -Ec '^(DB_PASSWORD|JWT_SECRET)='
# Should output: 2 (confirming both variables are present)

# Verify a variable is set (shows it exists, not the value)
kubectl exec <pod-name> -n production -- \
  sh -c 'if [ -n "$DB_PASSWORD" ]; then echo "SET"; else echo "NOT SET"; fi'

# For debugging only (NEVER in production logs):
# kubectl exec <pod-name> -n production -- printenv DB_PASSWORD
```

## Step 8: Security Considerations

Environment variables have security limitations compared to mounted files:

```bash
# Environment variables can be exposed via:
# 1. Process inspection on the node: /proc/<pid>/environ
# 2. Container exec: kubectl exec ... -- printenv
# 3. Application crashes dumping environment
# 4. Node-level container runtime inspection (runtime-specific tooling)

# Mitigations:
# 1. Grant a narrower pod read role that does not include pods/exec, pods/attach, or pods/portforward
kubectl create role pod-read-only \
  --verb=get,list,watch \
  --resource=pods \
  -n production
# Bind this narrower Role instead of broader roles that include pod subresources

# 2. Use Secret volumes instead for highly sensitive data
# (covered in the mount-secrets-files guide)

# 3. Enable secret encryption at rest
# (requires cluster-level kube-apiserver configuration)

# 4. Restrict Secret access via RBAC
kubectl create role secret-reader \
  --verb=get \
  --resource=secrets \
  --resource-name=my-app-secrets \
  -n production
# Bind this Role only to the service account or user that needs access
```

## Step 9: Rotate Secrets and Restart Pods

Environment variable injection requires pod restart after secret rotation:

```bash
# Update the secret value
kubectl patch secret my-app-secrets -n production \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/DATABASE_PASSWORD", "value":"'$(echo -n "new-password-2024" | base64)'"}]'

# Restart deployment to pick up new secret values
kubectl rollout restart deployment/my-app -n production

# Verify new secret is loaded (without revealing value)
kubectl exec <new-pod-name> -n production -- \
  sh -c 'echo "Password length: ${#DB_PASSWORD}"'
```

## Conclusion

Injecting Secrets as environment variables provides a straightforward way to supply sensitive credentials to containerized applications. Use `secretKeyRef` for selective injection with custom names, `envFrom.secretRef` for bulk injection when the Secret keys already match the environment variable names you want, and combine with ConfigMap refs for non-sensitive config. Be aware that environment variables have inherent security trade-offs compared to volume mounts; for the most sensitive credentials, consider mounting secrets as files with restricted filesystem permissions instead.
