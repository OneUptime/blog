# How to Pull an Image from a Specific Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Registry

Description: Learn how to pull container images from specific registries using Podman, including Docker Hub, Quay.io, Red Hat Registry, and private registries.

---

> Specifying the exact registry when pulling images eliminates ambiguity and ensures you get the image from the source you trust.

When working with multiple container registries, it is important to be explicit about where your images come from. Podman supports pulling from any OCI-compliant registry, and this guide shows you how to target specific registries for your image pulls.

---

## Understanding Registry URLs

A fully qualified image reference follows this pattern:

```bash
# Format: registry/namespace/image:tag

# Examples:
# docker.io/library/nginx:latest
# quay.io/prometheus/prometheus:v2.50.0
# registry.access.redhat.com/ubi9/ubi:9.3
# ghcr.io/owner/image:tag
```

## Pulling from Docker Hub

Docker Hub is the default public registry for most container images.

```bash
# Pull an official image from Docker Hub
podman pull docker.io/library/nginx:1.25

# Pull a community image from Docker Hub
podman pull docker.io/bitnami/postgresql:16

# Pull using the short form (if docker.io is in your search registries)
podman pull grafana/grafana:10.3.1
```

Official images on Docker Hub live under the `library` namespace. Community images use the publisher's username or organization name.

## Pulling from Quay.io

Quay.io is a Red Hat-owned container registry service and hosts many popular open-source images.

```bash
# Pull Prometheus from Quay.io
podman pull quay.io/prometheus/prometheus:v2.50.0

# Pull etcd from Quay.io
podman pull quay.io/coreos/etcd:v3.5.12

# Pull a Quay.io hosted operator image
podman pull quay.io/strimzi/kafka:0.40.0-kafka-3.7.0
```

## Pulling from Red Hat Container Registry

Red Hat provides certified container images through their registries.

```bash
# Pull Universal Base Image (UBI) from Red Hat
podman pull registry.access.redhat.com/ubi9/ubi:9.3

# Pull UBI minimal image
podman pull registry.access.redhat.com/ubi9/ubi-minimal:9.3

# Pull from the authenticated Red Hat registry
podman login registry.redhat.io
podman pull registry.redhat.io/rhel9/postgresql-15:latest
```

## Pulling from GitHub Container Registry

GitHub Container Registry (ghcr.io) hosts images associated with GitHub repositories.

```bash
# Login to GitHub Container Registry
echo YOUR_GITHUB_TOKEN | podman login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull a public image from GHCR
podman pull ghcr.io/actions/actions-runner:latest

# Pull an organization's image
podman pull ghcr.io/my-org/my-app:v1.0.0
```

## Pulling from Amazon ECR

Amazon Elastic Container Registry requires authentication before pulling.

```bash
# Authenticate with AWS ECR (requires AWS CLI)
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Pull from ECR
podman pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

## Pulling from Google Artifact Registry

Google Artifact Registry is the recommended registry for GCP users.

```bash
# Authenticate with Google Artifact Registry
gcloud auth print-access-token | \
  podman login -u oauth2accesstoken --password-stdin \
  us-docker.pkg.dev

# Pull from Google Artifact Registry
podman pull us-docker.pkg.dev/my-project/my-repo/my-image:latest
```

## Pulling from a Local or Private Registry

Private registries are common in enterprise environments.

```bash
# Pull from a private registry on your network
podman pull myregistry.example.com:5000/team/app:v2.1.0

# If the registry uses self-signed certificates
podman pull --tls-verify=false myregistry.local:5000/app:latest

# Alternatively, add the registry to the trusted list
# Edit /etc/containers/registries.conf or ~/.config/containers/registries.conf
cat >> ~/.config/containers/registries.conf << 'EOF'

[[registry]]
location = "myregistry.local:5000"
insecure = true
EOF
```

## Configuring Registry Search Order

Control which registries Podman searches when you use short image names.

```bash
# View your current registry configuration
podman info --format '{{range index .Registries "search"}}{{.}}{{"\n"}}{{end}}'

# Create or edit user-level configuration
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io", "quay.io", "ghcr.io"]

[[registry]]
location = "myregistry.local:5000"
insecure = true
EOF
```

## Using Registry Mirrors

You can configure registry mirrors for faster pulls or to work in air-gapped environments.

```bash
# Configure a mirror for Docker Hub
cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.example.com:5000"
EOF
```

## Summary

Pulling images from specific registries with Podman is as simple as using the fully qualified image name. Always authenticate to private registries before pulling, and use registry configuration files to manage mirrors, insecure registries, and search order. Being explicit about your image source is a best practice that improves security and reproducibility in your container workflows.
