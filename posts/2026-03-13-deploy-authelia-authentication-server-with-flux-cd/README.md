# How to Deploy Authelia Authentication Server with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Authelia, SSO, Two-Factor Authentication, Security

Description: Deploy Authelia single sign-on and two-factor authentication server using Flux CD for GitOps-managed authentication middleware on Kubernetes.

---

## Introduction

Authelia is an open-source authentication and authorization server that provides single sign-on with support for multi-factor authentication (TOTP, WebAuthn, Duo Push) and fine-grained access control policies. It integrates natively with reverse proxies like NGINX, Traefik, and HAProxy, acting as an authentication gateway that protects backend services based on configurable rules.

Where OAuth2 Proxy provides broad OAuth2 flow integration, Authelia goes further by offering its own session management, user database (LDAP or file-based), 2FA enforcement, and per-domain or per-path access policies. This makes it ideal for self-hosted environments where you want enterprise-grade authentication without a third-party SaaS identity provider.

Flux CD manages the Authelia deployment, configuration, and secret references declaratively, ensuring that access policies and MFA settings are version-controlled alongside the rest of your infrastructure.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- ingress-nginx Ingress controller
- Redis (for session storage) — included in the Helm chart
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace authelia

# Core Authelia secrets
kubectl create secret generic authelia-secrets \
  --namespace authelia \
  --from-literal=jwt-secret=$(openssl rand -hex 32) \
  --from-literal=session-secret=$(openssl rand -hex 32) \
  --from-literal=storage-encryption-key=$(openssl rand -hex 32) \
  --from-literal=redis-password=$(openssl rand -hex 16)
```

## Step 2: Add the Authelia Helm Repository

```yaml
# clusters/my-cluster/authelia/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: authelia
  namespace: flux-system
spec:
  url: https://charts.authelia.com
  interval: 12h
```

## Step 3: Create the Authelia ConfigMap

Authelia reads its main configuration from a YAML file. Store it as a ConfigMap.

```yaml
# clusters/my-cluster/authelia/authelia-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: authelia-config
  namespace: authelia
data:
  configuration.yaml: |
    ---
    theme: light
    default_redirection_url: https://home.example.com

    server:
      host: 0.0.0.0
      port: 9091

    log:
      level: info

    # Time-based One-Time Password configuration
    totp:
      issuer: example.com
      period: 30
      skew: 1

    # Authentication backend — using file for simplicity
    authentication_backend:
      file:
        path: /config/users_database.yml
        password:
          algorithm: argon2id
          iterations: 1
          salt_length: 16
          parallelism: 8
          memory: 64

    # Session configuration (Redis backend)
    session:
      name: authelia_session
      domain: example.com
      same_site: lax
      expiration: 1h
      inactivity: 5m
      redis:
        host: authelia-redis-master
        port: 6379

    # Regulation — lock out brute-force attempts
    regulation:
      max_retries: 3
      find_time: 2m
      ban_time: 5m

    # SQLite storage (use PostgreSQL for production)
    storage:
      local:
        path: /data/db.sqlite3

    # Notification backend (file for testing, SMTP for production)
    notifier:
      filesystem:
        filename: /tmp/notification.txt

    # Access control — who can access what
    access_control:
      default_policy: deny
      rules:
        # Allow all authenticated users to access the home page
        - domain: home.example.com
          policy: one_factor
        # Require 2FA for admin interfaces
        - domain: admin.example.com
          policy: two_factor
        # Public access for the landing page
        - domain: public.example.com
          policy: bypass
```

## Step 4: Create the Users Database Secret

```bash
# Generate password hash (argon2id) — install argon2 CLI first
# echo -n "UserPassword1!" | argon2 salt -id -v 19 -m 16 -t 2 -p 1 -l 32 -e

kubectl create secret generic authelia-users \
  --namespace authelia \
  --from-literal=users_database.yml='---
users:
  admin:
    displayname: "Admin User"
    password: "$argon2id$v=19$m=65536,t=1,p=8$..."  # Replace with real hash
    email: admin@example.com
    groups:
      - admins
      - dev
'
```

## Step 5: Deploy Authelia via HelmRelease

```yaml
# clusters/my-cluster/authelia/authelia-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: authelia
  namespace: authelia
spec:
  interval: 10m
  chart:
    spec:
      chart: authelia
      version: ">=0.9.0 <0.10.0"
      sourceRef:
        kind: HelmRepository
        name: authelia
        namespace: flux-system
  values:
    # Mount secrets from Kubernetes secrets
    secret:
      existingSecret: authelia-secrets
      jwt:
        key: jwt-secret
      session:
        key: session-secret
      storageEncryptionKey:
        key: storage-encryption-key

    # Mount configuration from ConfigMap
    configMap:
      existingConfigMap: authelia-config
      key: configuration.yaml

    # Mount users database
    secret:
      existingSecret: authelia-users

    # Bundled Redis
    redis:
      enabled: true
      auth:
        existingSecret: authelia-secrets
        existingSecretPasswordKey: redis-password

    ingress:
      enabled: true
      ingressClassName: nginx
      hostname: auth.example.com
      tls:
        enabled: true
        secret: authelia-tls

    persistence:
      enabled: true
      size: 1Gi

    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

## Step 6: Create the Kustomization

```yaml
# clusters/my-cluster/authelia/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: authelia
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/authelia
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 7: Protect Applications via Ingress Annotations

```yaml
# Ingress for a protected application
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://auth.example.com/api/verify"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.example.com/?rd=$target_url"
    nginx.ingress.kubernetes.io/auth-response-headers: "Remote-User,Remote-Groups,Remote-Name,Remote-Email"
```

## Best Practices

- Migrate from SQLite to PostgreSQL storage (`storage.postgres`) before going to production for reliability and query performance.
- Enable SMTP notifications so Authelia can send password reset and 2FA enrollment emails.
- Use LDAP as the authentication backend (`authentication_backend.ldap`) to integrate with corporate directories.
- Configure `regulation` settings carefully—too aggressive a ban policy can lock out legitimate users.
- Store the `users_database.yml` in a Sealed Secret and update it via Git when adding new users.

## Conclusion

Authelia is now deployed on Kubernetes and managed by Flux CD. Your self-hosted authentication layer provides SSO and multi-factor authentication for any reverse-proxied application, with all access control policies declared in Git. As your organization grows, adding new access rules or protected domains is a pull request against the Authelia configuration ConfigMap.
