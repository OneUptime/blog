# How to Fix Docker 'Too Many Requests' Rate Limit Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Rate Limiting, Too Many Requests, Docker Hub, Registry Mirror, CI/CD, Troubleshooting

Description: Fix Docker Hub rate limit errors by authenticating, using registry mirrors, caching images, and managing pull quotas effectively.

---

In November 2020, Docker Hub introduced rate limits on image pulls. Since then, hitting "toomanyrequests: You have reached your pull rate limit" has become a regular frustration, especially in CI/CD pipelines, Kubernetes clusters, and shared development environments. The error stops your builds, blocks deployments, and can cascade across teams sharing the same IP address.

This guide explains the rate limit tiers, shows you how to check your current usage, and provides practical solutions to avoid hitting the limits.

## Understanding Docker Hub Rate Limits

Docker Hub applies different limits based on your authentication status:

| Account Type | Pull Limit | Window |
|-------------|-----------|--------|
| Anonymous (unauthenticated) | 100 pulls per 6 hours | Per source IP |
| Authenticated (free account) | 200 pulls per 6 hours | Per account |
| Docker Pro/Team/Business | 5,000+ pulls per day | Per account |

The critical detail is how "per source IP" works for anonymous pulls. If multiple developers, CI runners, or Kubernetes nodes share the same public IP (common behind NAT or a corporate proxy), they share the same 100-pull quota. A busy CI system can burn through that in minutes.

## What the Error Looks Like

```
Error response from daemon: toomanyrequests: You have reached your pull rate limit. You may increase the limit by authenticating and upgrading: https://www.docker.com/increase-rate-limit

Error response from daemon: toomanyrequests: Too Many Requests.
```

In Kubernetes, you see pods stuck in `ImagePullBackOff` with this message in the events:

```
Failed to pull image "nginx:alpine": rpc error: code = Unknown desc = toomanyrequests: You have reached your pull rate limit
```

## Check Your Current Rate Limit Status

Before fixing anything, check how much quota you have left.

For anonymous pulls:

```bash
# Check rate limit status without authenticating
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | jq -r .token)

curl -s -H "Authorization: Bearer $TOKEN" \
  -I https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest 2>&1 | \
  grep -i ratelimit
```

The response headers show your limits:

```
ratelimit-limit: 100;w=21600
ratelimit-remaining: 87;w=21600
```

This means 100 pulls per 21600 seconds (6 hours), with 87 remaining.

For authenticated pulls:

```bash
# Check rate limit status with authentication
TOKEN=$(curl -s -u "myuser:mytoken" \
  "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | \
  jq -r .token)

curl -s -H "Authorization: Bearer $TOKEN" \
  -I https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest 2>&1 | \
  grep -i ratelimit
```

## Fix 1: Authenticate Your Pulls

The simplest fix. Authenticating doubles your quota from 100 to 200 pulls per 6 hours, and the limit applies per account rather than per IP.

```bash
# Log in to Docker Hub
docker login -u myuser

# Now pulls are counted against your account, not your IP
docker pull nginx:alpine
```

For CI/CD systems, use a personal access token instead of a password:

```bash
# Create a token at https://hub.docker.com/settings/security
echo "dckr_pat_xxxxxxxxxxxx" | docker login -u myuser --password-stdin
```

In a GitHub Actions workflow:

```yaml
# .github/workflows/build.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build image (pulls are now authenticated)
        run: docker build -t myapp .
```

In Kubernetes, create a pull secret for the default service account:

```bash
# Create a Docker Hub pull secret
kubectl create secret docker-registry dockerhub-creds \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=myuser \
  --docker-password=dckr_pat_xxxxxxxxxxxx

# Attach it to the default service account
kubectl patch serviceaccount default \
  -p '{"imagePullSecrets": [{"name": "dockerhub-creds"}]}'
```

## Fix 2: Use a Registry Mirror or Cache

A pull-through cache stores images locally after the first pull. Subsequent pulls from the same image come from the cache, consuming zero Docker Hub quota.

Set up a pull-through cache using Docker's own registry:

```bash
# Run a registry configured as a pull-through cache
docker run -d \
  --name registry-mirror \
  --restart=always \
  -p 5000:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -v mirror-data:/var/lib/registry \
  registry:2
```

Configure Docker to use the mirror:

```bash
# Edit Docker daemon configuration to use the local mirror
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["http://localhost:5000"]
}
EOF

sudo systemctl restart docker
```

Now Docker checks the local mirror first. If the image is cached, it serves from local storage. If not, the mirror pulls from Docker Hub, caches it, and serves it to the client.

For Kubernetes clusters, run the mirror as a DaemonSet or a dedicated service:

