# How to Implement Docker Image Allow Lists

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Policy, Container Registry, DevOps, Governance, Supply Chain

Description: Learn how to restrict which Docker images can run in your environment by implementing allow lists at the daemon, registry, and orchestration levels.

---

Allowing any Docker image to run in your environment is a security risk. A developer might pull an unvetted image from Docker Hub, an attacker might push a malicious image to your registry, or someone might accidentally use a development image in production. Image allow lists restrict which images can run, giving you control over your container supply chain.

## Why Allow Lists Matter

Public registries contain millions of images, and not all of them are safe. Even verified images can have vulnerabilities. An image allow list is a policy that says "only these images, from these sources, with these tags, are permitted to run." Everything else gets blocked.

This approach addresses several risks:

- Prevents running unscanned or unvetted images
- Blocks images from untrusted registries
- Enforces the use of approved base images
- Stops developers from pulling random images off Docker Hub
- Supports compliance requirements for software supply chain security

## Approach 1: Docker Daemon Configuration

The simplest form of image restriction uses Docker daemon's `--registry-mirror` and `--insecure-registries` settings, but these do not actually block pulls. For real enforcement at the daemon level, you need to use an authorization plugin.

### Using the OPA Docker Authorization Plugin

Open Policy Agent (OPA) integrates with Docker as an authorization plugin. It evaluates every Docker API request against policies you define.

Install the OPA plugin:

```bash
# Install the OPA Docker authorization plugin
docker plugin install openpolicyagent/opa-docker-authz-v2:latest \
  opa-args="-policy-file /opa/policies/authz.rego"
```

Create the policy file that defines your image allow list:

```rego
# /etc/docker/policies/authz.rego
# OPA policy to restrict Docker images to an allow list

package docker.authz

default allow = false

# Define the allowed image registries and repositories
allowed_registries := {
    "ghcr.io/your-org",
    "your-registry.azurecr.io",
    "gcr.io/your-project"
}

# Define specific allowed images from Docker Hub
allowed_hub_images := {
    "nginx",
    "postgres",
    "redis",
    "node"
}

# Allow container creation only for approved images
allow {
    input.Method == "POST"
    input.Path == "/containers/create"
    image := input.Body.Image
    registry_allowed(image)
}

# Allow all non-container-creation requests
allow {
    input.Method != "POST"
}

allow {
    input.Path != "/containers/create"
}

# Check if the image comes from an allowed registry
registry_allowed(image) {
    some registry in allowed_registries
    startswith(image, registry)
}

# Check if the image is an allowed Docker Hub image
registry_allowed(image) {
    some img in allowed_hub_images
    image == img
}

registry_allowed(image) {
    some img in allowed_hub_images
    startswith(image, concat("", [img, ":"]))
}
```

Configure Docker to use the plugin:

```json
{
  "authorization-plugins": ["openpolicyagent/opa-docker-authz-v2"]
}
```

Restart Docker and test:

```bash
# Restart Docker to apply the plugin
sudo systemctl restart docker

# This should succeed - nginx is in the allow list
docker run --rm nginx:latest echo "allowed"

# This should fail - random image is not allowed
docker run --rm some-random-image:latest echo "blocked"
# Error: authorization denied by plugin
```

## Approach 2: Registry-Level Restrictions

Instead of controlling what runs, control what can be pulled. This works by restricting access to registries and curating their contents.

### Private Registry with Curated Images

Set up a private registry that contains only approved images:

```bash
# Run a private registry
docker run -d -p 5000:5000 --name registry \
  -v /data/registry:/var/lib/registry \
  registry:2

# Mirror only approved images into your registry
# Pull the approved image
docker pull nginx:1.25-alpine

# Tag it for your registry
docker tag nginx:1.25-alpine localhost:5000/approved/nginx:1.25-alpine

# Push it to your registry
docker push localhost:5000/approved/nginx:1.25-alpine
```

Configure Docker to only pull from your private registry by blocking access to public registries at the network level:

```bash
# Block access to Docker Hub at the firewall level
# (adjust for your firewall tool)
sudo iptables -A OUTPUT -d registry-1.docker.io -j DROP
sudo iptables -A OUTPUT -d auth.docker.io -j DROP
sudo iptables -A OUTPUT -d production.cloudflare.docker.com -j DROP
```

### Automated Image Mirroring Script

Automate the process of pulling, scanning, and mirroring approved images:

