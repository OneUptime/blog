# How to Restrict Public Repository Usage in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Registry, Docker, Policy

Description: Learn how to restrict Portainer users from pulling container images from public registries, enforcing the use of approved private registries only.

## Introduction

Unrestricted access to public image registries (Docker Hub, GitHub Container Registry, etc.) can introduce unvetted, potentially malicious images into your environment. Portainer lets administrators add approved registries, hide anonymous Docker Hub from the registry selector, and limit registry access per environment. For full enforcement against public pulls, combine Portainer with engine-level, network, or admission-policy controls.

## Why Restrict Public Registries?

- **Supply chain security**: Prevent use of unvetted public images
- **Compliance**: Many frameworks require using internal/approved registries
- **Stability**: Public image tags can change unexpectedly
- **Cost control**: Avoid unexpected registry pull fees
- **Security scanning**: Only deploy images that have passed your security pipeline

## Step 1: Configure Approved Registries

Before limiting registry access in Portainer, add your approved registries:

1. Go to Portainer **Registries**.
2. Add your private registry (Harbor, ECR, GHCR with org scope, etc.).
3. Configure authentication.

```bash
TOKEN="your-jwt-token"
PORTAINER_URL="https://portainer.example.com"

# Add your private registry

curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/registries" \
  -d '{
    "Name": "Company Registry",
    "Type": 3,
    "URL": "registry.company.com",
    "Authentication": true,
    "Username": "portainer-svc",
    "Password": "registry-password"
  }' | jq '{id: .Id, name: .Name}'
```

## Step 2: Limit Registry Access for Users

### Via Portainer UI (Registries)

1. Go to Portainer **Registries**.
2. On **Docker Hub (anonymous)**, click **Hide for all users** if you do not want it shown in the registry selector.
3. For each approved private registry, open the target environment and go to **Host** → **Registries** (or **Swarm** / **Cluster** → **Registries**, depending on the environment type).
4. Click **Manage access** on the registry.
5. Grant access only to the users or teams that should use it, or the namespaces that should be able to use it on Kubernetes.

Hiding anonymous Docker Hub does **not** fully disable Docker Hub access. Portainer's documentation notes that it only hides the option from the Portainer UI, and Docker Hub can still be used directly by Docker itself.

### Via Registry Policies (Portainer BE)

If you're using Portainer Business Edition, you can centralize registry access with policies:

1. Go to **Environment-related** → **Policies** → **Create policy**.
2. Select **Docker** → **Registry**.
3. Choose the registry and the users or teams that should have access.
4. Apply the policy to the relevant environment groups.

Policies are a Business Edition feature and can only be applied to Edge (Standard) Agent environments running Portainer 2.37.0 or later.

## Step 3: Configure via API

```bash
# Grant team ID 2 access to registry ID 3 on environment ID 1
ENDPOINT_ID=1
REGISTRY_ID=3

curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/registries/${REGISTRY_ID}" \
  -d '{
    "UserAccessPolicies": {},
    "TeamAccessPolicies": {
      "2": { "RoleId": 1 }
    }
  }' -o /dev/null -w "%{http_code}\n"
```

For Kubernetes environments, the same endpoint uses a `Namespaces` array instead of user and team access policies.

## Step 4: Mirror Public Images to Private Registry

When limiting registry access, mirror commonly needed images to your private registry:

```bash
#!/bin/bash
# mirror-images.sh - Mirror approved public images to private registry

PRIVATE_REGISTRY="registry.company.com"

# Assumes docker login "$PRIVATE_REGISTRY" has already been completed.
APPROVED_IMAGES=(
  "nginx:1.25"
  "nginx:1.24"
  "postgres:15-alpine"
  "postgres:14-alpine"
  "redis:7-alpine"
  "redis:6-alpine"
  "node:20-alpine"
  "node:18-alpine"
  "python:3.11-alpine"
  "alpine:3.19"
  "ubuntu:22.04"
)

for IMAGE in "${APPROVED_IMAGES[@]}"; do
  PRIVATE_IMAGE="${PRIVATE_REGISTRY}/mirrors/${IMAGE}"

  echo "Mirroring: $IMAGE → $PRIVATE_IMAGE"

  # Pull from public registry
  docker pull "$IMAGE"

  # Tag for private registry
  docker tag "$IMAGE" "$PRIVATE_IMAGE"

  # Push to private registry
  docker push "$PRIVATE_IMAGE"

  echo "Done: $PRIVATE_IMAGE"
done

echo "All images mirrored to $PRIVATE_REGISTRY/mirrors/"
```

## Step 5: Automated Image Scanning Pipeline

For a complete supply chain security solution, scan images before mirroring:

```bash
#!/bin/bash
# scan-and-mirror.sh - Scan public images before adding to private registry

PRIVATE_REGISTRY="registry.company.com"
IMAGE=$1  # e.g., "nginx:1.25"

echo "Scanning $IMAGE for CRITICAL vulnerabilities..."

docker pull "$IMAGE"

# Scan the local image via the Docker socket and fail if any CRITICAL findings exist.
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/.cache/trivy:/root/.cache/" \
  aquasec/trivy:latest image --severity CRITICAL --exit-code 1 "$IMAGE"

echo "No CRITICAL vulnerabilities found. Review HIGH findings before approving the image."
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/.cache/trivy:/root/.cache/" \
  aquasec/trivy:latest image --severity HIGH "$IMAGE"

echo "APPROVED: Mirroring to private registry..."
PRIVATE_IMAGE="${PRIVATE_REGISTRY}/approved/${IMAGE}"
docker tag "$IMAGE" "$PRIVATE_IMAGE"
docker push "$PRIVATE_IMAGE"

echo "Available at: $PRIVATE_IMAGE"
```

## Step 6: Notification on Policy Violation

In Portainer Business Edition, use **Logs** → **Activity** for review, or stream Portainer auth and activity logs to your SIEM. Portainer documents SIEM streaming as an experimental feature:

```bash
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:lts \
  --syslog-addr=syslog.company.com \
  --syslog-port=514 \
  --syslog-source-hostname="portainer-prod"
```

## Step 7: Exception Process

Document an exception process for approved public images:

```yaml
# image-approval-request.yml - Template for requesting public image approval
request:
  requester: "developer@company.com"
  image: "docker.io/library/nginx:1.25"
  reason: "Official NGINX base image for web server"
  scan_results: "0 CRITICAL, 2 HIGH (accepted risk - no fixes available)"
  approved_by: ""
  approval_date: ""
  mirror_path: "registry.company.com/approved/nginx:1.25"
  review_date: "2026-09-20"  # 6 months from approval
```

## Conclusion

Restricting registry usage in Portainer creates a more controlled image workflow. Add your approved private registries, hide anonymous Docker Hub in the Portainer UI, and limit registry access per environment or with Business Edition policies where supported. Mirror commonly needed images with security scanning, document an exception process for new images, and use additional engine-level or admission controls when you need to fully block public registry usage.
