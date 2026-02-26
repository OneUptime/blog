# How to Integrate ArgoCD with Authelia

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Authelia, Authentication

Description: Learn how to integrate ArgoCD with Authelia for self-hosted authentication and authorization, including OIDC configuration, access control policies, and two-factor authentication enforcement.

---

Authelia is a lightweight, self-hosted authentication and authorization server that provides single sign-on and two-factor authentication for web applications. It sits as a companion to reverse proxies like Nginx, Traefik, or HAProxy, and recently added OIDC provider capabilities. If you are already using Authelia to protect your infrastructure services, integrating it with ArgoCD keeps your authentication stack unified and self-hosted.

This guide covers integrating ArgoCD with Authelia using its OIDC provider feature.

## Authelia OIDC Overview

Authelia's OIDC support is relatively newer compared to dedicated identity providers, but it covers the essentials needed for ArgoCD integration: client authentication, authorization code flow, ID tokens with custom claims, and group support.

```mermaid
graph LR
    A[User] --> B[ArgoCD UI]
    B --> C[Dex]
    C --> D[Authelia OIDC]
    D --> E[Authelia User Backend]
    E --> F[LDAP / File Backend]
    D --> C
    C --> B
```

## Prerequisites

1. Authelia deployed and accessible (e.g., `https://auth.example.com`)
2. Authelia configured with OIDC support (requires Authelia v4.37+)
3. A user backend configured (file-based or LDAP)
4. ArgoCD deployed and accessible

## Step 1: Configure Authelia OIDC Provider

Add the OIDC configuration to your Authelia configuration file:

```yaml
# authelia configuration.yml
identity_providers:
  oidc:
    # HMAC secret for signing (generate with: openssl rand -hex 32)
    hmac_secret: 'your-hmac-secret-here'

    # Issuer URL - must match what ArgoCD/Dex expects
    issuer_private_key: |
      -----BEGIN RSA PRIVATE KEY-----
      ... your RSA private key ...
      -----END RSA PRIVATE KEY-----

    # CORS configuration for ArgoCD
    cors:
      endpoints:
      - authorization
      - token
      - revocation
      - introspection
      - userinfo
      allowed_origins_from_client_redirect_uris: true

    # Define the ArgoCD client
    clients:
    - id: argocd
      description: ArgoCD GitOps Platform
      secret: '$pbkdf2-sha512$310000$...'  # Hashed secret
      # Generate hashed secret:
      # authelia crypto hash generate pbkdf2 --variant sha512 --random --random.length 72
      public: false
      authorization_policy: two_factor  # Require 2FA for ArgoCD
      redirect_uris:
      - https://argocd.example.com/api/dex/callback
      scopes:
      - openid
      - profile
      - email
      - groups
      userinfo_signing_algorithm: none
      consent_mode: implicit  # Skip consent screen
      token_endpoint_auth_method: client_secret_post
```

### Generate the Client Secret

Authelia stores client secrets as hashed values. Generate one:

```bash
# Generate a random secret and its hash
# The plaintext version goes in ArgoCD, the hashed version goes in Authelia
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate pbkdf2 \
  --variant sha512 \
  --random \
  --random.length 72
```

This outputs both the plaintext secret (for ArgoCD) and the hashed version (for Authelia config).

## Step 2: Configure Authelia Access Control

Set up access control policies in Authelia that apply to ArgoCD:

```yaml
# authelia configuration.yml
access_control:
  default_policy: deny

  rules:
  # ArgoCD OIDC endpoints must be accessible
  - domain: auth.example.com
    resources:
    - '^/api/oidc.*$'
    policy: bypass

  # ArgoCD requires two-factor authentication
  - domain: argocd.example.com
    policy: two_factor
    subject:
    - 'group:argocd-users'
    - 'group:argocd-admins'

  # Deny everyone else
  - domain: argocd.example.com
    policy: deny
```

## Step 3: Configure Groups in Authelia

If using a file-based user backend, define users and groups:

```yaml
# authelia users_database.yml
users:
  alice:
    displayname: "Alice Engineer"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: alice@example.com
    groups:
    - argocd-admins
    - platform-team

  bob:
    displayname: "Bob Developer"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: bob@example.com
    groups:
    - argocd-users
    - developers

  charlie:
    displayname: "Charlie Viewer"
    password: "$argon2id$v=19$m=65536,t=3,p=4$..."
    email: charlie@example.com
    groups:
    - argocd-users
```

If using LDAP backend, groups are pulled from your LDAP directory automatically.

