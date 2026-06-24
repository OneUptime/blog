# How to Search Docker Hub for Images in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Docker Hub, DevOps

Description: Learn how to search Docker Hub for container images directly from Portainer to find official images and community images.

## Introduction

Finding the right Docker image is the first step in containerizing an application. When you're selecting an image for a container or service, Portainer can query Docker Hub so you can confirm the correct image name and tag without leaving the management console. This guide covers searching, evaluating, and selecting the right image.

## Prerequisites

- Portainer installed with a connected Docker environment

## Step 1: Search for Images in Portainer

1. Navigate to **Containers** and click **Add container**.
2. In the **Image** section, select **Docker Hub** if needed.
3. Enter your search term.
4. Click **Search** to confirm the correct image name and tag.

On Docker Swarm environments, the same search is available under **Services** > **Add service**.

## Step 2: Understanding Search Results

### Official Images

Official images are curated and published by Docker in collaboration with upstream maintainers:

```text
✓ Official images:
  nginx          - Official Nginx
  postgres       - Official PostgreSQL
  redis          - Official Redis
  node           - Official Node.js
  python         - Official Python
  mysql          - Official MySQL
  mongo          - Official MongoDB
  ubuntu         - Official Ubuntu
  alpine         - Official Alpine Linux
```

Official images:
- Are curated and regularly updated.
- Have documented Dockerfiles and supported tags.
- Come from the root namespace (no organization prefix).
- Are marked with an official badge on Docker Hub or `[OK]` in `docker search`.

### Verified Publisher Images

These are from publishers verified by Docker:

```text
bitnami/nginx       - Bitnami's production-hardened Nginx
bitnami/postgresql  - Bitnami's PostgreSQL
grafana/grafana     - Official Grafana from Grafana Labs
hashicorp/vault     - Official from HashiCorp
```

### Community Images

```text
myorg/myapp  - Organization/username prefixed
```

Evaluate community images carefully:
- Check the pull count and star count.
- Review the Dockerfile on Docker Hub.
- Check when it was last updated.
- Prefer images with active maintenance.

## Step 3: Search Docker Hub via CLI

```bash
# Search Docker Hub from command line:

docker search nginx

# Filter by official images only:
docker search --filter is-official=true nginx

# Filter by minimum stars:
docker search --filter stars=100 database

# Limit results:
docker search --limit 5 python
```

`docker search` output includes `NAME`, `DESCRIPTION`, `STARS`, and `OFFICIAL` columns, and the counts change over time.

## Step 4: Evaluate Images Before Using

Before pulling an unfamiliar image, check:

### Criteria for Image Selection

```text
Factor              | Indicator of Quality
--------------------|--------------------------------------------
Official badge      | Docker Official Image or trusted publisher badge
Star count          | Higher star counts can signal broader adoption
Pull count          | Higher pull counts can indicate widespread use
Last updated        | Recent updates can indicate active maintenance
Image size          | Smaller images often mean fewer packages
Dockerfile access   | Prefer images with visible build instructions
```

### Check the Image on Docker Hub

Visit `https://hub.docker.com/_/nginx` (official) or `https://hub.docker.com/r/bitnami/nginx` (verified publisher):

- **Tags tab**: Available versions and their sizes.
- **Dockerfile**: Review what's inside.
- **Tags by OS/Architecture**: For multi-arch support.

## Step 5: Choosing the Right Tags

After finding the right image, choose the appropriate tag:

```text
# PostgreSQL tag options:
postgres:latest         → Latest version (changes over time - risky for prod)
postgres:17             → Major version (gets minor/patch updates)
postgres:17.6           → Specific version (stable, predictable)
postgres:17-alpine      → Alpine-based (smaller image)
postgres:17.6-alpine    → Specific version + Alpine

# Node.js tag options:
node:24                 → Node.js 24 (LTS)
node:24-slim            → Slim Debian (smaller)
node:24-alpine          → Smaller Alpine-based variant
node:24.13.0-alpine     → Pinned exact version (most reproducible)

# Nginx tag options:
nginx:latest            → Default tag (moves over time)
nginx:stable            → Current stable release line
nginx:1.28              → Stable release series
nginx:1.28-alpine       → Alpine-based stable variant
nginx:alpine            → Latest Alpine-based variant
```

## Step 6: Check Image Vulnerability Scan

For security-conscious environments, check for vulnerabilities:

```bash
# Use Docker Scout (Docker Desktop/Hub):
docker scout cves nginx:latest

# Or use Trivy (open source):
docker run --rm aquasec/trivy:latest image nginx:alpine
```

Sample output varies by image tag and vulnerability database date:

```text
nginx:alpine (alpine 3.x)
=========================
Total: <varies>
```

## Step 7: Find Images for Specific Technologies

Quick reference for common services:

```bash
# Web servers:
docker search nginx
docker search apache     # httpd image

# Databases:
docker search postgres
docker search mysql
docker search mariadb
docker search mongodb
docker search redis
docker search elasticsearch

# Messaging:
docker search rabbitmq
docker search kafka      # confluentinc/cp-kafka
docker search mosquitto  # eclipse-mosquitto

# Monitoring:
docker search prometheus
docker search grafana

# CI/CD:
docker search jenkins
docker search gitlab
docker search gitea

# Programming languages:
docker search python
docker search node
docker search golang
docker search java
docker search ruby
```

## Step 8: Pin Versions in Production

After finding the right image and tag:

```yaml
# docker-compose.yml - always pin versions in production
services:
  web:
    # Bad: image: nginx:latest (changes without notice)
    # Good: pin to specific version
    image: nginx:1.28.3-alpine

  db:
    image: postgres:17.6-alpine

  cache:
    image: redis:8.6.2-alpine
```

## Conclusion

Searching Docker Hub from Portainer gives you quick access to the vast ecosystem of available container images. Prioritize official images and verified publisher images, check stars and pull counts, review Dockerfiles when possible, and always pin to specific versions in production. The extra effort of choosing the right base image pays dividends in security, stability, and maintainability.
