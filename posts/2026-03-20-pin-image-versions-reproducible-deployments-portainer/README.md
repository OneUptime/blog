# Pinning Image Versions for Reproducible Deployments in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Reproducibility, DevOps, Container Management

Description: Learn why and how to pin Docker image versions in Portainer stacks and container deployments to ensure consistent, reproducible production environments.

## Why Pin Image Versions?

Using `image:latest` is convenient during development but dangerous in production. Unpinned images mean:

- A new deployment might pull a breaking change invisibly
- Rollback becomes harder when the "old" image tag no longer maps to the same content
- Debugging is harder because the environment changed without a visible configuration change
- Environments drift - dev, staging, and prod may run different image versions

## The Problem with `:latest`

```yaml
# DANGER: unpredictable

services:
  app:
    image: nginx:latest   # What version is this today? Tomorrow?
```

Every time Portainer pulls this stack, it may get a different version of nginx.

## Pinning by Tag

Pin to a specific semantic version:

```yaml
services:
  app:
    image: nginx:1.25.4
  database:
    image: postgres:16.2-alpine
  cache:
    image: redis:7.2.4-alpine
```

This pins deployments to a specific tag, which is much safer than `latest`.

## Pinning by Digest (Most Reliable)

Tags are mutable - a registry owner can push a new image to the same tag. Digest pinning is immutable:

```yaml
services:
  app:
    image: nginx@sha256:9ff236ed47fe39cf1f0acf349d0e5137f8b8a6fd0b46e5117a401010e56222e1
```

Find the digest for a current image:

```bash
docker pull nginx:1.25.4
docker image inspect nginx:1.25.4 --format='{{index .RepoDigests 0}}'
```

## Managing Image Versions in Portainer

### Using Stacks (Recommended)

In Portainer, navigate to **Stacks → Add Stack** and paste a compose file with pinned versions:

```yaml
services:
  web:
    image: myapp/web:v2.3.1
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production

  api:
    image: myapp/api:v2.3.1
    environment:
      - DATABASE_URL=${DATABASE_URL}
```

### Updating to a New Version

To upgrade a specific service:
1. Edit the stack in Portainer
2. Change the image tag (e.g., `v2.3.1` → `v2.4.0`)
3. Click **Update the stack**
4. Portainer will pull the new image and recreate the container

### Rolling Back

If a new version causes issues:
1. Edit the stack
2. Revert the image tag to the previous version
3. Update the stack

## Using Environment Variables for Versions

```yaml
services:
  app:
    image: myapp/web:${APP_VERSION:-v2.3.1}
```

In Portainer's stack editor, set environment variables to control versions without editing the compose file directly.

## CI/CD Integration

In your CI/CD pipeline, build and tag images with the git commit SHA:

```bash
# Build and push
docker build -t myapp/web:${GITHUB_SHA} .
docker push myapp/web:${GITHUB_SHA}

# Update a file-based Portainer stack via API
curl -X PUT 'https://portainer.example.com/api/stacks/1?endpointId=1' \
  -H "Authorization: Bearer $PORTAINER_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @- <<EOF
{
  "StackFileContent": "services:\n  web:\n    image: myapp/web:${GITHUB_SHA}\n",
  "RepullImageAndRedeploy": true
}
EOF
```

## Image Version Tracking

Maintain a `versions.env` file in your repository:

```bash
WEB_IMAGE=myapp/web:v2.3.1
API_IMAGE=myapp/api:v2.3.1
DB_IMAGE=postgres:16.2-alpine
CACHE_IMAGE=redis:7.2.4-alpine
```

Reference these variables in your compose file, then load them into Portainer as stack environment variables when you deploy.

## Best Practices

1. **Never use `:latest` in production** - always pin to a specific version or digest
2. **Use semantic versions** in compose files and update them in version control
3. **Pin base images** in your own Dockerfiles too (`FROM node:20.11.0-alpine`)
4. **Automate image scanning** before promoting new versions
5. **Keep a changelog** of version bumps alongside your infrastructure code

## Conclusion

Pinning image versions in Portainer ensures that your deployments are reproducible and predictable. Combined with a CI/CD pipeline that builds tagged images from git commits, you get a complete audit trail of every version deployed to production.
