# How to Deploy OAuth2 Proxy with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OAuth2 Proxy, Authentication, Ingress, Security

Description: Deploy OAuth2 Proxy authentication middleware to Kubernetes using Flux CD to add SSO authentication in front of any web application.

---

## Introduction

OAuth2 Proxy is a reverse proxy that sits in front of web applications and enforces authentication using external OAuth2 or OIDC providers—GitHub, Google, Azure AD, Keycloak, Dex, and many others. It acts as an authentication gateway: unauthenticated requests are redirected to the identity provider, and only after successful login does the proxy forward the request to the upstream application.

The power of OAuth2 Proxy is its universality. You can add SSO authentication to any HTTP service—Grafana, Kubernetes Dashboard, internal tools, even static sites—without modifying the application's code. In a Kubernetes environment, it integrates as an Ingress `auth-url` annotation or as a sidecar proxy.

Managing OAuth2 Proxy with Flux CD means your authentication middleware configuration is version-controlled. Adding a new allowed domain, rotating a client secret, or updating the proxy version are all Git commits that Flux applies without downtime.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- An ingress-nginx Ingress controller (for `auth-url` annotation support)
- An OAuth2/OIDC provider (this guide uses GitHub)
- `flux` and `kubectl` CLIs configured

## Step 1: Register a GitHub OAuth App

In your GitHub account go to **Settings > Developer Settings > OAuth Apps > New OAuth App**:

- **Application name**: My Kubernetes OAuth2 Proxy
- **Homepage URL**: `https://app.example.com`
- **Authorization callback URL**: `https://oauth2.example.com/oauth2/callback`

Note the **Client ID** and **Client Secret**.

## Step 2: Create Namespace and Secrets

```bash
kubectl create namespace oauth2-proxy

kubectl create secret generic oauth2-proxy-secret \
  --namespace oauth2-proxy \
  --from-literal=client-id=your_github_client_id \
  --from-literal=client-secret=your_github_client_secret \
  --from-literal=cookie-secret=$(openssl rand -base64 32 | tr -- '+/' '-_')
```

## Step 3: Add the OAuth2 Proxy Helm Repository

```yaml
# clusters/my-cluster/oauth2-proxy/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: oauth2-proxy
  namespace: flux-system
spec:
  url: https://oauth2-proxy.github.io/manifests
  interval: 12h
```

## Step 4: Deploy OAuth2 Proxy

```yaml
# clusters/my-cluster/oauth2-proxy/oauth2-proxy-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: oauth2-proxy
  namespace: oauth2-proxy
spec:
  interval: 10m
  chart:
    spec:
      chart: oauth2-proxy
      version: ">=7.0.0 <8.0.0"
      sourceRef:
        kind: HelmRepository
        name: oauth2-proxy
        namespace: flux-system
  values:
    config:
      # GitHub as the OAuth2 provider
      existingSecret: oauth2-proxy-secret

    extraArgs:
      # Provider settings
      provider: github
      github-org: my-github-org      # Restrict to this GitHub org
      email-domain: "*"              # Allow any email domain
      upstream: "file:///dev/null"   # No upstream — used in auth-url mode

      # Cookie settings
      cookie-secure: "true"
      cookie-refresh: "1h"
      cookie-expire: "168h"         # 7 days

      # Redirect URL (must match the GitHub OAuth App callback)
      redirect-url: https://oauth2.example.com/oauth2/callback

      # Skip authentication for health check endpoints
      skip-provider-button: "false"

    # Expose the proxy's service
    service:
      type: ClusterIP
      port: 4180

    ingress:
      enabled: true
      ingressClassName: nginx
      path: /oauth2
      hosts:
        - oauth2.example.com
      tls:
        - secretName: oauth2-proxy-tls
          hosts:
            - oauth2.example.com

    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 128Mi

    replicaCount: 2
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/oauth2-proxy/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: oauth2-proxy
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/oauth2-proxy
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 6: Protect an Application with Auth Annotations

Once OAuth2 Proxy is running, add authentication to any application using Ingress annotations:

```yaml
# Example: protecting an internal dashboard
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://oauth2.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://oauth2.example.com/oauth2/start?rd=$escaped_request_uri"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-Auth-Request-Email,X-Auth-Request-User"
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

With these annotations, any request to `app.example.com` that lacks a valid OAuth2 cookie is redirected to GitHub login.

## Best Practices

- Use `--github-team` instead of `--github-org` to restrict access to a specific team within the organization for finer-grained control.
- Set `--skip-auth-route` patterns for health check endpoints (`/healthz`, `/metrics`) to prevent authentication loops.
- Run at least two replicas and use a Redis backend (`--session-store-type=redis`) so session cookies remain valid during rolling updates.
- Rotate the `cookie-secret` periodically (it invalidates all existing sessions, so do it during a maintenance window).
- Use separate OAuth2 Proxy deployments for different security zones rather than a single shared instance.

## Conclusion

OAuth2 Proxy is now deployed on Kubernetes and managed by Flux CD. Any internal web application can be protected with GitHub (or another OIDC provider) authentication by adding two Ingress annotations—no application code changes required. Flux ensures the proxy configuration stays consistent with your Git-declared state, and secret rotation is as simple as updating a Kubernetes secret and committing the change.
