# How to Configure ServiceAccount Projected Volumes with Custom Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ServiceAccounts, Storage

Description: Configure Kubernetes ServiceAccount tokens using projected volumes with custom mount paths, multiple tokens, and combined resources for flexible pod credential management.

---

Projected volumes provide fine-grained control over how ServiceAccount tokens and other secrets are mounted into pods. By using custom paths and combining multiple credential sources, you create flexible and secure credential distribution strategies.

## Understanding Projected Volumes

Traditional ServiceAccount token mounting is rigid. The token appears at a fixed location with standard properties. Projected volumes change this by letting you specify exactly where tokens are mounted, what their properties are, and what other resources share the volume.

A projected volume can combine ServiceAccount tokens, ConfigMaps, Secrets, and downward API information into a single volume with a custom directory structure. This is powerful for applications that need multiple credentials or specific file layouts.

Projected volumes also enable multiple ServiceAccount tokens with different audiences and expiration times in the same pod, perfect for microservices that authenticate with multiple backends.

## Basic Projected Volume Configuration

Start with a simple custom path:

```yaml
# custom-path-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-token-path
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: app-credentials
      mountPath: /credentials
      readOnly: true
    env:
    - name: TOKEN_PATH
      value: /credentials/token
  volumes:
  - name: app-credentials
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
```

The token appears at `/credentials/token` instead of the default location. This is useful when applications expect credentials in specific directories.

## Multiple Tokens with Different Properties

Create multiple tokens for different services:

```yaml
# multi-token-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-service-app
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: tokens
      mountPath: /var/run/tokens
      readOnly: true
    env:
    - name: API_TOKEN_PATH
      value: /var/run/tokens/api-token
    - name: VAULT_TOKEN_PATH
      value: /var/run/tokens/vault-token
    - name: DB_TOKEN_PATH
      value: /var/run/tokens/db-token
  volumes:
  - name: tokens
    projected:
      sources:
      # Token for Kubernetes API - long-lived
      - serviceAccountToken:
          path: api-token
          expirationSeconds: 7200
          audience: api
      # Token for Vault - short-lived
      - serviceAccountToken:
          path: vault-token
          expirationSeconds: 600
          audience: vault
      # Token for database authentication - medium-lived
      - serviceAccountToken:
          path: db-token
          expirationSeconds: 1800
          audience: database
```

This pod has three separate tokens, each with appropriate lifetimes for its use case. The API token lasts 2 hours, the Vault token expires in 10 minutes, and the database token lasts 30 minutes.

## Combining Tokens with ConfigMaps and Secrets

Project multiple resource types into a single volume:

```yaml
# combined-projection-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: full-credentials-app
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: app-credentials
      mountPath: /app/config
      readOnly: true
  volumes:
  - name: app-credentials
    projected:
      sources:
      # ServiceAccount token
      - serviceAccountToken:
          path: auth/token
          expirationSeconds: 3600
          audience: api
      # Application configuration
      - configMap:
          name: app-config
          items:
          - key: app.yaml
            path: config/app.yaml
          - key: features.json
            path: config/features.json
      # Database credentials
      - secret:
          name: db-credentials
          items:
          - key: username
            path: secrets/db-username
          - key: password
            path: secrets/db-password
      # TLS certificates
      - secret:
          name: tls-cert
          items:
          - key: tls.crt
            path: tls/cert.pem
          - key: tls.key
            path: tls/key.pem
```

The volume structure looks like this:

```
/app/config/
├── auth/
│   └── token
├── config/
│   ├── app.yaml
│   └── features.json
├── secrets/
│   ├── db-username
│   └── db-password
└── tls/
    ├── cert.pem
    └── key.pem
```

All credentials and configuration are in one organized structure.

## Hierarchical Path Organization

Organize credentials by service or environment:

```yaml
# hierarchical-paths-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: organized-credentials
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: credentials
      mountPath: /credentials
      readOnly: true
  volumes:
  - name: credentials
    projected:
      sources:
      # Kubernetes API credentials
      - serviceAccountToken:
          path: kubernetes/token
          expirationSeconds: 3600
          audience: api
      - configMap:
          name: kubernetes-config
          items:
          - key: ca.crt
            path: kubernetes/ca.crt
      # External service credentials
      - serviceAccountToken:
          path: external/vault/token
          expirationSeconds: 600
          audience: vault
      - serviceAccountToken:
          path: external/aws/token
          expirationSeconds: 3600
          audience: sts.amazonaws.com
      # Database credentials
      - secret:
          name: postgres-credentials
          items:
          - key: username
            path: database/postgres/username
          - key: password
            path: database/postgres/password
      - secret:
          name: redis-credentials
          items:
          - key: password
            path: database/redis/password
```

This creates a clear hierarchy that mirrors your architecture.

## Setting File Permissions

Control file permissions in projected volumes:

```yaml
# permissions-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-permissions
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: credentials
      mountPath: /credentials
      readOnly: true
  volumes:
  - name: credentials
    projected:
      defaultMode: 0400  # Read-only for owner
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
      - secret:
          name: api-keys
          items:
          - key: private-key
            path: private-key.pem
            mode: 0400  # Specific file gets read-only
          - key: public-key
            path: public-key.pem
            mode: 0444  # World-readable for public key
```

