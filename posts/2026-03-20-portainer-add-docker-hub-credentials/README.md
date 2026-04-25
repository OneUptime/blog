# How to Add Docker Hub Credentials to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Hub, Registry, Authentication, DevOps

Description: Learn how to add Docker Hub credentials to Portainer to pull private images and avoid rate limiting on public pulls.

## Introduction

Adding Docker Hub credentials to Portainer serves two purposes: it enables pulling private Docker Hub repositories, and it increases the pull rate limit for Docker Personal accounts (200 pulls per 6 hours vs 100 for unauthenticated users). Paid Docker Hub plans are not subject to the pull rate limit. This guide covers adding and managing Docker Hub credentials in Portainer.

## Prerequisites

- Portainer CE or BE installed
- A Docker Hub account (free or paid)
- Admin access to Portainer

## Why Add Docker Hub Credentials

1. **Private repositories** - Without credentials, Portainer cannot pull images from private Docker Hub repos
2. **Rate limits** - Docker Hub limits unauthenticated pulls; authentication increases limits for Docker Personal accounts
3. **Docker Hub Pro/Team** - Paid accounts are not subject to the pull rate limit
4. **Security** - Using a dedicated access token is safer than using your account password

## Step 1: Create a Docker Hub Access Token

Using an access token is more secure than using your Docker Hub password:

1. Log in to [Docker Home](https://app.docker.com)
2. Click your profile icon → **Account Settings**
3. Click **Personal access tokens**
4. Click **Generate new token**
5. Enter a description (e.g., "Portainer - Production")
6. Choose an expiration date
7. Grant at least **Read** access for pulling images
8. Click **Generate**
9. **Copy the token immediately** - it won't be shown again

## Step 2: Add Docker Hub Registry in Portainer

1. Log in to Portainer as admin
2. Click **Registries** in the left sidebar
3. Click **+ Add registry**
4. Select **DockerHub**

## Step 3: Fill in Docker Hub Credentials

```text
Name:                      dockerhub-auth
DockerHub username:        your-docker-hub-username
DockerHub access token:    dckr_pat_xxxxx...   (your personal access token)
```

5. Click **Test connection**
6. After the test succeeds, click **Add registry**

## Step 4: Verify the Registry Works

After adding:

1. Navigate to a Docker environment
2. Go to **Containers → Add container**
3. In the **Image** field, type a private image name
4. The Docker Hub registry should be selectable in the registry dropdown
5. Pull test: deploy a private image to verify authentication works

```bash
# CLI verification

printf '%s\n' 'your-access-token' | docker login --username your-username --password-stdin
docker pull your-username/private-repo:tag
```

## Step 5: Use Credentials When Deploying

### Containers

When creating a container or deploying a stack, Portainer can use the configured Docker Hub credentials for Docker Hub images.

### Stacks with Private Images

```yaml
services:
  app:
    image: your-org/private-app:latest   # Portainer uses stored Docker Hub creds
```

No additional Compose configuration is needed - just reference the Docker Hub image in the stack file.

## Step 6: Configure Per-Environment Registry Access

Portainer manages registry access per environment:

1. Open the environment where you want to manage registry access
2. Go to **Host → Registries** (or **Swarm/Cluster → Registries**, depending on the environment type)
3. Find the registry and click **Manage access**
4. Select the users or teams that should have access, then click **Create access**

## Checking Docker Hub Rate Limits

Monitor your pull rate limit status:

```bash
# Check rate limit status for an authenticated account
DOCKERHUB_USER='your-username'
DOCKERHUB_PAT='your-access-token'

TOKEN=$(curl -s --user "${DOCKERHUB_USER}:${DOCKERHUB_PAT}" \
  "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | jq -r .token)

curl -s --head -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest | \
  grep -i "ratelimit"

# Example output for an authenticated Personal account:
# ratelimit-limit: 200;w=21600
# ratelimit-remaining: 195;w=21600
```

## Troubleshooting

### Authentication Failed

```text
Error response from daemon: pull access denied for myorg/myimage,
repository does not exist or may require 'docker login'
```

**Fixes:**
- Verify username and password/token are correct
- Check that the token has `read` permission
- Ensure you are accessing the correct repository (private vs public)

### Rate Limit Exceeded

```text
Error response from daemon: toomanyrequests: Too Many Requests.
Rate limit exceeded.
```

**Fixes:**
- Add Docker Hub credentials if not already configured
- Upgrade to a paid Docker Hub plan for unlimited pull-rate limits
- Use a registry mirror for public images

### Setting Up a Registry Mirror

Example `/etc/docker/daemon.json` for Google's public Docker Hub mirror:

```json
{
  "registry-mirrors": ["https://mirror.gcr.io"]
}
```

## Conclusion

Adding Docker Hub credentials to Portainer is quick and provides immediate benefits: access to private repositories and higher pull limits for Docker Personal accounts. Using a personal access token instead of your account password is the recommended approach for better security. If you're pulling public images frequently, consider also setting up a registry mirror to reduce direct Docker Hub pulls.
