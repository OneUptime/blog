# How to Deploy Dex OIDC Provider with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Dex, OIDC, Identity Provider, Authentication

Description: Deploy Dex OpenID Connect identity provider to Kubernetes using Flux CD for GitOps-managed federated authentication across your infrastructure.

---

## Introduction

Dex is a federated identity provider and OpenID Connect (OIDC) server developed by the Cloud Native Computing Foundation. Rather than managing its own user database, Dex acts as a bridge—it accepts login requests and delegates authentication to upstream identity providers such as GitHub, Google, LDAP, SAML, or Keycloak. Downstream applications receive standard OIDC tokens they can verify, regardless of which upstream provider the user logged in through.

Dex is particularly popular in Kubernetes environments because it is lightweight, native to the cloud-native ecosystem, and integrates directly with tools like `kubectl` (via OIDC tokens), ArgoCD, Grafana, and Harbor. Flux CD manages the Dex deployment declaratively, so adding a new connector—say, a corporate LDAP directory—is a Git pull request rather than a manual configuration change.

This guide deploys Dex using the official Helm chart with GitHub and a static password connector configured via Flux CD.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- An Ingress controller with TLS termination
- A GitHub OAuth App (Client ID and Secret) for the GitHub connector
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace dex

# GitHub OAuth App credentials
kubectl create secret generic dex-connectors-secret \
  --namespace dex \
  --from-literal=GITHUB_CLIENT_ID=your_github_client_id \
  --from-literal=GITHUB_CLIENT_SECRET=your_github_client_secret

# Static client secret for a downstream application (e.g., Grafana)
kubectl create secret generic dex-client-secrets \
  --namespace dex \
  --from-literal=grafana-client-secret=$(openssl rand -hex 16)
```

## Step 2: Add the Dex Helm Repository

```yaml
# clusters/my-cluster/dex/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: dex
  namespace: flux-system
spec:
  url: https://charts.dexidp.io
  interval: 12h
```

## Step 3: Deploy Dex via HelmRelease

```yaml
# clusters/my-cluster/dex/dex-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: dex
  namespace: dex
spec:
  interval: 10m
  chart:
    spec:
      chart: dex
      version: ">=0.17.0 <0.18.0"
      sourceRef:
        kind: HelmRepository
        name: dex
        namespace: flux-system
  values:
    config:
      # Dex's own issuer URL (must be HTTPS in production)
      issuer: https://dex.example.com

      storage:
        type: kubernetes
        config:
          inCluster: true   # Store tokens as Kubernetes CRDs

      web:
        http: 5556

      # OAuth2 configuration
      oauth2:
        skipApprovalScreen: true
        responseTypes:
          - code

      # Identity connectors
      connectors:
        - type: github
          id: github
          name: GitHub
          config:
            # Injected from the dex-connectors-secret
            clientID: $GITHUB_CLIENT_ID
            clientSecret: $GITHUB_CLIENT_SECRET
            redirectURI: https://dex.example.com/callback
            # Restrict login to specific GitHub org
            orgs:
              - name: my-github-org

      # Static passwords (useful for service accounts or testing)
      enablePasswordDB: true
      staticPasswords:
        - email: admin@example.com
          # bcrypt hash of "AdminPassword123!" — generate with: htpasswd -bnBC 10 "" password | tr -d ':\n'
          hash: "$2y$10$G7bFZk9yQQ4/cU3Hs6fzNeQqDSJH6l5Nfj9P8yRY0Qr8TXy1J9Mu"
          username: admin
          userID: "1234567890"

      # Static OAuth2 clients
      staticClients:
        - id: grafana
          name: Grafana
          redirectURIs:
            - https://grafana.example.com/login/generic_oauth
          secretEnv: GRAFANA_CLIENT_SECRET   # Injected from env

    # Inject secrets as environment variables
    envFrom:
      - secretRef:
          name: dex-connectors-secret
      - secretRef:
          name: dex-client-secrets

    ingress:
      enabled: true
      className: nginx
      hosts:
        - host: dex.example.com
          paths:
            - path: /
              pathType: Prefix
      tls:
        - secretName: dex-tls
          hosts:
            - dex.example.com

    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi

    # RBAC for in-cluster Kubernetes storage
    rbac:
      create: true
```

## Step 4: Create the Kustomization

```yaml
# clusters/my-cluster/dex/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: dex
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/dex
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2beta2
      kind: HelmRelease
      name: dex
      namespace: dex
```

## Step 5: Verify and Test OIDC Discovery

```bash
# Check Flux reconciliation
flux get helmreleases -n dex --watch

# Verify the discovery endpoint is accessible
curl https://dex.example.com/.well-known/openid-configuration | jq .
```

You should see the OIDC discovery document with `issuer`, `authorization_endpoint`, `token_endpoint`, and `jwks_uri` fields.

## Step 6: Configure Grafana to Use Dex

Add the following to your Grafana Helm values:

```yaml
# In your Grafana HelmRelease values
grafana.ini:
  auth.generic_oauth:
    enabled: true
    name: Dex
    client_id: grafana
    client_secret: ${GRAFANA_CLIENT_SECRET}
    scopes: openid email profile groups
    auth_url: https://dex.example.com/auth
    token_url: https://dex.example.com/token
    api_url: https://dex.example.com/userinfo
    role_attribute_path: "contains(groups[*], 'my-github-org:admins') && 'Admin' || 'Viewer'"
```

## Best Practices

- Use `storage.type: kubernetes` in development but switch to a PostgreSQL storage backend for high-availability production deployments.
- Rotate connector client secrets regularly; update the Kubernetes secret and Flux will roll the Dex pods.
- Add the `groups` scope to connectors to propagate group membership into OIDC tokens for role-based access control in downstream apps.
- Enable Dex metrics (`telemetry.http`) and scrape with Prometheus for token issuance and error rate monitoring.
- Use separate Dex instances per cluster to avoid a single point of failure for Kubernetes OIDC authentication.

## Conclusion

Dex is now deployed on Kubernetes and managed by Flux CD. Adding a new connector—whether LDAP, SAML, or another OAuth2 provider—is a Git pull request that updates the `config.connectors` list in your HelmRelease values. Downstream applications receive standard OIDC tokens, completely decoupled from the upstream identity provider, giving your team maximum flexibility in authentication architecture.
