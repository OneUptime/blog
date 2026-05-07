# How to Add GitHub Container Registry (GHCR) to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitHub, GHCR, Container Registry, CI/CD

Description: Learn how to connect GitHub Container Registry (ghcr.io) to Portainer for pulling images built with GitHub Actions.

## Overview

GitHub Container Registry (GHCR) at `ghcr.io` allows you to publish container images alongside your GitHub repositories. It integrates with GitHub Actions for automated builds. Portainer can authenticate with GHCR using a Personal Access Token (classic).

## Creating a GitHub Personal Access Token

1. Go to **GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Select scopes based on how you will add the registry in Portainer:
   - `read:packages` - for a **Custom registry** used to pull private images
   - `write:packages`, `delete:packages`, and `repo` - for Portainer Business Edition's **GitHub** registry provider
4. Generate and copy the token.

## Adding GHCR to Portainer

1. Go to **Registries** and click **Add registry**.
2. Select **Custom registry**. In Portainer Business Edition, you can also select **GitHub**.
3. Enter the required details:
   - For **Custom registry**: **Registry URL** `ghcr.io`, your GitHub username, and your Personal Access Token (classic)
   - For **GitHub**: your GitHub username and Personal Access Token (classic); if the package belongs to an organization, enable **Use organisation registry** and enter the organization name
4. Click **Add registry**.

## Testing GHCR Authentication

```bash
# Log in to GHCR via Docker CLI

echo $CR_PAT | docker login ghcr.io \
  -u your-github-username \
  --password-stdin

# Pull an image to confirm access
docker pull ghcr.io/your-org/your-image:latest
```

## Using GHCR in a Stack Compose File

```yaml
services:
  app:
    # Portainer uses the stored GHCR credentials to pull this image
    image: ghcr.io/your-org/your-app:v1.2.0
    deploy:
      replicas: 2
```

## Building and Pushing to GHCR with GitHub Actions

```yaml
# .github/workflows/build-push.yml
name: Build and Push to GHCR

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}/app:latest
```

## Making Packages Public

By default, packages pushed to GHCR are private. To make them public:

1. Go to the package on GitHub.
2. Click **Package settings**.
3. Scroll to **Danger Zone** and click **Change visibility**.

## Conclusion

GHCR combined with GitHub Actions provides a seamless build-push-deploy pipeline. Adding GHCR credentials to Portainer closes the loop by enabling automatic image pulls during stack deployments.
