# How to Use Docker Hub as OCI Source for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Docker Hub, OCI

Description: Learn how to configure ArgoCD to pull Helm charts from Docker Hub as an OCI registry, including authentication setup, rate limit handling, and best practices for production use.

---

Docker Hub has supported OCI artifacts since 2020, which means you can push and pull Helm charts using the same registry where you already store your container images. If you are already using Docker Hub for your images, adding Helm chart distribution through OCI keeps your artifact management consolidated in one place.

This guide covers setting up ArgoCD to consume Helm charts from Docker Hub using the OCI protocol, including authentication, rate limits, and practical deployment patterns.

## Why Docker Hub for OCI Charts

Docker Hub is the most widely used container registry. Using it as your Helm chart OCI registry makes sense when:

- Your team already has Docker Hub accounts and workflows
- You want to keep container images and Helm charts in the same registry
- You are distributing open-source Helm charts that benefit from Docker Hub's CDN
- You want a simple setup without managing your own registry infrastructure

The main consideration is Docker Hub's pull rate limits. Unauthenticated pulls are limited to 100 per 6 hours, and free authenticated accounts get 200 per 6 hours. For production ArgoCD setups, a paid Docker Hub subscription eliminates rate limit concerns.

## Prerequisites

- ArgoCD v2.8 or later (for stable OCI support)
- Docker CLI installed locally for pushing charts
- Helm CLI v3.8 or later (OCI support is GA)
- A Docker Hub account

## Pushing Helm Charts to Docker Hub

Before ArgoCD can pull charts, you need to push them to Docker Hub.

```bash
# Log in to Docker Hub with Helm
helm registry login registry-1.docker.io -u myusername

# Package your chart
helm package ./my-chart
# Output: Successfully packaged chart and saved it to: my-chart-1.0.0.tgz

# Push to Docker Hub
# Format: oci://registry-1.docker.io/<namespace>
helm push my-chart-1.0.0.tgz oci://registry-1.docker.io/myusername
```

Verify the push:

```bash
# Pull the chart back to verify
helm pull oci://registry-1.docker.io/myusername/my-chart --version 1.0.0
```

Note the registry URL format. Docker Hub's OCI-compatible endpoint is `registry-1.docker.io`, not `docker.io`. While `docker.io` works for container images, the OCI distribution spec requires the full registry endpoint.

## Configuring ArgoCD with Docker Hub Credentials

### Method 1: ArgoCD CLI

The simplest way to add Docker Hub as a repository source:

```bash
# Add Docker Hub as an OCI Helm repository
argocd repo add registry-1.docker.io \
  --type helm \
  --name dockerhub \
  --enable-oci \
  --username myusername \
  --password "<docker-hub-access-token>"
```

Always use a Docker Hub access token instead of your account password. Create one at https://hub.docker.com/settings/security under "Access Tokens".

### Method 2: Kubernetes Secret

For declarative configuration, create a Secret in the ArgoCD namespace:

```yaml
# dockerhub-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: dockerhub
  url: registry-1.docker.io
  enableOCI: "true"
  username: "myusername"
  password: "<docker-hub-access-token>"
```

```bash
kubectl apply -f dockerhub-repo-secret.yaml
```

### Method 3: Repository Credential Templates

If you have multiple Docker Hub repositories, use a credential template to avoid repeating credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: helm
  url: registry-1.docker.io
  enableOCI: "true"
  username: "myusername"
  password: "<docker-hub-access-token>"
```

With this template in place, any ArgoCD application referencing `registry-1.docker.io` will automatically use these credentials.

## Creating an ArgoCD Application

Now create an application that pulls from Docker Hub:

```yaml
# dockerhub-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    chart: myusername/my-chart
    repoURL: registry-1.docker.io
    targetRevision: 1.0.0
    helm:
      releaseName: my-app
      values: |
        replicaCount: 2
        service:
          type: ClusterIP
          port: 80
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```bash
kubectl apply -f dockerhub-app.yaml
```

The `chart` field uses the format `<namespace>/<chart-name>`, where namespace is your Docker Hub username or organization name.

## Using Public Charts from Docker Hub

Many open-source projects now publish their Helm charts to Docker Hub as OCI artifacts. You can use these without authentication (subject to rate limits):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-public
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: dockerhub-public
  url: registry-1.docker.io
  enableOCI: "true"
```

Even for public charts, adding authenticated credentials is recommended to avoid rate limiting during frequent syncs.

## Handling Docker Hub Rate Limits

Docker Hub enforces pull rate limits that can affect ArgoCD's ability to sync applications:

| Account Type | Rate Limit |
|---|---|
| Unauthenticated | 100 pulls / 6 hours |
| Free (authenticated) | 200 pulls / 6 hours |
| Pro | 5,000 pulls / day |
| Team | 5,000 pulls / day |
| Business | Unlimited |

ArgoCD periodically refreshes application state, which counts against your rate limit. Here are strategies to manage this:

### Increase Refresh Intervals

```yaml
# In argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase the default refresh interval (default is 3 minutes)
  timeout.reconciliation: "300s"
```

### Use Webhook-Based Refresh

Instead of polling, configure Docker Hub webhooks to trigger ArgoCD refreshes only when charts actually change:

```bash
# Create a webhook in Docker Hub pointing to:
# https://argocd.example.com/api/webhook

# ArgoCD will automatically refresh when notified
```

### Monitor Rate Limit Headers

Check your current rate limit status:

```bash
# Check rate limit status with a HEAD request
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:myusername/my-chart:pull" | jq -r '.token')

curl -I -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/myusername/my-chart/manifests/1.0.0

# Look for these headers:
# RateLimit-Limit: 200;w=21600
# RateLimit-Remaining: 195;w=21600
```

## Using Docker Hub Organizations

For team workflows, push charts under your Docker Hub organization:

```bash
# Push chart under organization namespace
helm push my-chart-1.0.0.tgz oci://registry-1.docker.io/my-org

# Reference in ArgoCD application
# chart: my-org/my-chart
```

This allows you to manage access at the organization level and share charts across team members.

## Versioning Strategy

Docker Hub OCI artifacts support semantic versioning. ArgoCD can track specific versions or use version constraints:

```yaml
# Pin to exact version
targetRevision: 1.2.3

# Use a version constraint (requires ArgoCD 2.10+)
targetRevision: ">=1.0.0 <2.0.0"

# Track latest (not recommended for production)
targetRevision: "*"
```

For production, always pin to an exact version and update deliberately through your GitOps workflow.

## Troubleshooting

**"repository not found" error**: Verify the chart path. Docker Hub requires the full path including namespace: `myusername/my-chart`, not just `my-chart`.

**"unauthorized" error**: Make sure you are using `registry-1.docker.io` as the URL, not `docker.io`. Also check that your access token has not expired.

**Rate limit exceeded**: Check the rate limit headers as shown above. Switch to authenticated pulls or upgrade your Docker Hub plan.

**Chart version not found**: List available versions:

```bash
# Check available tags via the API
curl -s "https://registry-1.docker.io/v2/myusername/my-chart/tags/list" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Summary

Docker Hub works well as an OCI registry for ArgoCD Helm charts, especially for teams that already use it for container images. The key things to remember are: use `registry-1.docker.io` as the endpoint, always authenticate to avoid rate limits, and use access tokens rather than passwords. For high-frequency environments, consider a paid Docker Hub plan or a dedicated OCI registry to eliminate rate limit concerns entirely.
