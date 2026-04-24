# How to Set Up a Complete GitOps Pipeline with Portainer and GitHub (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, GitHub, CI/CD, Automation

Description: Learn how to build a complete end-to-end GitOps pipeline using GitHub, GitHub Actions, GitHub Container Registry, and Portainer for fully automated container deployments.

## Introduction

A complete GitOps pipeline with Portainer and GitHub means: code changes in GitHub trigger automated builds, the resulting images are stored in GitHub Container Registry (GHCR), and GitHub Actions updates the Portainer stack so the updated containers are redeployed. This guide walks through every component of this pipeline.

## Architecture Overview

```bash
Developer → Push to GitHub main branch
           ↓
       GitHub Actions
       ├── Run tests
       ├── Build Docker image
       └── Push to GHCR (ghcr.io)
           ↓
       Update Portainer stack via API
           ↓
       Portainer pulls image from GHCR
       └── Redeploys container
```

## Prerequisites

- GitHub account and repository
- Portainer CE or BE accessible from the internet (or GitHub Actions network)
- Domain with HTTPS for Portainer

## Step 1: Structure Your Repository

```text
my-app/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── src/                        # Application source code
├── Dockerfile                  # Container build definition
├── docker-compose.yml          # Portainer stack definition
├── .gitignore
└── README.md
```

## Step 2: Write the Dockerfile

```dockerfile
# Dockerfile - Multi-stage build

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

## Step 3: Create the Docker Compose Stack File

```yaml
# docker-compose.yml - Portainer stack definition
services:
  app:
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER}/my-app:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

## Step 4: Configure GitHub Repository Settings

### Required Secrets

Go to **Settings** → **Secrets and variables** → **Actions**:

| Secret | Value |
|--------|-------|
| `PORTAINER_API_KEY` | API access token |
| `PORTAINER_URL` | https://portainer.example.com |

### Workflow Permissions

The workflow below grants the `GITHUB_TOKEN` the permissions it needs at the job level:

- `contents: read`
- `packages: write`

## Step 5: Create the Complete CI/CD Workflow

```yaml
# .github/workflows/deploy.yml
name: GitOps Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ===== JOB 1: Test =====
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linter
        run: npm run lint

  # ===== JOB 2: Build and Push =====
  build:
    name: Build and Push
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    outputs:
      image_digest: ${{ steps.push.outputs.digest }}
      image_tag: git-${{ github.sha }}

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log into GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest
            type=sha,format=long,prefix=git-
            type=raw,value={{date 'YYYYMMDD-HHmmss'}}

      - name: Build and push
        id: push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
          sbom: true

      - name: Output image info
        run: |
          echo "Image digest: ${{ steps.push.outputs.digest }}"
          echo "Image tags: ${{ steps.meta.outputs.tags }}"

  # ===== JOB 3: Deploy =====
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: production
      url: https://myapp.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy stack to Portainer
        env:
          PORTAINER_URL: ${{ secrets.PORTAINER_URL }}
          PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
          IMAGE_TAG: ${{ needs.build.outputs.image_tag }}
          STACK_NAME: my-app
        run: |
          # Find the stack and its environment
          STACK_DATA=$(curl -sf -H "X-API-Key: $PORTAINER_API_KEY" \
            "$PORTAINER_URL/api/stacks" | \
            jq -c --arg n "$STACK_NAME" '.[] | select(.Name == $n)')

          if [ -z "$STACK_DATA" ]; then
            echo "ERROR: Stack '$STACK_NAME' not found in Portainer."
            exit 1
          fi

          STACK_ID=$(echo "$STACK_DATA" | jq -r '.Id')
          ENDPOINT_ID=$(echo "$STACK_DATA" | jq -r '.EndpointId')

          PAYLOAD=$(jq -n \
            --rawfile stackFile docker-compose.yml \
            --arg imageTag "$IMAGE_TAG" \
            --arg owner "${{ github.repository_owner }}" \
            '{
              StackFileContent: $stackFile,
              Env: [
                {name: "IMAGE_TAG", value: $imageTag},
                {name: "GITHUB_REPOSITORY_OWNER", value: $owner}
              ],
              RepullImageAndRedeploy: true
            }')

          # Update the file-based stack with the new image tag
          curl -sf -X PUT \
            -H "X-API-Key: $PORTAINER_API_KEY" \
            -H "Content-Type: application/json" \
            "$PORTAINER_URL/api/stacks/$STACK_ID?endpointId=$ENDPOINT_ID" \
            -d "$PAYLOAD"

          echo "Deployed with tag: $IMAGE_TAG"

      - name: Verify deployment
        run: |
          echo "Verifying deployment health..."
          sleep 45  # Wait for container to start

          MAX_RETRIES=10
          for i in $(seq 1 $MAX_RETRIES); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://myapp.example.com/health)
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed (attempt $i)!"
              exit 0
            fi
            echo "Attempt $i/$MAX_RETRIES (HTTP $STATUS) - waiting 15s..."
            sleep 15
          done

          echo "ERROR: Deployment health check failed!"
          exit 1
```

## Step 6: Configure GHCR Image Visibility

For private images (default), ensure Portainer can pull from GHCR:

1. In Portainer, add GHCR as a registry.
2. Go to **Registries** → **Add registry**.
3. In Portainer BE, you can select **GitHub** as the registry provider. In Portainer CE, add GHCR as a **Custom registry** and use `ghcr.io` as the registry URL.
4. Enter your GitHub username and a Personal Access Token (classic). For a custom `ghcr.io` registry used only to pull private images, GitHub requires the `read:packages` scope. If you use Portainer BE's dedicated GitHub registry provider, follow the token scope requirements shown in Portainer.

## Step 7: Create a Deployment Environment in GitHub

1. Go to **Settings** → **Environments** → **New environment**.
2. Name it `production`.
3. Configure:
   - **Required reviewers**: Add team leads for manual approval
   - **Wait timer**: 5 minutes for observation window
   - **Deployment branches**: Only `main`

## Conclusion

This complete GitOps pipeline with Portainer and GitHub achieves full automation from code push to production deployment. GitHub Container Registry provides image storage tightly integrated with your code, GitHub Actions handles the build pipeline, and Portainer manages the container runtime. The result is a traceable, reproducible deployment process where every production deployment links back to a specific Git commit.
