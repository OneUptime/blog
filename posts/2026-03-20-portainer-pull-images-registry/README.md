# How to Pull Docker Images from a Registry in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Registry, DevOps

Description: Learn how to pull Docker images from Docker Hub and private registries in Portainer, including configuring registry credentials.

## Introduction

Before running a container, you need the image on the Docker host. Portainer provides a dedicated Images section where you can pull images from Docker Hub, GitHub Container Registry, private registries, or any OCI-compliant registry. This guide covers how to configure registries and pull images.

## Prerequisites

- Portainer installed with a connected Docker environment
- Network access to the registry you want to pull from

## Step 1: Add a Registry in Portainer

For private registries, add credentials first:

1. Go to **Registries** (or **Host > Registries** for environment-specific access).
2. Click **Add registry**.
3. Select the registry type:
   - **Docker Hub**: For Docker Hub (official and private repos).
   - **AWS ECR**: For Amazon Elastic Container Registry.
   - **Quay.io**: For Red Hat's Quay registry.
   - **Custom registry**: For `ghcr.io` and any other registry.

### Docker Hub

```text
Registry type:           DockerHub
Name:                    My Docker Hub Account
DockerHub username:      myusername
DockerHub access token:  dckr_pat_xxxxxxxxxxxxxxxx
```

To generate a Docker Hub access token:
1. Log in to Docker Home.
2. Go to **Account Settings > Personal access tokens > Generate new token**.
3. Copy the token and use it as the access token in Portainer.

### Private Registry

```text
Registry type: Custom registry
Name:          My Private Registry
Registry URL:  registry.example.com:5000
Username:      myuser
Password:      mypassword
```

### GitHub Container Registry (GHCR)

```text
Registry type: Custom registry
Name:          GitHub Container Registry
Registry URL:  ghcr.io
Username:      your-github-username
Password:      YOUR_GITHUB_PAT_CLASSIC  (GitHub personal access token (classic) with at least read:packages scope)
```

### AWS ECR

```text
Registry type: AWS ECR
Name:          My ECR Registry
Registry URL:  123456789012.dkr.ecr.us-east-1.amazonaws.com
Authentication: enabled
Region:        us-east-1
AWS Access Key:        AKIAXXXXXXXXXXXXXXXX
AWS Secret Access Key: xxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 2: Pull an Image via the Images Section

1. Navigate to **Images** in Portainer (left sidebar, under your environment).
2. Click **Pull image**.
3. Fill in the image details:

```bash
Image: nginx:latest           (Docker Hub public image)
Image: myorg/myapp:v2.1.0     (Docker Hub private image)
Image: myorg/myapp:latest     (GHCR, with ghcr.io selected in Registry)
Image: myapp:v1               (private registry, with your registry selected)
```

4. Select the **Registry** from the dropdown. If the registry is not already added in Portainer, switch to **Advanced mode** and enter the registry URL and image manually.
5. Click **Pull the image**.

## Step 3: Pull Images During Container Creation

You don't need to pre-pull. If the image is not already on the host, Portainer pulls it automatically:

1. Navigate to **Containers > Add container**.
2. Enter the image name.
3. Select the registry (or switch to **Advanced mode** for a one-off registry).
4. Optionally enable **Always pull the image** to force a fresh pull even if a local copy exists.
5. Click **Deploy the container**.

## Step 4: Pull Using Docker CLI Syntax

```bash
# Pull from Docker Hub (public):

docker pull nginx:alpine
docker pull redis:7-alpine
docker pull postgres:15

# Pull from Docker Hub (private, requires login):
docker login
docker pull myorg/myapp:v2.1.0

# Pull from GHCR:
echo $GITHUB_TOKEN | docker login ghcr.io -u myusername --password-stdin
docker pull ghcr.io/myorg/myapp:latest

# Pull from private registry:
docker login registry.example.com
docker pull registry.example.com/myapp:v1

# Pull specific digest (immutable):
docker pull ubuntu@sha256:2e863c44b718727c860746568e1d54afd13b2fa71b160f5cd9058fc436217b30
```

## Step 5: Configure Registry Mirror

For faster pulls, or to reduce repeated upstream pulls across hosts, configure a registry mirror:

```json
{
  "registry-mirrors": [
    "https://mirror.example.com"
  ]
}
```

For an internal mirror (e.g., Harbor, Nexus):

```json
{
  "registry-mirrors": ["https://registry.internal.example.com"]
}
```

```bash
# Apply daemon config on Linux hosts that use systemd:
systemctl restart docker
```

## Step 6: Verify Pulled Images

After pulling:

1. Navigate to **Images** in Portainer.
2. The image appears in the list with its ID, tags, and size.

```bash
# Docker CLI equivalent:
docker images

# Output:
REPOSITORY       TAG       IMAGE ID       CREATED        SIZE
nginx            alpine    abc123         2 weeks ago    42MB
myorg/myapp      v2.1.0    def456         1 day ago      385MB
postgres         15        ghi789         3 days ago     412MB
```

## Step 7: Pull Multiple Images in Bulk

For deploying a new environment, pull all required images first:

```bash
#!/bin/bash
# pre-pull-images.sh
# Pre-pull all images required for the application

IMAGES=(
  "nginx:alpine"
  "postgres:15-alpine"
  "redis:7-alpine"
  "myorg/myapp:v2.1.0"
  "myorg/worker:v2.1.0"
  "prom/prometheus:latest"
  "grafana/grafana:latest"
)

echo "Pre-pulling ${#IMAGES[@]} images..."

for image in "${IMAGES[@]}"; do
  echo "Pulling: ${image}"
  if docker pull "${image}"; then
    echo "  ✓ Success: ${image}"
  else
    echo "  ✗ Failed: ${image}"
  fi
done

echo "Pre-pull complete."
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

## Troubleshooting Pull Failures

```bash
# Error: "unauthorized: access token has insufficient scopes"
# Fix: use a personal access token (classic) with at least read:packages scope

# Error: "no such host" / "dial tcp: connection refused"
# Fix: check registry URL and network connectivity
curl -s https://registry.example.com/v2/ | jq .

# Error: "toomanyrequests: Rate limit exceeded"
# Fix: Docker Hub rate limits unauthenticated pulls
# Add Docker Hub credentials in Portainer > Registries
# Authenticated users generally get higher pull limits than anonymous users

# Error: "Image not found"
# Fix: verify image name, tag, and registry are correct
docker search myapp  # Search Docker Hub
```

## Conclusion

Pulling images in Portainer is straightforward once your registry credentials are configured. Add your private registries in Portainer's **Registries** section, then pull images from the Images section or let Portainer pull them automatically during container creation. For environments with many images, pre-pull scripts ensure fast container startup and offline resilience.