The defaultMode applies to all files unless overridden. Use restrictive permissions (0400 or 0600) for sensitive credentials.

## Dynamic Token Paths for Multi-Tenant Applications

For applications serving multiple tenants:

```yaml
# multi-tenant-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-tenant-app
  namespace: production
spec:
  serviceAccountName: tenant-app
  containers:
  - name: app
    image: tenant-app:latest
    volumeMounts:
    - name: tenant-credentials
      mountPath: /tenants
      readOnly: true
  volumes:
  - name: tenant-credentials
    projected:
      sources:
      # Tenant A credentials
      - serviceAccountToken:
          path: tenant-a/api-token
          expirationSeconds: 3600
          audience: tenant-a-api
      - secret:
          name: tenant-a-secrets
          items:
          - key: db-connection
            path: tenant-a/db-connection
      # Tenant B credentials
      - serviceAccountToken:
          path: tenant-b/api-token
          expirationSeconds: 3600
          audience: tenant-b-api
      - secret:
          name: tenant-b-secrets
          items:
          - key: db-connection
            path: tenant-b/db-connection
```

Each tenant gets isolated credentials in their own directory.

## Projected Volumes for Sidecar Containers

Sidecars often need different credentials than the main container:

```yaml
# sidecar-credentials-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  # Main application
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: app-credentials
      mountPath: /app/credentials
      readOnly: true
  # Logging sidecar
  - name: log-shipper
    image: log-shipper:latest
    volumeMounts:
    - name: logging-credentials
      mountPath: /logging/credentials
      readOnly: true
  volumes:
  # Application credentials
  - name: app-credentials
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
          audience: api
      - secret:
          name: app-secrets
          items:
          - key: api-key
            path: api-key
  # Logging credentials
  - name: logging-credentials
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
          audience: logging-backend
      - secret:
          name: logging-secrets
          items:
          - key: endpoint
            path: endpoint
          - key: auth-token
            path: auth-token
```

Each container gets only the credentials it needs, following the principle of least privilege.

## Reading Projected Tokens in Applications

Applications read tokens from custom paths:

```go
// read-projected-token.go
package main

import (
    "fmt"
    "io/ioutil"
    "os"
)

func readToken(path string) (string, error) {
    token, err := ioutil.ReadFile(path)
    if err != nil {
        return "", err
    }
    return string(token), nil
}

func main() {
    // Read from custom path
    tokenPath := os.Getenv("TOKEN_PATH")
    if tokenPath == "" {
        tokenPath = "/credentials/token"  // Default
    }

    token, err := readToken(tokenPath)
    if err != nil {
        panic(fmt.Sprintf("Failed to read token: %v", err))
    }

    fmt.Printf("Token loaded from %s\n", tokenPath)
    // Use the token...
}
```

Make paths configurable through environment variables for flexibility.

## Monitoring Projected Volume Updates

Watch for token rotation in projected volumes:

```python
# watch-token-updates.py
import time
import os
from datetime import datetime

def get_file_mtime(path):
    """Get file modification time"""
    return os.path.getmtime(path)

def watch_token_rotation(token_path, check_interval=60):
    """Monitor token file for updates"""
    last_mtime = get_file_mtime(token_path)
    print(f"Monitoring {token_path} for updates...")

    while True:
        time.sleep(check_interval)

        current_mtime = get_file_mtime(token_path)
        if current_mtime != last_mtime:
            print(f"[{datetime.now()}] Token rotated!")
            last_mtime = current_mtime

            # Reload token in your application
            with open(token_path, 'r') as f:
                new_token = f.read()
            print(f"New token length: {len(new_token)}")

if __name__ == "__main__":
    token_path = os.getenv("TOKEN_PATH", "/credentials/token")
    watch_token_rotation(token_path)
```

This helps verify that token rotation is working correctly.

## Troubleshooting Projected Volumes

Common issues and solutions:

```bash
# Check if volumes are mounted correctly
kubectl exec -it pod-name -- ls -la /credentials

# Verify file contents
kubectl exec -it pod-name -- cat /credentials/token

# Check permissions
kubectl exec -it pod-name -- stat /credentials/token

# View projected volume configuration
kubectl get pod pod-name -o jsonpath='{.spec.volumes[?(@.name=="credentials")].projected}'

# Check events for volume mount errors
kubectl describe pod pod-name | grep -A 10 Events
```

## Best Practices

Use descriptive path names that indicate the credential purpose. Group related credentials in subdirectories. Set restrictive permissions (0400 or 0600) for sensitive files. Use environment variables to configure paths in applications. Test token rotation by watching file modification times. Document the credential layout in application README files.

## Conclusion

Projected volumes provide powerful flexibility for ServiceAccount token management. By configuring custom mount paths, combining multiple tokens with different properties, and organizing credentials hierarchically, you create credential distribution strategies that match your application architecture. Use projected volumes to give each container exactly the credentials it needs in the format it expects, improving both security and maintainability.
