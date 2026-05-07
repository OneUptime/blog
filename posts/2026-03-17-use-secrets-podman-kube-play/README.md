# How to Use Secrets with podman kube play

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Secret, Kubernetes, Kube Play

Description: Learn how to use Podman secrets with podman kube play to deploy Kubernetes-style YAML manifests with secure credential management.

---

> The `podman kube play` command deploys Kubernetes YAML manifests locally, and supports Kubernetes Secret objects for secure credential delivery to pods.

Podman's `kube play` command lets you run Kubernetes Pod and Deployment manifests without a full Kubernetes cluster. When combined with Kubernetes Secret objects, you can manage credentials using the familiar Kubernetes patterns while running everything locally with Podman.

---

## Creating a Kubernetes Secret YAML

```yaml
# secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  # Values must be base64-encoded
  db_password: bXktZGF0YWJhc2UtcGFzc3dvcmQ=
  api_key: c2stYXBpLWtleS0xMjM=
```

```bash
# Encode your values to base64
echo -n "my-database-password" | base64
# Output: bXktZGF0YWJhc2UtcGFzc3dvcmQ=

echo -n "sk-api-key-123" | base64
# Output: c2stYXBpLWtleS0xMjM=
```

## Using Secrets in a Pod YAML

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:latest
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: secret-volume
          mountPath: /run/secrets
          readOnly: true
  volumes:
    - name: secret-volume
      secret:
        secretName: app-secrets
```

## Deploying with podman kube play

```bash
# Deploy the secret and pod together
podman kube play secret.yaml
podman kube play pod.yaml

# Or combine them in a single file separated by ---
podman kube play combined.yaml
```

## Secrets as Environment Variables

```yaml
# pod-with-env-secrets.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-env
spec:
  containers:
    - name: app
      image: my-app:latest
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db_password
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: api_key
```

```bash
# Deploy the pod with environment variable secrets
podman kube play pod-with-env-secrets.yaml
```

## Using Pre-Created Podman Secrets

```bash
# Create a Podman secret from a Kubernetes Secret manifest first
podman secret create app-secrets secret.yaml

# Reference them in the pod YAML using Podman secret names
```

```yaml
# pod-podman-secrets.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:latest
      volumeMounts:
        - name: app-secrets
          mountPath: /run/secrets
          readOnly: true
  volumes:
    - name: app-secrets
      secret:
        secretName: app-secrets
```

## Combined Manifest

```yaml
# app-stack.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
type: Opaque
data:
  db_password: bXktZGF0YWJhc2UtcGFzc3dvcmQ=
  redis_auth: cmVkaXMtYXV0aC10b2tlbg==
---
apiVersion: v1
kind: Pod
metadata:
  name: app-stack
spec:
  containers:
    - name: web
      image: my-web-app:latest
      ports:
        - containerPort: 8080
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-credentials
              key: db_password
    - name: redis
      image: redis:7
      env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-credentials
              key: redis_auth
```

```bash
# Deploy the entire stack
podman kube play app-stack.yaml

# Tear down the stack
podman kube down app-stack.yaml
```

## Summary

The `podman kube play` command supports Kubernetes Secret objects for managing credentials in pod deployments. Define secrets as base64-encoded values in Secret manifests, then reference them as volume mounts or environment variables in your Pod specifications. This approach lets you use Kubernetes-native patterns for secret management while running everything locally with Podman, making it easy to develop and test Kubernetes workloads without a cluster.
