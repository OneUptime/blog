# How to Fix 'Image Not Found' Errors When Deploying in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Docker Images, Registry, Deployment, Pull Errors

Description: Learn how to diagnose and fix 'image not found' errors in Portainer deployments, covering registry authentication, image tag issues, and private registry configuration.

---

"Image Not Found" errors in Portainer mean Docker cannot pull the specified image. The cause ranges from a simple typo in the image name to missing registry authentication for a private registry.

## Step 1: Verify the Image Name and Tag

```bash
# Test pulling the image directly on the Docker host

docker pull <image-name>:<tag>

# Common mistakes:
# Wrong tag: ubuntu:22 (should be ubuntu:22.04)
# Wrong registry: myregistry.io/app (missing tag, defaults to :latest which may not exist)
# Typo in image name
```

## Step 2: Check if the Image Exists on Docker Hub

```bash
# Search Docker Hub for the image
docker search <image-name>

# Or use the Docker Hub API to list published tags
curl -s "https://hub.docker.com/v2/namespaces/<org>/repositories/<image>/tags?page_size=10" | \
  jq -r '.results[].name'
```

## Step 3: Handle Private Registry Authentication

For images in private registries, add the registry credentials to Portainer:

1. In Portainer go to **Registries > Add Registry**.
2. Choose **Custom Registry**.
3. Enter the registry URL, username, and password.
4. Click **Add Registry**.

Then in your stack or container definition, reference the image with the full registry path:

```yaml
services:
  app:
    # Always include the full registry URL for private images
    image: registry.example.com/myorg/myapp:1.2.3
```

## Step 4: Fix AWS ECR Authentication

AWS ECR uses temporary tokens that expire every 12 hours. If you test pulls with the Docker CLI, get a fresh token:

```bash
# Get a fresh ECR login token for a direct Docker CLI test
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

In Portainer, add the registry under **Registries > Add Registry > AWS ECR** and enter the registry URL, AWS access key, AWS secret access key, and region instead of pasting a temporary token.

## Step 5: Handle Rate Limiting on Docker Hub

Docker Hub applies pull rate limits on a 6-hour basis. Unauthenticated users get 100 pulls per IPv4 address or IPv6 /64 subnet, and authenticated Docker Personal users get 200 pulls per 6 hours:

```bash
# Check the anonymous pull rate limit status
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | jq -r .token)
curl -s --head \
  -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest | \
  grep -i ratelimit
```

Add a Docker Hub account in Portainer using your Docker Hub username and personal access token to authenticate pulls. Docker Pro, Team, and Business accounts have unlimited pull rate.

## Step 6: Check Network Access from the Docker Environment

If the Docker environment Portainer deploys to is network-restricted:

```bash
# Test HTTPS connectivity to the Docker registry API
curl -I https://registry-1.docker.io/v2/

# A 401 Unauthorized response is expected and confirms the registry is reachable
```
