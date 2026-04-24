# How to Create Secrets via Form in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Secret, Security, DevOps

Description: Learn how to create Kubernetes Secrets using Portainer's form-based interface for securely storing sensitive configuration data like passwords, tokens, and certificates.

## Introduction

Kubernetes Secrets store sensitive data - passwords, API tokens, TLS certificates, SSH keys - in a way that is separate from application code and container images. While Secrets are base64-encoded (not encrypted) by default, they integrate with Kubernetes RBAC and can be encrypted at rest when properly configured. Portainer's form interface makes creating Secrets straightforward. This guide covers creating Secrets using the Portainer form UI.

## Prerequisites

- Portainer with Kubernetes environment
- Admin or namespace-level access
- Sensitive data to store (passwords, tokens, keys)

## Secret Types in Kubernetes

Different secret types serve different purposes:

```text
Opaque                     - Arbitrary key-value data (most common)
kubernetes.io/tls          - TLS certificate and private key
kubernetes.io/dockerconfigjson - Container registry credentials
kubernetes.io/service-account-token - Service account tokens (legacy)
kubernetes.io/ssh-auth     - SSH private keys
kubernetes.io/basic-auth   - Username and password pairs
```

## Step 1: Navigate to Secrets in Portainer

1. Select your Kubernetes environment
2. Select the target namespace from the dropdown
3. Navigate to **ConfigMaps & Secrets** in the sidebar
4. Click on the **Secrets** tab
5. Click **Add with form**

## Step 2: Fill in the Secret Form

For an Opaque secret (most common type):

```text
Name:       my-app-secrets
Namespace:  production

Secret entries:
  Key: DATABASE_PASSWORD    Value: p@ssw0rd-production-2024!
  Key: DATABASE_URL         Value: postgresql://user:pass@postgres:5432/mydb
  Key: JWT_SECRET           Value: a-very-long-random-secret-key-here
  Key: API_KEY              Value: sk-prod-abc123def456ghi789
  Key: REDIS_PASSWORD       Value: redis-secret-password
```

Portainer handles the encoding Kubernetes requires when storing the Secret values.

## Step 3: Create a Docker Registry Secret

For pulling images from private registries:

```text
Name:              registry-credentials
Namespace:         production
Type:              kubernetes.io/dockerconfigjson

Registry server:   docker.io  (or registry.company.com)
Username:          your-username
Password:          your-password-or-token
Email:             ops@company.com  (optional)
```

Or via kubectl for reference:

```bash
# Docker Hub

kubectl create secret docker-registry registry-credentials \
  --docker-username=myusername \
  --docker-password=mytoken \
  --docker-email=ops@company.com \
  -n production

# AWS ECR
kubectl create secret docker-registry ecr-credentials \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1) \
  -n production
```

## Step 4: Create a TLS Secret

For HTTPS/TLS termination at an Ingress:

In Portainer's Secret form:
```text
Name:    my-tls-secret
Type:    kubernetes.io/tls

tls.crt: (paste certificate content)
tls.key: (paste private key content)
```

Or via kubectl:

```bash
# From certificate files
kubectl create secret tls my-tls-secret \
  --cert=tls.crt \
  --key=tls.key \
  -n production

# Self-signed for testing
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /tmp/tls.key \
  -out /tmp/tls.crt \
  -subj "/CN=example.com/O=My Company" \
  -addext "subjectAltName = DNS:example.com"

kubectl create secret tls my-tls-secret \
  --cert=/tmp/tls.crt \
  --key=/tmp/tls.key \
  -n production
```

## Step 5: Verify the Secret

After creation in Portainer:

```bash
# List secrets
kubectl get secrets -n production

# View secret metadata (values are hidden)
kubectl describe secret my-app-secrets -n production

# Decode a specific value (be careful with this in production!)
kubectl get secret my-app-secrets -n production \
  -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 --decode

# View all keys (not values) in a secret
kubectl get secret my-app-secrets -n production \
  -o go-template='{{range $k, $v := .data}}{{printf "%s\n" $k}}{{end}}'
```

## Step 6: Use the Secret in a Deployment

Reference the Secret from an application deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
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
            # Single key from Secret
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: DATABASE_PASSWORD
          # All keys from Secret as environment variables
          envFrom:
            - secretRef:
                name: my-app-secrets
```

## Step 7: Rotate a Secret

To update a Secret and roll workloads to the new values:

1. In Portainer, find the Secret and click **Edit**
2. Update the value(s)
3. Click **Update Secret**
4. Restart the affected pods to pick up the new value:

```bash
# Restart deployment to use new secret values
kubectl rollout restart deployment/my-app -n production

# For Secrets mounted as volumes, changes propagate automatically
# after the kubelet detects the update (except for subPath mounts)
```

## Step 8: Security Best Practices

```bash
# Restrict access to secrets with RBAC
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["my-app-secrets"]  # Only this specific secret
    verbs: ["get"]
EOF

# Enable secret encryption at rest (on cluster, not Portainer)
# Configure kube-apiserver with --encryption-provider-config

# Configure Kubernetes audit logging to record Secret access
# Example kube-apiserver flags:
# --audit-policy-file=/etc/kubernetes/audit-policy.yaml
# --audit-log-path=/var/log/kubernetes/audit/audit.log
```

## Conclusion

Portainer's form-based Secret creation makes it easy to store sensitive data securely in Kubernetes without manually base64-encoding values. Use Opaque secrets for application credentials, TLS secrets for HTTPS termination, and docker registry secrets for private image pulls. Always restrict Secret access via RBAC, enable encryption at rest in production clusters, and rotate secrets regularly to maintain security hygiene.