```yaml
# mirror-deployment.yaml - Pull-through cache for the cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: docker-mirror
spec:
  replicas: 1
  selector:
    matchLabels:
      app: docker-mirror
  template:
    metadata:
      labels:
        app: docker-mirror
    spec:
      containers:
        - name: mirror
          image: registry:2
          env:
            - name: REGISTRY_PROXY_REMOTEURL
              value: "https://registry-1.docker.io"
            # Authenticate the mirror to get higher rate limits
            - name: REGISTRY_PROXY_USERNAME
              valueFrom:
                secretKeyRef:
                  name: dockerhub-creds
                  key: username
            - name: REGISTRY_PROXY_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: dockerhub-creds
                  key: password
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: cache
              mountPath: /var/lib/registry
      volumes:
        - name: cache
          persistentVolumeClaim:
            claimName: mirror-cache
---
apiVersion: v1
kind: Service
metadata:
  name: docker-mirror
spec:
  selector:
    app: docker-mirror
  ports:
    - port: 5000
      targetPort: 5000
```

## Fix 3: Copy Images to Your Own Registry

For production workloads, copy the images you depend on to a registry you control. This eliminates Docker Hub as a dependency entirely.

```bash
# Pull the image from Docker Hub
docker pull nginx:1.25-alpine

# Tag it for your private registry
docker tag nginx:1.25-alpine myregistry.com/base-images/nginx:1.25-alpine

# Push it to your registry
docker push myregistry.com/base-images/nginx:1.25-alpine
```

Automate this with a script that syncs your base images:

```bash
#!/bin/bash
# sync-base-images.sh - Copy base images to a private registry

PRIVATE_REGISTRY="myregistry.com/base-images"

IMAGES=(
  "nginx:1.25-alpine"
  "node:20-alpine"
  "python:3.12-alpine"
  "postgres:16-alpine"
  "redis:7-alpine"
)

for IMAGE in "${IMAGES[@]}"; do
  echo "Syncing $IMAGE..."
  docker pull "$IMAGE"
  docker tag "$IMAGE" "${PRIVATE_REGISTRY}/${IMAGE}"
  docker push "${PRIVATE_REGISTRY}/${IMAGE}"
done

echo "All images synced."
```

Or use tools like `skopeo` that copy images between registries without pulling them to the local daemon:

```bash
# Copy an image directly between registries (faster, no local daemon needed)
skopeo copy \
  docker://docker.io/library/nginx:1.25-alpine \
  docker://myregistry.com/base-images/nginx:1.25-alpine
```

## Fix 4: Optimize CI/CD Pull Behavior

CI pipelines are the biggest rate limit offenders because they pull images frequently and often from scratch.

**Cache Docker images between CI runs:**

```yaml
# GitHub Actions - cache Docker layers
- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-

- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    cache-from: type=local,src=/tmp/.buildx-cache
    cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
```

**Use pre-built base images** instead of pulling public images in every build:

```dockerfile
# Instead of pulling from Docker Hub on every build
# FROM node:20-alpine

# Pull from your own registry (no Docker Hub quota used)
FROM myregistry.com/base-images/node:20-alpine
```

**Reduce unnecessary pulls** by pinning image digests:

```dockerfile
# Pin to a specific digest - Docker will not pull if the local image matches
FROM node:20-alpine@sha256:abc123...
```

## Fix 5: Upgrade Your Docker Hub Plan

If the other solutions are too complex or if your usage simply requires more pulls, upgrading is the direct fix.

- **Docker Pro**: $5/month, 5,000 pulls/day
- **Docker Team**: $7/user/month, 5,000 pulls/day per member
- **Docker Business**: $24/user/month, unlimited pulls

For organizations, the Team or Business plan often costs less than the engineering time spent working around rate limits.

## Monitoring Your Pull Usage

Track your pull usage over time to anticipate rate limit issues before they cause outages:

```bash
# Script to check and log rate limit status
#!/bin/bash
TOKEN=$(curl -s -u "${DOCKER_USER}:${DOCKER_TOKEN}" \
  "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | \
  jq -r .token)

HEADERS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -I https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest 2>&1)

LIMIT=$(echo "$HEADERS" | grep -i "ratelimit-limit" | awk '{print $2}')
REMAINING=$(echo "$HEADERS" | grep -i "ratelimit-remaining" | awk '{print $2}')

echo "$(date): Limit=$LIMIT Remaining=$REMAINING"
```

Run this as a cron job and alert when remaining drops below a threshold.

## Conclusion

Docker Hub rate limits are here to stay, and the 100-pull anonymous limit is easy to hit in any automated environment. Start by authenticating all pulls to double your quota. Set up a pull-through cache for your CI runners and Kubernetes clusters. For critical dependencies, copy images to your own registry so you are never blocked by Docker Hub. These steps, combined with smart caching in CI pipelines, keep your builds running and your deployments healthy, regardless of Docker Hub's rate limits.
