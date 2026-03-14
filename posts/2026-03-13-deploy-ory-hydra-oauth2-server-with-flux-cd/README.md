# How to Deploy Ory Hydra OAuth2 Server with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Ory Hydra, OAuth2, OpenID Connect, Authorization Server

Description: Deploy Ory Hydra OAuth2 and OpenID Connect server to Kubernetes using Flux CD for a cloud-native, GitOps-managed authorization server.

---

## Introduction

Ory Hydra is a certified OpenID Connect and OAuth2 server written in Go. Unlike Keycloak or Authentik, Hydra does not manage users or provide a login UI—instead, it delegates user authentication to your existing identity system and focuses solely on being a high-performance OAuth2 authorization server. This makes Hydra an excellent choice when you already have a user database and want to issue OAuth2 tokens without replacing your authentication infrastructure.

Hydra is cloud-native by design: it is stateless (state lives in PostgreSQL), supports horizontal scaling, and exposes Prometheus metrics out of the box. Flux CD manages the Hydra deployment and its PostgreSQL dependency declaratively, giving you a version-controlled OAuth2 infrastructure that can be upgraded with a pull request.

This guide deploys Ory Hydra with PostgreSQL using the official Ory Helm chart managed by Flux CD.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- An Ingress controller with TLS termination
- An existing identity service that handles user login (the "Login and Consent App")
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace hydra

# System secret for cookie encryption and HMAC signing
kubectl create secret generic hydra-secrets \
  --namespace hydra \
  --from-literal=secretsSystem=$(openssl rand -hex 32) \
  --from-literal=secretsCookie=$(openssl rand -hex 32) \
  --from-literal=postgres-password=hydra_pg_pass
```

## Step 2: Add the Ory Helm Repository

```yaml
# clusters/my-cluster/hydra/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ory
  namespace: flux-system
spec:
  url: https://k8s.ory.sh/helm/charts
  interval: 12h
```

## Step 3: Deploy PostgreSQL

```yaml
# clusters/my-cluster/hydra/postgresql-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: hydra-postgresql
  namespace: hydra
spec:
  interval: 10m
  chart:
    spec:
      chart: postgresql
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    auth:
      database: hydra
      username: hydra
      existingSecret: hydra-secrets
      secretKeys:
        userPasswordKey: postgres-password
    primary:
      persistence:
        size: 10Gi
```

## Step 4: Deploy Ory Hydra

```yaml
# clusters/my-cluster/hydra/hydra-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: hydra
  namespace: hydra
spec:
  interval: 10m
  dependsOn:
    - name: hydra-postgresql
  chart:
    spec:
      chart: hydra
      version: ">=0.40.0 <0.41.0"
      sourceRef:
        kind: HelmRepository
        name: ory
        namespace: flux-system
  values:
    hydra:
      config:
        # Database connection (Hydra will auto-migrate on startup)
        dsn: postgres://hydra:$(POSTGRES_PASSWORD)@hydra-postgresql:5432/hydra?sslmode=disable

        # URLs for the Login and Consent App
        urls:
          self:
            issuer: https://hydra.example.com
          login: https://accounts.example.com/login
          consent: https://accounts.example.com/consent
          logout: https://accounts.example.com/logout

        # Token lifespans
        ttl:
          access_token: 1h
          id_token: 1h
          refresh_token: 720h   # 30 days

        # Secrets — loaded from environment variables
        secrets:
          system:
            - $(SECRETS_SYSTEM)
          cookie:
            - $(SECRETS_COOKIE)

        # OAuth2 settings
        oauth2:
          expose_internal_errors: false

        # CORS for the public endpoint
        serve:
          public:
            cors:
              enabled: true
              allowed_origins:
                - https://app.example.com
          admin:
            cors:
              enabled: false

    # Load secrets from Kubernetes secret as env vars
    deployment:
      extraEnv:
        - name: SECRETS_SYSTEM
          valueFrom:
            secretKeyRef:
              name: hydra-secrets
              key: secretsSystem
        - name: SECRETS_COOKIE
          valueFrom:
            secretKeyRef:
              name: hydra-secrets
              key: secretsCookie
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: hydra-secrets
              key: postgres-password

    # Run database migrations as a Job before deploying
    hydra:
      automigration:
        enabled: true

    # Public endpoint ingress (token issuance, authorization)
    ingress:
      public:
        enabled: true
        ingressClassName: nginx
        hosts:
          - host: hydra.example.com
            paths:
              - path: /
                pathType: Prefix
        tls:
          - secretName: hydra-tls
            hosts:
              - hydra.example.com
      # Admin endpoint — do NOT expose publicly
      admin:
        enabled: false

    replicaCount: 2

    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/hydra/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: hydra
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/hydra
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: hydra
      namespace: hydra
```

## Step 6: Register an OAuth2 Client

Use the Hydra admin API (accessible inside the cluster) to register a client:

```bash
# Port-forward the admin endpoint
kubectl port-forward -n hydra svc/hydra-admin 4445:4445 &

# Register a confidential client
curl -s -X POST http://localhost:4445/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "my-app",
    "client_name": "My Application",
    "client_secret": "my-app-secret",
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "redirect_uris": ["https://app.example.com/callback"],
    "scope": "openid email profile offline_access",
    "token_endpoint_auth_method": "client_secret_post"
  }' | jq .
```

## Step 7: Verify OIDC Discovery

```bash
curl https://hydra.example.com/.well-known/openid-configuration | jq .
```

## Best Practices

- Never expose the Hydra admin endpoint outside the cluster. Keep `ingress.admin.enabled: false` and access it via `kubectl port-forward`.
- Use Hydra's `consent skip` feature for trusted first-party applications to avoid showing a consent screen.
- Enable Jaeger or OpenTelemetry tracing in `hydra.config.tracing` to debug slow token exchange flows.
- Rotate secrets by adding a new secret to the `secrets.system` array before removing the old one—Hydra supports multiple secrets for zero-downtime rotation.
- Use Ory Oathkeeper (API gateway) alongside Hydra for per-request token validation at the ingress layer.

## Conclusion

Ory Hydra is now deployed on Kubernetes and managed by Flux CD. Your organization has a cloud-native, standards-compliant OAuth2 and OIDC authorization server that scales horizontally and integrates with your existing login infrastructure. Adding new OAuth2 clients, rotating secrets, or upgrading Hydra are all pull-request workflows that Flux applies automatically.
