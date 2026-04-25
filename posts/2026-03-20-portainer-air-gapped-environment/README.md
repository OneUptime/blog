# How to Set Up Portainer in an Air-Gapped Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Air-Gap, Installation, Offline

Description: Learn how to install and configure Portainer in an air-gapped (offline) environment, including container image transfer, Helm chart setup, and managing private registries without internet access.

## Introduction

Air-gapped environments have no internet connectivity, which is common in defense, financial, and healthcare sectors. Installing Portainer in these environments requires transferring all required images and packages manually before installation. This guide covers the complete process for setting up a fully functional Portainer deployment with no internet access required.

## Prerequisites

- A machine with internet access (for downloading artifacts)
- Transfer mechanism to air-gapped environment (USB, secured file transfer)
- Docker installed on the air-gapped host
- Sufficient disk space for images

## Step 1: Download Required Images on Internet-Connected Machine

```bash
#!/bin/bash
# download-portainer-images.sh - Run on internet-connected machine

OUTPUT_DIR="./portainer-air-gap"
PORTAINER_TAG="lts"
mkdir -p "$OUTPUT_DIR"

# Define images to download

IMAGES=(
  "portainer/portainer-ce:${PORTAINER_TAG}"
  "portainer/agent:${PORTAINER_TAG}"
  "portainer/portainer-ee:${PORTAINER_TAG}"  # If using BE
)

for IMAGE in "${IMAGES[@]}"; do
  echo "Pulling: $IMAGE"
  docker pull "$IMAGE"

  # Create a safe filename from the image name
  FILENAME=$(echo "$IMAGE" | tr '/:' '-')
  echo "Saving: $FILENAME.tar"
  docker save "$IMAGE" -o "${OUTPUT_DIR}/${FILENAME}.tar"
done

echo "Images saved to $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
```

## Step 2: Download Additional Required Images

```bash
# Additional images for common use cases

# Local registry image used later in this guide
docker pull registry:3
docker save registry:3 -o portainer-air-gap/registry-3.tar

# Common base images your applications might need
COMMON_IMAGES=(
  "nginx:1.25-alpine"
  "alpine:3.19"
  "postgres:15-alpine"
  "redis:7-alpine"
)

for IMAGE in "${COMMON_IMAGES[@]}"; do
  docker pull "$IMAGE"
  FILENAME=$(echo "$IMAGE" | tr '/:' '-')
  docker save "$IMAGE" -o "portainer-air-gap/${FILENAME}.tar"
done

# Package everything for transport
tar -czf portainer-air-gap.tar.gz portainer-air-gap/
sha256sum portainer-air-gap.tar.gz > portainer-air-gap.tar.gz.sha256
```

## Step 3: Transfer to Air-Gapped Environment

```bash
# On internet-connected machine: transfer via secure USB or file transfer
# Verify integrity before transfer
sha256sum portainer-air-gap.tar.gz

# On air-gapped machine: verify after transfer
sha256sum -c portainer-air-gap.tar.gz.sha256
```

## Step 4: Load Images on Air-Gapped Host

```bash
# On air-gapped machine

# Extract the archive
tar -xzf portainer-air-gap.tar.gz
cd portainer-air-gap

# Load all images
for TAR_FILE in *.tar; do
  echo "Loading: $TAR_FILE"
  docker load -i "$TAR_FILE"
done

# Verify all images are loaded
docker images | grep -E "(portainer|registry|nginx|postgres|redis)"
```

## Step 5: Install Portainer on Air-Gapped Host

```bash
# Create volumes
docker volume create portainer_data

# Start Portainer (now uses local image - no internet pull needed)
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

echo "Portainer started. Access at: https://$(hostname -I | awk '{print $1}'):9443"
```

## Step 6: Configure a Private Registry for Air-Gapped Environment

Set up a local registry to serve images without internet:

```bash
# Start a local Docker registry
docker run -d \
  --name local-registry \
  --restart=unless-stopped \
  -p 5000:5000 \
  -v /opt/registry/data:/var/lib/registry \
  registry:3

# Push images to local registry
docker tag portainer/portainer-ce:lts localhost:5000/portainer-ce:lts
docker push localhost:5000/portainer-ce:lts

# Tag and push all common images
for IMAGE in nginx:1.25-alpine postgres:15-alpine redis:7-alpine alpine:3.19; do
  docker tag $IMAGE localhost:5000/$IMAGE
  docker push localhost:5000/$IMAGE
  echo "Pushed: localhost:5000/$IMAGE"
done
```

## Step 7: Configure Portainer to Use Local Registry

1. Log into Portainer.
2. Go to **Registries** → **Add registry**.
3. Enter:
   - **Type**: Custom Registry
   - **Name**: Local Air-Gap Registry
   - **URL**: `http://your-server-ip:5000`
   - **Authentication**: Enable if your registry requires it
4. Save.

Now all image deployments can reference `your-server-ip:5000/image:tag`.

## Step 8: Configure Docker Daemon to Trust Local Registry

Example `/etc/docker/daemon.json` for an HTTP registry:

```json
{
  "insecure-registries": ["your-server-ip:5000"],
  "live-restore": true
}
```

```bash
sudo systemctl restart docker
```

## Step 9: Air-Gapped Portainer Updates

When Portainer releases new versions:

```bash
# On internet-connected machine:
PORTAINER_TAG="lts"
docker pull portainer/portainer-ce:${PORTAINER_TAG}
docker save portainer/portainer-ce:${PORTAINER_TAG} -o portainer-ce-${PORTAINER_TAG}.tar

# Transfer to air-gapped environment
# On air-gapped machine:
docker load -i portainer-ce-${PORTAINER_TAG}.tar

# Stop old container and start with new image
docker stop portainer && docker rm portainer
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:${PORTAINER_TAG}
```

## Step 10: Helm Charts for Air-Gapped Kubernetes

For Kubernetes deployments:

Make sure each Kubernetes node can reach and trust `your-server-ip:5000` in its configured container runtime before installing the chart.

```bash
# On internet-connected machine: download Helm chart
PORTAINER_CHART_VERSION="2.39.0"
mkdir -p charts
helm repo add portainer https://portainer.github.io/k8s/
helm repo update
helm pull portainer/portainer --version "${PORTAINER_CHART_VERSION}" --destination ./charts/

# Package charts directory
tar -czf helm-charts-offline.tar.gz charts/

# On air-gapped cluster: install from local chart
helm install portainer ./charts/portainer-${PORTAINER_CHART_VERSION}.tgz \
  --namespace portainer \
  --create-namespace \
  --set image.repository=your-server-ip:5000/portainer-ce \
  --set image.tag=lts
```

## Conclusion

Setting up Portainer in an air-gapped environment requires careful pre-planning: download all required images before disconnecting from the internet, transfer them securely, and set up a local registry to serve images to your containers. The air-gapped setup is functionally identical to a standard deployment - Portainer doesn't require internet access to operate after initial setup. Establish a regular update process to periodically bring in new image versions through your approved transfer mechanism.
