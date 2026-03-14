# How to Deploy Authentik Identity Provider with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Authentik, Identity Provider, SSO, OIDC

Description: Deploy Authentik identity provider platform to Kubernetes using Flux CD for a feature-rich, GitOps-managed SSO and identity management solution.

---

## Introduction

Authentik is a modern, open-source identity provider that brings enterprise-grade features to self-hosted environments: single sign-on (SSO), OAuth2 and OIDC server, SAML IdP, LDAP provider, SCIM provisioning, and a powerful flow-based authentication engine that you can customize without writing code. Its Web UI makes it approachable for teams migrating from commercial IdPs.

Unlike lighter-weight solutions such as Dex or OAuth2 Proxy, Authentik maintains its own user database, group management, and authentication flows, making it a full replacement for products like Okta or Azure AD B2C in on-premises environments. Flux CD manages the Authentik deployment declaratively, so every configuration change—from a new OIDC provider to an updated enrollment flow—goes through Git.

This guide deploys Authentik using the official Helm chart with PostgreSQL and Redis backends.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- An Ingress controller with TLS termination
- Persistent storage available
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace authentik

# Authentik requires a secret key and bootstrap credentials
kubectl create secret generic authentik-secrets \
  --namespace authentik \
  --from-literal=secret-key=$(openssl rand -hex 50) \
  --from-literal=bootstrap-password=AuthentikAdmin1! \
  --from-literal=bootstrap-token=$(openssl rand -hex 32) \
  --from-literal=bootstrap-email=admin@example.com \
  --from-literal=postgresql-password=authentik_pg_pass \
  --from-literal=redis-password=$(openssl rand -hex 16)
```

## Step 2: Add the Authentik Helm Repository

```yaml
# clusters/my-cluster/authentik/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: authentik
  namespace: flux-system
spec:
  url: https://charts.goauthentik.io
  interval: 12h
```

## Step 3: Deploy Authentik via HelmRelease

```yaml
# clusters/my-cluster/authentik/authentik-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: authentik
  namespace: authentik
spec:
  interval: 10m
  chart:
    spec:
      chart: authentik
      version: ">=2024.2.0 <2025.0.0"
      sourceRef:
        kind: HelmRepository
        name: authentik
        namespace: flux-system
  values:
    authentik:
      # Load secret key from secret
      secret_key: ""   # Overridden by existingSecret below
      existingSecret: authentik-secrets
      existingSecretKey: secret-key

      # Bootstrap admin account (only used on first run)
      bootstrap_password: ""
      bootstrap_token: ""
      bootstrap_email: ""

      # Error reporting (disable for privacy)
      error_reporting:
        enabled: false

      # Email configuration
      email:
        host: smtp.example.com
        port: 587
        use_tls: true
        from: authentik@example.com
        username: authentik@example.com
        password: ""   # Set via env or secret

    # Bundled PostgreSQL
    postgresql:
      enabled: true
      auth:
        username: authentik
        database: authentik
        existingSecret: authentik-secrets
        secretKeys:
          adminPasswordKey: postgresql-password
          userPasswordKey: postgresql-password
      primary:
        persistence:
          size: 20Gi

    # Bundled Redis
    redis:
      enabled: true
      auth:
        enabled: true
        existingSecret: authentik-secrets
        existingSecretPasswordKey: redis-password

    # Server component
    server:
      replicas: 1
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 1Gi
      ingress:
        enabled: true
        ingressClassName: nginx
        hosts:
          - host: auth.example.com
            paths:
              - path: /
                pathType: Prefix
        tls:
          - secretName: authentik-tls
            hosts:
              - auth.example.com

    # Worker component (handles background tasks)
    worker:
      replicas: 1
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 1Gi

    # GeoIP (optional — for location-based access policies)
    geoip:
      enabled: false
```

## Step 4: Inject Secret Values via ValuesFrom

To avoid putting secret references in the HelmRelease values directly, use Flux's `valuesFrom`:

```yaml
# Add to the HelmRelease spec
  valuesFrom:
    - kind: Secret
      name: authentik-secrets
      valuesKey: bootstrap-password
      targetPath: authentik.bootstrap_password
    - kind: Secret
      name: authentik-secrets
      valuesKey: bootstrap-token
      targetPath: authentik.bootstrap_token
    - kind: Secret
      name: authentik-secrets
      valuesKey: bootstrap-email
      targetPath: authentik.bootstrap_email
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/authentik/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: authentik
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/authentik
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2beta2
      kind: HelmRelease
      name: authentik
      namespace: authentik
```

## Step 6: Verify and Complete Setup

```bash
# Watch reconciliation
flux get helmreleases -n authentik --watch

# Check all pods
kubectl get pods -n authentik
```

Navigate to `https://auth.example.com/if/flow/initial-setup/`. Authentik will prompt you to set the admin password on first run. After logging in, go to **Applications > Providers** to create your first OIDC provider.

## Step 7: Create an OIDC Provider for Grafana (Example)

In the Authentik UI:

1. Go to **Applications > Providers > Create > OAuth2/OpenID Provider**
2. Set **Name**: Grafana, **Client Type**: Confidential
3. Copy the **Client ID** and **Client Secret**
4. Create an **Application** linked to this provider

In your Grafana HelmRelease values:

```yaml
grafana.ini:
  auth.generic_oauth:
    enabled: true
    name: Authentik
    client_id: <client-id-from-authentik>
    client_secret: <client-secret-from-authentik>
    scopes: openid email profile
    auth_url: https://auth.example.com/application/o/grafana/authorize/
    token_url: https://auth.example.com/application/o/token/
    api_url: https://auth.example.com/application/o/userinfo/
```

## Best Practices

- Use Authentik's **Blueprints** feature to export and import provider, application, and flow configurations as YAML files—making Authentik configuration itself a GitOps artifact.
- Enable **MFA** enforcement at the flow level for admin accounts and sensitive applications.
- Use the **LDAP outpost** to expose Authentik as an LDAP server for legacy applications that do not support OIDC.
- Configure Authentik's **SCIM** provider to automatically provision and deprovision users in downstream applications.
- Monitor Authentik with the built-in Prometheus metrics endpoint at `/metrics`.

## Conclusion

Authentik is now deployed on Kubernetes and managed by Flux CD. Your organization has a fully self-hosted identity platform capable of SSO, MFA, OIDC, SAML, and LDAP—all without a third-party SaaS dependency. Flux ensures the deployment stays in sync with Git, and Authentik's Blueprints feature lets you extend GitOps to the identity provider's own configuration.
