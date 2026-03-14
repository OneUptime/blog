# Deploy Grafana with OAuth Authentication Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, OAuth, OIDC, Authentication, Flux CD, GitOps, Kubernetes, Security

Description: Configure Grafana with OAuth 2.0 / OIDC authentication (GitHub, Google, Okta, or any OIDC provider) on Kubernetes using Flux CD. Learn how to manage client secrets securely and map OAuth groups to Grafana roles.

---

## Introduction

Replacing Grafana's local user database with an OAuth 2.0 or OIDC provider gives your team single sign-on (SSO) and centralizes access control. Grafana supports GitHub, GitLab, Google, Azure AD, Okta, and any generic OIDC provider out of the box.

When deploying via Flux CD, client credentials are stored as encrypted Kubernetes Secrets and referenced in the HelmRelease using `valuesFrom`. This pattern keeps secrets out of your Helm values files while still allowing Flux to fully reconcile the deployment.

This guide demonstrates GitHub OAuth as the provider, with notes for adapting to generic OIDC providers like Okta or Keycloak.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- A registered OAuth application (GitHub OAuth App or OIDC client)
- `CLIENT_ID` and `CLIENT_SECRET` from the provider
- SOPS or Sealed Secrets for credential encryption
- `flux` and `kubectl` CLIs installed

## Step 1: Register the OAuth Application

For GitHub, create an OAuth App at https://github.com/settings/developers with:
- **Authorization callback URL**: `https://grafana.example.com/login/github`

Note the `Client ID` and `Client Secret` values.

## Step 2: Create the OAuth Credentials Secret

Store the OAuth client secret as a Kubernetes Secret encrypted with SOPS.

```yaml
# clusters/my-cluster/grafana/oauth-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: grafana-oauth-secret
  namespace: monitoring
type: Opaque
stringData:
  # GitHub (or other provider) OAuth Client ID and Secret — SOPS-encrypt before committing
  GF_AUTH_GITHUB_CLIENT_ID: "your-client-id-here"
  GF_AUTH_GITHUB_CLIENT_SECRET: "your-client-secret-here"
```

## Step 3: Add the Grafana HelmRepository

```yaml
# clusters/my-cluster/grafana/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 12h
  url: https://grafana.github.io/helm-charts
```

## Step 4: Deploy Grafana with OAuth via HelmRelease

Configure Grafana's `grafana.ini` to enable GitHub OAuth and map organizations to roles.

```yaml
# clusters/my-cluster/grafana/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: grafana
      version: ">=7.0.0 <8.0.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  # Inject OAuth credentials from the encrypted Secret
  valuesFrom:
    - kind: Secret
      name: grafana-oauth-secret
      valuesKey: GF_AUTH_GITHUB_CLIENT_ID
      targetPath: grafana.ini.auth\.github.client_id
    - kind: Secret
      name: grafana-oauth-secret
      valuesKey: GF_AUTH_GITHUB_CLIENT_SECRET
      targetPath: grafana.ini.auth\.github.client_secret
  values:
    grafana.ini:
      server:
        root_url: "https://grafana.example.com"
      auth:
        # Disable username/password login once OAuth is confirmed working
        disable_login_form: false
      auth.github:
        enabled: true
        # Allow only members of specific GitHub organizations
        allowed_organizations: "my-org"
        # Map GitHub team membership to Grafana roles
        role_attribute_path: "contains(groups[*], '@my-org/grafana-admins') && 'Admin' || contains(groups[*], '@my-org/grafana-editors') && 'Editor' || 'Viewer'"
        allow_sign_up: true

    # Expose the ingress for the OAuth redirect URI
    ingress:
      enabled: true
      hosts:
        - grafana.example.com
      annotations:
        cert-manager.io/cluster-issuer: letsencrypt-prod
      tls:
        - secretName: grafana-tls
          hosts:
            - grafana.example.com
```

## Step 5: Generic OIDC Configuration (Okta / Keycloak)

For generic OIDC providers, replace the GitHub section with the following.

```yaml
# Excerpt for generic OIDC (e.g., Okta)
grafana.ini:
  auth.generic_oauth:
    enabled: true
    name: "Okta"
    client_id: "${GF_AUTH_GITHUB_CLIENT_ID}"
    client_secret: "${GF_AUTH_GITHUB_CLIENT_SECRET}"
    scopes: "openid profile email groups"
    auth_url: "https://your-okta-domain.okta.com/oauth2/default/v1/authorize"
    token_url: "https://your-okta-domain.okta.com/oauth2/default/v1/token"
    api_url: "https://your-okta-domain.okta.com/oauth2/default/v1/userinfo"
    role_attribute_path: "contains(groups[*], 'grafana-admins') && 'Admin' || 'Viewer'"
```

## Best Practices

- Always encrypt OAuth credentials with SOPS or Sealed Secrets before committing.
- Use `role_attribute_path` with JMESPath expressions to automate role assignment from group claims.
- Test with `disable_login_form: false` initially; enable it only after confirming OAuth works.
- Set `allowed_organizations` or `allowed_domains` to restrict who can log in.
- Rotate the OAuth client secret periodically and update the Kubernetes Secret without downtime using a rolling restart.

## Conclusion

Grafana's OAuth integration, managed via Flux CD, delivers enterprise-grade SSO while keeping all credentials encrypted in Git. Combined with role mapping from provider groups, you eliminate manual user management and enforce least-privilege access automatically.
