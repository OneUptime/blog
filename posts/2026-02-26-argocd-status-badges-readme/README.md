# How to Embed ArgoCD Status Badges in README Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitHub, Documentation

Description: Learn how to embed ArgoCD application status badges in GitHub, GitLab, and Bitbucket README files to show real-time deployment status alongside your source code documentation.

---

Embedding ArgoCD status badges in your repository README files is one of the easiest ways to give your team instant visibility into deployment status. When someone visits the repository, they can immediately see whether the application is synced, healthy, and which version is deployed - all without opening the ArgoCD UI.

This guide covers how to set up badges for GitHub, GitLab, and Bitbucket READMEs, handle caching issues, and create informative badge layouts.

## Prerequisites

Before embedding badges, make sure the ArgoCD badge endpoint is enabled:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  statusbadge.enabled: "true"
```

The ArgoCD server must be accessible from where the badges will be rendered (e.g., from GitHub's image proxy for GitHub READMEs).

## Basic Badge Syntax

### Markdown (GitHub, GitLab, Bitbucket)

```markdown
![ArgoCD Sync Status](https://argocd.example.com/api/badge?name=my-app&revision=true)
```

### With a Link to the ArgoCD Application

```markdown
[![ArgoCD Status](https://argocd.example.com/api/badge?name=my-app&revision=true)](https://argocd.example.com/applications/my-app)
```

### reStructuredText (for Python projects)

```rst
.. image:: https://argocd.example.com/api/badge?name=my-app&revision=true
   :target: https://argocd.example.com/applications/my-app
   :alt: ArgoCD Sync Status
```

### AsciiDoc

```asciidoc
image:https://argocd.example.com/api/badge?name=my-app&revision=true[ArgoCD Status, link="https://argocd.example.com/applications/my-app"]
```

## Complete README Badge Section

Here is a production-ready badge section for a README:

```markdown
# Payment Service

[![ArgoCD Production](https://argocd.example.com/api/badge?name=payment-service-prod&revision=true)](https://argocd.example.com/applications/payment-service-prod)
[![ArgoCD Staging](https://argocd.example.com/api/badge?name=payment-service-staging&revision=true)](https://argocd.example.com/applications/payment-service-staging)
[![Build Status](https://github.com/myorg/payment-service/actions/workflows/ci.yml/badge.svg)](https://github.com/myorg/payment-service/actions)

A microservice for processing payments.

## Deployment Status

| Environment | Status | Cluster |
|-------------|--------|---------|
| Production | [![Prod](https://argocd.example.com/api/badge?name=payment-service-prod&revision=true)](https://argocd.example.com/applications/payment-service-prod) | us-east-1 |
| Staging | [![Staging](https://argocd.example.com/api/badge?name=payment-service-staging&revision=true)](https://argocd.example.com/applications/payment-service-staging) | us-east-1-staging |
| Development | [![Dev](https://argocd.example.com/api/badge?name=payment-service-dev&revision=true)](https://argocd.example.com/applications/payment-service-dev) | dev-cluster |
```

## Multi-Environment Badge Table

For projects deployed across multiple environments and regions:

```markdown
## Deployment Status

### US Region

| Service | Production | Staging | Dev |
|---------|-----------|---------|-----|
| API | [![](https://argocd.example.com/api/badge?name=api-prod-us)](https://argocd.example.com/applications/api-prod-us) | [![](https://argocd.example.com/api/badge?name=api-staging-us)](https://argocd.example.com/applications/api-staging-us) | [![](https://argocd.example.com/api/badge?name=api-dev-us)](https://argocd.example.com/applications/api-dev-us) |
| Worker | [![](https://argocd.example.com/api/badge?name=worker-prod-us)](https://argocd.example.com/applications/worker-prod-us) | [![](https://argocd.example.com/api/badge?name=worker-staging-us)](https://argocd.example.com/applications/worker-staging-us) | [![](https://argocd.example.com/api/badge?name=worker-dev-us)](https://argocd.example.com/applications/worker-dev-us) |

### EU Region

| Service | Production | Staging |
|---------|-----------|---------|
| API | [![](https://argocd.example.com/api/badge?name=api-prod-eu)](https://argocd.example.com/applications/api-prod-eu) | [![](https://argocd.example.com/api/badge?name=api-staging-eu)](https://argocd.example.com/applications/api-staging-eu) |
| Worker | [![](https://argocd.example.com/api/badge?name=worker-prod-eu)](https://argocd.example.com/applications/worker-prod-eu) | [![](https://argocd.example.com/api/badge?name=worker-staging-eu)](https://argocd.example.com/applications/worker-staging-eu) |
```

## GitHub-Specific Considerations

### Image Proxy Caching

GitHub proxies all external images through `camo.githubusercontent.com`. This proxy caches images aggressively, which means badge updates can be delayed by several minutes.

To work around this:

```markdown
<!-- GitHub may cache this image for several minutes -->
![Status](https://argocd.example.com/api/badge?name=my-app)
```

There is no reliable way to force GitHub to refresh cached images. The proxy respects standard HTTP cache headers, so configuring your ArgoCD server to send short cache headers helps:

```yaml
# If using Nginx Ingress in front of ArgoCD
annotations:
  nginx.ingress.kubernetes.io/configuration-snippet: |
    if ($request_uri ~* "/api/badge") {
      add_header Cache-Control "no-cache, no-store, must-revalidate" always;
      add_header Pragma "no-cache" always;
      add_header Expires "0" always;
    }
```

### GitHub Actions Badge Alongside ArgoCD

Combine CI and CD badges for a complete picture:

```markdown
# My Application

<!-- CI Badges -->
[![CI](https://github.com/myorg/my-app/actions/workflows/ci.yml/badge.svg)](https://github.com/myorg/my-app/actions/workflows/ci.yml)
[![Tests](https://github.com/myorg/my-app/actions/workflows/test.yml/badge.svg)](https://github.com/myorg/my-app/actions/workflows/test.yml)

<!-- CD Badges (ArgoCD) -->
[![Production Deploy](https://argocd.example.com/api/badge?name=my-app-prod&revision=true)](https://argocd.example.com/applications/my-app-prod)
[![Staging Deploy](https://argocd.example.com/api/badge?name=my-app-staging&revision=true)](https://argocd.example.com/applications/my-app-staging)
```

## GitLab-Specific Considerations

GitLab also proxies external images but with different caching behavior. GitLab generally refreshes images faster than GitHub.

For GitLab README files, the syntax is the same standard Markdown:

```markdown
[![ArgoCD Status](https://argocd.example.com/api/badge?name=my-app&revision=true)](https://argocd.example.com/applications/my-app)
```

### Combining with GitLab CI Badges

```markdown
[![pipeline status](https://gitlab.example.com/myorg/my-app/badges/main/pipeline.svg)](https://gitlab.example.com/myorg/my-app/-/pipelines)
[![coverage report](https://gitlab.example.com/myorg/my-app/badges/main/coverage.svg)](https://gitlab.example.com/myorg/my-app/-/commits/main)
[![ArgoCD Deploy](https://argocd.example.com/api/badge?name=my-app-prod&revision=true)](https://argocd.example.com/applications/my-app-prod)
```

## Bitbucket-Specific Considerations

Bitbucket's README rendering supports standard Markdown image syntax:

```markdown
[![ArgoCD Status](https://argocd.example.com/api/badge?name=my-app)](https://argocd.example.com/applications/my-app)
```

Bitbucket may have stricter Content Security Policy rules. Ensure your ArgoCD server sends proper CORS headers if badges do not render.

## Automating Badge Generation

For repositories with many applications, you can automate README badge generation:

```bash
#!/bin/bash
# generate-badges.sh
# Generate a badge table for all ArgoCD applications in a project

ARGOCD_URL="https://argocd.example.com"
PROJECT="my-project"

echo "## Deployment Status"
echo ""
echo "| Application | Status |"
echo "|-------------|--------|"

# Get all applications in the project
argocd app list -p "$PROJECT" -o name | while read app; do
  echo "| $app | [![Status]($ARGOCD_URL/api/badge?name=$app&revision=true)]($ARGOCD_URL/applications/$app) |"
done
```

Run this script and paste the output into your README:

```bash
./generate-badges.sh >> README.md
```

## Handling Private ArgoCD Instances

If your ArgoCD instance is not publicly accessible, badges will not render in public repositories. Options:

**Option 1: Use a badge proxy**

Set up a small proxy service that fetches badge data from your internal ArgoCD and serves it publicly:

```python
# Simple badge proxy (Flask example)
from flask import Flask, redirect
import requests

app = Flask(__name__)

@app.route('/badge/<app_name>')
def badge(app_name):
    # Fetch from internal ArgoCD
    response = requests.get(
        f'https://argocd.internal.example.com/api/badge?name={app_name}&revision=true',
        headers={'Authorization': f'Bearer {ARGOCD_TOKEN}'},
        verify=True
    )
    return response.content, 200, {'Content-Type': 'image/svg+xml'}
```

**Option 2: Use shields.io with a custom endpoint**

Create a custom shields.io badge that queries ArgoCD:

```markdown
![ArgoCD Status](https://img.shields.io/endpoint?url=https://badge-api.example.com/argocd/my-app)
```

**Option 3: Use static badges updated by CI**

Generate static SVG badges in your CI pipeline and commit them to the repository:

```bash
# In your CI pipeline
STATUS=$(argocd app get my-app -o json | jq -r '.status.sync.status')
HEALTH=$(argocd app get my-app -o json | jq -r '.status.health.status')

# Generate a shields.io badge URL and download it
curl -o badges/deploy-status.svg \
  "https://img.shields.io/badge/deploy-${STATUS}-$([ $STATUS = 'Synced' ] && echo 'green' || echo 'orange').svg"
```

## Troubleshooting

**Badge shows "Unknown"**: Application name is incorrect or the application does not exist. Double-check the `name` parameter.

**Badge returns an error image**: The ArgoCD server is unreachable from where the image is being rendered. For GitHub, the server must be publicly accessible.

**Badge is stale**: Image proxy caching. Wait a few minutes or configure cache headers on the ArgoCD server.

**Badge does not render at all**: Check browser console for CORS or Content Security Policy errors. Ensure the ArgoCD server allows cross-origin image requests.

## Conclusion

ArgoCD status badges in README files bridge the gap between your source code repository and your deployment status. They are simple to set up, require no special tooling, and provide instant visibility to anyone visiting the repository. Start with a simple single badge and expand to multi-environment tables as your needs grow. For more on badges and their configuration, see our guide on [using status badges for ArgoCD applications](https://oneuptime.com/blog/post/2026-02-26-argocd-status-badges/view).