## Step 4: Configure ArgoCD Dex for Authelia

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com

  dex.config: |
    connectors:
    - type: oidc
      id: authelia
      name: Authelia
      config:
        issuer: https://auth.example.com
        clientID: argocd
        clientSecret: $dex.authelia.clientSecret
        redirectURI: https://argocd.example.com/api/dex/callback

        scopes:
        - openid
        - profile
        - email
        - groups

        # Enable group claims
        insecureEnableGroups: true
        groupsKey: groups

        # Claim mapping
        userIDKey: sub
        userNameKey: preferred_username
        emailKey: email

        # If Authelia uses a self-signed cert
        # rootCAData: <base64-encoded-ca-cert>
```

Store the plaintext client secret in ArgoCD:

```bash
kubectl patch secret argocd-secret -n argocd \
  --type merge \
  -p '{"stringData": {"dex.authelia.clientSecret": "plaintext-secret-from-step-1"}}'
```

## Step 5: Configure ArgoCD RBAC

Map Authelia groups to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: ''
  scopes: '[groups, email]'

  policy.csv: |
    # Admin role - full access
    p, role:admin, applications, *, */*, allow
    p, role:admin, clusters, *, *, allow
    p, role:admin, repositories, *, *, allow
    p, role:admin, projects, *, *, allow
    p, role:admin, accounts, *, *, allow

    # Developer role - view and sync
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, list, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, logs, get, */*, allow
    p, role:developer, repositories, get, *, allow

    # Viewer role - read only
    p, role:viewer, applications, get, */*, allow
    p, role:viewer, applications, list, */*, allow

    # Map Authelia groups to ArgoCD roles
    g, argocd-admins, role:admin
    g, developers, role:developer
    g, argocd-users, role:viewer
```

## Step 6: Apply and Restart

```bash
# Apply ConfigMap changes
kubectl apply -f argocd-cm.yaml
kubectl apply -f argocd-rbac-cm.yaml

# Restart Dex to pick up changes
kubectl rollout restart deployment argocd-dex-server -n argocd

# Verify Dex starts without errors
kubectl logs -f deployment/argocd-dex-server -n argocd
```

## Two-Factor Authentication Flow

With Authelia configured for two-factor, the login flow becomes:

```mermaid
sequenceDiagram
    participant User
    participant ArgoCD
    participant Dex
    participant Authelia

    User->>ArgoCD: Click Login
    ArgoCD->>Dex: SSO Redirect
    Dex->>Authelia: OIDC Auth Request
    Authelia->>User: Username/Password Form
    User->>Authelia: Enter Credentials
    Authelia->>User: 2FA Challenge (TOTP/WebAuthn)
    User->>Authelia: Enter 2FA Code
    Authelia->>Dex: Authorization Code
    Dex->>Authelia: Token Exchange
    Authelia->>Dex: ID Token with Groups
    Dex->>ArgoCD: JWT Token
    ArgoCD->>User: Authenticated
```

## Deploying Authelia with ArgoCD

Manage Authelia itself through ArgoCD for a GitOps-managed auth stack:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: authelia
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://charts.authelia.com
    chart: authelia
    targetRevision: 0.9.x
    helm:
      values: |
        domain: example.com
        ingress:
          enabled: true
          subdomain: auth
          tls:
            enabled: true
            secret: authelia-tls

        pod:
          replicas: 2
          resources:
            requests:
              cpu: 100m
              memory: 128Mi

        configMap:
          access_control:
            default_policy: deny
          # ... other config
  destination:
    server: https://kubernetes.default.svc
    namespace: authelia
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

## Troubleshooting

### "invalid_client" Error

Check that the client secret in ArgoCD matches the plaintext version (not the hashed version) of the secret in Authelia. Authelia hashes secrets in its config, but the OIDC client sends the plaintext version.

### OIDC Discovery Fails

Verify Authelia's OIDC discovery endpoint is accessible:

```bash
curl -s https://auth.example.com/.well-known/openid-configuration | jq .
```

If this returns an error, check that Authelia's OIDC provider is properly configured and the issuer_private_key is valid.

### Groups Missing from Token

Ensure the `groups` scope is included in both the Authelia client configuration and the Dex connector scopes. Also verify that users actually have groups assigned in the user database.

Monitor your Authelia and ArgoCD authentication chain with OneUptime to get alerts when login failures spike or authentication services become unavailable.

## Conclusion

Authelia provides a lightweight, self-hosted authentication layer that integrates with ArgoCD through OIDC. The key advantage over heavier solutions like Keycloak is simplicity - Authelia is a single binary with minimal dependencies. The two-factor authentication enforcement adds a strong security layer to ArgoCD access, and the group-based access control maps cleanly to ArgoCD's RBAC system. For teams already running Authelia for web application protection, adding ArgoCD integration keeps the authentication stack simple and consistent.
