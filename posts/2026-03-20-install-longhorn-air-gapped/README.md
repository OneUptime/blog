# How to Install Longhorn in an Air-Gapped Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Air-Gapped, Installation, Security

Description: Step-by-step instructions for deploying Longhorn in air-gapped Kubernetes environments where nodes have no direct internet access.

## Introduction

Many production environments, especially in regulated industries or secure government deployments, operate in air-gapped networks with no internet connectivity. Installing Longhorn in such environments requires pre-pulling all container images and manifests to a private registry or local mirror before deployment. This guide covers the complete workflow for an air-gapped Longhorn installation.

## Overview of the Process

1. Pull all required Longhorn images on an internet-connected machine
2. Push images to your private container registry
3. Download the Longhorn manifest and update image references
4. Deploy to the air-gapped cluster

## Step 1: Identify Required Images

On an internet-connected machine, get the list of images for the Longhorn version you want to deploy:

```bash
# Download the image list for Longhorn v1.7.0
# longhorn-images.txt is published as a comma-separated list, so
# normalize it to one image per line for the steps below.

curl -sSfL https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/longhorn-images.txt \
  | tr ',' '\n' > longhorn-images.txt

# View the list of required images
cat longhorn-images.txt
```

The image list includes images for the Longhorn manager, engine, UI, CSI sidecar components, and more.

## Step 2: Pull and Save Images

```bash
# Set your Longhorn version
LONGHORN_VERSION="v1.7.0"

# Pull all images
while IFS= read -r image; do
  echo "Pulling: $image"
  docker pull "$image"
done < longhorn-images.txt

# Save all images to a tar archive for transfer
docker save -o longhorn-images-${LONGHORN_VERSION}.tar \
  $(tr '\n' ' ' < longhorn-images.txt)

# Compress the archive for easier transfer
gzip longhorn-images-${LONGHORN_VERSION}.tar
```

## Step 3: Transfer Images to the Air-Gapped Environment

Transfer the compressed archive to the air-gapped environment using an approved method (USB drive, secure file transfer, etc.):

```bash
# Example: using scp to a jump host (adjust for your environment)
scp longhorn-images-v1.7.0.tar.gz admin@jump-host:/tmp/
```

## Step 4: Load Images and Push to Private Registry

On a machine with access to both the archive and your private registry:

```bash
# Load images from the archive
docker load -i longhorn-images-v1.7.0.tar.gz

# Set your private registry URL
PRIVATE_REGISTRY="registry.internal.example.com:5000"
LONGHORN_VERSION="v1.7.0"

# Re-tag and push each image to your private registry
while IFS= read -r image; do
  # Keep the longhornio/ namespace so the tags match the manifest rewrite
  new_tag="${PRIVATE_REGISTRY}/${image}"
  echo "Tagging $image as $new_tag"
  docker tag "$image" "$new_tag"
  echo "Pushing $new_tag"
  docker push "$new_tag"
done < longhorn-images.txt
```

## Step 5: Download and Modify the Longhorn Manifest

```bash
# Download the Longhorn manifest
curl -sSfL https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/longhorn.yaml \
  -o longhorn.yaml
```

Update all image references to point to your private registry:

```bash
# Replace the default registry with your private registry
# This replaces longhornio/ references with your private registry
sed -i "s|longhornio/|${PRIVATE_REGISTRY}/longhornio/|g" longhorn.yaml
```

Verify the replacements:

```bash
# Check that images now reference your private registry
grep "image:" longhorn.yaml | head -20
```

## Step 6: Configure imagePullSecrets (if needed)

If your private registry requires authentication, create a registry secret:

```bash
# Create a Docker registry secret
kubectl create namespace longhorn-system

kubectl create secret docker-registry longhorn-registry-secret \
  --namespace longhorn-system \
  --docker-server="${PRIVATE_REGISTRY}" \
  --docker-username="your-registry-user" \
  --docker-password="your-registry-password"
```

Add the imagePullSecret to service accounts or add it to the manifest:

```yaml
# Add to relevant ServiceAccount resources in longhorn.yaml
imagePullSecrets:
  - name: longhorn-registry-secret
```

## Step 7: Configure Helm Values for Air-Gapped Install (Helm Method)

If using Helm, create a values file that points Longhorn at your private registry:

```yaml
# longhorn-airgap-values.yaml

# Use your private registry for all Longhorn images
privateRegistry:
  createSecret: true
  registryUrl: "registry.internal.example.com:5000"
  registryUser: "your-registry-user"
  registryPasswd: "your-registry-password"
  registrySecret: "registry-internal-example-com"

# Override individual image settings if needed
# Do not include the registry prefix here; Longhorn adds it automatically.
image:
  longhorn:
    manager:
      repository: longhornio/longhorn-manager
      tag: v1.7.0
    engine:
      repository: longhornio/longhorn-engine
      tag: v1.7.0
    ui:
      repository: longhornio/longhorn-ui
      tag: v1.7.0
```

```bash
# Add the Longhorn Helm repository
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Install using the air-gap values file
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --values longhorn-airgap-values.yaml
```

## Step 8: Apply the Modified Manifest

Transfer the modified `longhorn.yaml` to the air-gapped environment and apply it:

```bash
# Apply the modified manifest
kubectl apply -f longhorn.yaml

# Monitor the pod startup
kubectl get pods -n longhorn-system -w
```

## Step 9: Verify the Installation

```bash
# Confirm pods are pulling images from your private registry
kubectl describe pod -n longhorn-system -l app=longhorn-manager | grep Image:

# Check all pods are running
kubectl get pods -n longhorn-system

# Check Longhorn nodes
kubectl get nodes.longhorn.io -n longhorn-system
```

## Maintaining the Air-Gapped Environment

For future Longhorn upgrades in an air-gapped environment, repeat this process with the new version's image list and manifest. Consider automating the image sync process using a script that runs on a regular basis on an internet-connected machine and pushes updates to your internal registry.

## Conclusion

Installing Longhorn in an air-gapped environment requires extra preparation to handle image distribution and manifest modifications. By following this guide, you can maintain a secure, isolated Kubernetes storage solution that meets your organization's network isolation requirements. Once the initial setup is complete, subsequent upgrades follow the same pattern, making it a repeatable and manageable process.