```bash
#!/bin/bash
# mirror-approved-images.sh
# Pulls approved images, scans them, and pushes to private registry

REGISTRY="your-registry.example.com"
SCAN_THRESHOLD="high"

# List of approved images with pinned digests
declare -A APPROVED_IMAGES=(
    ["nginx"]="nginx:1.25-alpine@sha256:abc123..."
    ["postgres"]="postgres:16-alpine@sha256:def456..."
    ["redis"]="redis:7-alpine@sha256:ghi789..."
    ["node"]="node:20-alpine@sha256:jkl012..."
)

for name in "${!APPROVED_IMAGES[@]}"; do
    source_image="${APPROVED_IMAGES[$name]}"
    echo "Processing: $name ($source_image)"

    # Pull the image
    docker pull "$source_image"

    # Scan for vulnerabilities
    scan_result=$(docker scout cves "$source_image" --only-severity critical,high 2>&1)
    critical_count=$(echo "$scan_result" | grep -c "critical")

    if [ "$critical_count" -gt 0 ]; then
        echo "BLOCKED: $name has critical vulnerabilities"
        continue
    fi

    # Tag and push to private registry
    docker tag "$source_image" "$REGISTRY/approved/$name"
    docker push "$REGISTRY/approved/$name"
    echo "APPROVED: $name mirrored to $REGISTRY"
done
```

## Approach 3: Kubernetes Admission Control

If you run Docker containers through Kubernetes, admission controllers provide the most robust image allow list enforcement.

### Using Kyverno for Image Policies

Kyverno is a Kubernetes-native policy engine that is simpler to set up than OPA/Gatekeeper for image policies:

```yaml
# kyverno-image-policy.yaml
# Block any image not from approved registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: >-
          Images must come from approved registries:
          ghcr.io/your-org, your-registry.azurecr.io
        pattern:
          spec:
            containers:
              - image: "ghcr.io/your-org/* | your-registry.azurecr.io/*"
            initContainers:
              - image: "ghcr.io/your-org/* | your-registry.azurecr.io/*"
```

```bash
# Apply the policy
kubectl apply -f kyverno-image-policy.yaml

# Test with an allowed image
kubectl run test-allowed --image=ghcr.io/your-org/myapp:latest
# Pod created successfully

# Test with a blocked image
kubectl run test-blocked --image=nginx:latest
# Error: validation error - Images must come from approved registries
```

### Enforce Image Digests Instead of Tags

Tags are mutable. Someone can push a different image with the same tag. Enforce digest-based references for stronger guarantees:

```yaml
# kyverno-require-digests.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digests
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Images must use digests, not tags"
        pattern:
          spec:
            containers:
              - image: "*@sha256:*"
```

## Approach 4: CI/CD Pipeline Enforcement

Catch disallowed images before they reach production by scanning Dockerfiles and Compose files in your CI pipeline:

```bash
#!/bin/bash
# check-allowed-images.sh
# Validates that Dockerfiles only use approved base images

ALLOWED_BASES=(
    "node:20-alpine"
    "python:3.12-slim"
    "golang:1.22-alpine"
    "gcr.io/distroless/static"
    "gcr.io/distroless/base"
    "ubuntu:22.04"
)

# Extract FROM instructions from all Dockerfiles
for dockerfile in $(find . -name "Dockerfile*" -type f); do
    from_images=$(grep -i "^FROM" "$dockerfile" | awk '{print $2}' | grep -v "AS")

    while IFS= read -r image; do
        allowed=false
        for base in "${ALLOWED_BASES[@]}"; do
            if [[ "$image" == "$base"* ]]; then
                allowed=true
                break
            fi
        done

        if [ "$allowed" = false ]; then
            echo "VIOLATION: $dockerfile uses unapproved base image: $image"
            exit 1
        fi
    done <<< "$from_images"
done

echo "All Dockerfiles use approved base images"
```

Integrate this into your CI pipeline:

```yaml
# .github/workflows/image-policy.yml
name: Image Policy Check
on: [pull_request]

jobs:
  check-images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check Base Images
        run: |
          chmod +x ./scripts/check-allowed-images.sh
          ./scripts/check-allowed-images.sh
```

## Maintaining Your Allow List

An allow list is only useful if it is maintained. Set up a process:

1. Keep the allow list in version control
2. Require pull request reviews for changes
3. Automatically scan approved images for new vulnerabilities weekly
4. Remove images that have not been used in 90 days
5. Pin images to specific versions or digests, not `latest`

```bash
# Example: weekly scan of approved images
#!/bin/bash
# weekly-scan.sh
for image in $(cat approved-images.txt); do
    result=$(docker scout cves "$image" --only-severity critical 2>&1)
    if echo "$result" | grep -q "critical"; then
        echo "ALERT: $image has new critical vulnerabilities"
        # Send notification to your team
    fi
done
```

## Wrapping Up

Image allow lists are a foundational security control for Docker environments. Start with CI/CD checks for base image compliance, add registry-level controls with a curated private registry, and enforce at runtime with OPA or Kubernetes admission controllers. Layer these approaches for defense in depth, because no single layer catches everything.
