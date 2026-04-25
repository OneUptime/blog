# How to Add GitHub Container Registry (GHCR) to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitHub, GHCR, Registry, DevOps

Description: Learn how to configure GitHub Container Registry (GHCR) in Portainer to deploy images built by GitHub Actions workflows.

## Introduction

GitHub Container Registry (GHCR) is GitHub's native container registry integrated with GitHub packages. It allows you to store and share Docker images alongside your source code. Combined with GitHub Actions for building images and Portainer for deploying them, GHCR enables a complete GitOps workflow on GitHub's infrastructure.

## Prerequisites

- Portainer CE or BE installed (Portainer Business Edition on a non-Edge environment is required if you want webhook-triggered redeploys)
- A GitHub account with a repository
- Images pushed to GHCR (or a GitHub Actions workflow to build them)
- Admin access to Portainer

## GHCR URL Format

All GHCR images are hosted at `ghcr.io`:

```text
ghcr.io/{owner}/{image-name}:{tag}
# Examples:

ghcr.io/myusername/myapp:latest
ghcr.io/myorg/myapp/api:v2.0
ghcr.io/myorg/myapp/frontend:latest
```

## Step 1: Create a GitHub Personal Access Token

1. Go to **GitHub Settings** (click profile photo → Settings)
2. Click **Developer settings** at the bottom
3. Click **Personal access tokens → Tokens (classic)**
4. Click **Generate new token (classic)**
5. Configure:
   ```text
   Note:             portainer-ghcr
   Expiration:       90 days (or custom)
   Scopes:           [x] read:packages
   ```
6. Click **Generate token**
7. Copy the token immediately

## Step 2: Add GHCR in Portainer

1. Go to **Registries** in Portainer
2. Click **+ Add registry**
3. Select **Custom registry**
4. Fill in:

```text
Name:      GitHub Container Registry
URL:       ghcr.io
Username:  your-github-username
Password:  ghp_xxxxxxxxxxxxxxxxxxxxxxxxxx   (your PAT)
```

5. Click **Add registry**

## Step 3: Set Up GitHub Actions to Build and Push to GHCR

```yaml
# .github/workflows/build-and-push.yml
name: Build and Push to GHCR

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write    # Required to push to GHCR

    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Log in to Container Registry
        uses: docker/login-action@v4
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}    # Built-in, no setup needed

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=sha-

      - name: Build and push Docker image
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Optional: trigger a Portainer stack webhook after a successful push (Business Edition, non-Edge only)
      - name: Deploy to Portainer
        run: |
          curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}" \
            --fail \
            --max-time 30
```

## Step 4: Make Images Public or Manage Visibility

By default, newly published GHCR packages are private. If a package is linked to a repository before publishing, it inherits the repository's access permissions by default, but not its visibility:

- **Public package** → No auth needed to pull
- **Private package** → Auth required

To change package visibility:

1. Go to **GitHub → Packages** (in your profile or organization)
2. Click on the package (image)
3. Go to **Package settings → Danger zone**
4. Change visibility to Public or Private

## Step 5: Use GHCR Images in Portainer Stacks

```yaml
version: "3.8"

services:
  app:
    image: ghcr.io/myorg/myapp:latest
    # Portainer uses stored GHCR credentials for private images
    # No auth needed for public images

  api:
    image: ghcr.io/myorg/myapp-api:v2.0.1
    ports:
      - "3000:3000"
```

## Step 6: Using GitHub Actions GITHUB_TOKEN for Builds

For build workflows, you don't need a PAT - the built-in `GITHUB_TOKEN` works:

```yaml
# In GitHub Actions workflow (for pushing to GHCR during build)
- uses: docker/login-action@v4
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}  # Auto-generated, no setup needed
```

However, for Portainer to pull private images, you need a separate PAT with `read:packages` scope.

## Step 7: Organization Image Access

For organization GHCR images:

```text
ghcr.io/myorg/myimage:latest
```

Ensure the PAT belongs to a user with at least `read` access to the organization packages.

If the organization uses SAML SSO, authorize the PAT for the organization after creating it.

## Troubleshooting

### Permission Denied (403)

```text
Error: denied: denied
```

- Verify the PAT has `read:packages` scope
- Ensure the user has access to the package
- For organization images, confirm the organization has granted access
- If the organization uses SAML SSO, authorize the PAT for that organization

### Image Not Found (404)

```text
Error: manifest unknown
```

- Verify the image name and tag
- Check that the image was successfully pushed to GHCR
- Confirm the package exists in **GitHub → Packages**

### PAT Expired

- Regenerate the PAT in GitHub settings
- Update the registry credentials in Portainer

## Conclusion

GitHub Container Registry integration with Portainer creates a seamless GitHub-native deployment workflow. Use `GITHUB_TOKEN` in GitHub Actions for secure image builds with zero secrets management, then use a minimal-scope PAT in Portainer for pulling private images during deployment. This approach keeps all your code, CI/CD, and container images in one ecosystem.
