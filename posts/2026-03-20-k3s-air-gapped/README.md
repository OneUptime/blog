# How to Install K3s in an Air-Gapped Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Air-Gapped, Offline, Security

Description: A complete guide to deploying K3s in environments without internet access, including image pre-loading and private registry configuration.

## Introduction

Air-gapped environments - networks isolated from the internet for security or compliance reasons - require a different approach to software deployment. K3s supports fully offline installation by providing pre-bundled container image archives and allowing all components to be downloaded in advance. This guide covers the complete process for air-gapped K3s deployments.

## Step 1: Download K3s Artifacts on a Connected Machine

From a machine with internet access, download all required files:

```bash
# Set your target K3s version

K3S_VERSION="v1.33.3+k3s1"

# Create a directory for the artifacts
mkdir -p k3s-airgap && cd k3s-airgap

# Download the K3s binary
curl -LO "https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s"
# For ARM64:
# curl -LO "https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s-arm64"
# For ARMv7:
# curl -LO "https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s-armhf"

# Download the install script
curl -Lo install.sh https://get.k3s.io
chmod +x install.sh

# Download the air-gap image archive
curl -LO "https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s-airgap-images-amd64.tar.zst"
# For ARM64:
# curl -LO "https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/k3s-airgap-images-arm64.tar.zst"

# Download the SHA256 checksum for verification
curl -LO "https://github.com/k3s-io/k3s/releases/download/${K3S_VERSION}/sha256sum-amd64.txt"

# Verify the downloads
sha256sum -c sha256sum-amd64.txt --ignore-missing
```

## Step 2: Transfer Files to Air-Gapped Machines

```bash
# Transfer via SCP, USB drive, or other approved method
# Example using SCP (if the air-gapped machine is reachable via a jump host)
scp -r k3s-airgap/ user@airgap-host:/tmp/k3s-airgap/

# Or burn to a USB drive
sudo cp -r k3s-airgap/ /media/usb-drive/
```

## Step 3: Install K3s Air-Gapped (Server Node)

On the air-gapped server node:

```bash
# Navigate to the transferred artifacts
cd /tmp/k3s-airgap/

# Install the K3s binary
sudo install -o root -g root -m 0755 k3s /usr/local/bin/k3s

# Pre-load the container images into K3s's image directory
sudo mkdir -p /var/lib/rancher/k3s/agent/images/
sudo cp k3s-airgap-images-amd64.tar.zst /var/lib/rancher/k3s/agent/images/

# Create K3s configuration
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# Air-gapped cluster configuration
token: "AirGapToken123"
tls-san:
  - 192.168.10.100
  - k3s.internal

# Point to private registry for any custom images
# private-registry: "/etc/rancher/k3s/registries.yaml"
EOF

# Run the install script with the INSTALL_K3S_SKIP_DOWNLOAD flag
INSTALL_K3S_SKIP_DOWNLOAD=true sudo -E ./install.sh

# Start K3s
sudo systemctl enable k3s
sudo systemctl start k3s

# Monitor startup (images load from the pre-loaded archive)
sudo journalctl -u k3s -f
```

## Step 4: Install K3s Agent (Air-Gapped)

On each air-gapped worker node:

```bash
cd /tmp/k3s-airgap/

# Install the binary
sudo install -o root -g root -m 0755 k3s /usr/local/bin/k3s

# Pre-load images
sudo mkdir -p /var/lib/rancher/k3s/agent/images/
sudo cp k3s-airgap-images-amd64.tar.zst /var/lib/rancher/k3s/agent/images/

# Create agent configuration
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://192.168.10.100:6443"
token: "AirGapToken123"
EOF

# Install as agent
INSTALL_K3S_SKIP_DOWNLOAD=true \
INSTALL_K3S_EXEC="agent" \
sudo -E ./install.sh

sudo systemctl enable k3s-agent
sudo systemctl start k3s-agent
```

## Step 5: Set Up a Private Container Registry

For your own application images, set up an internal registry:

```bash
# Deploy a private registry (on a connected machine or internal server)
# Using the official registry image
docker run -d \
    -p 5000:5000 \
    --name registry \
    --restart=always \
    -v /opt/registry:/var/lib/registry \
    registry:3

# If registry.internal:5000 is plain HTTP, configure the Docker daemon on this
# machine to treat it as an insecure registry before pushing to it.
# Example /etc/docker/daemon.json:
# {
#   "insecure-registries": ["registry.internal:5000"]
# }
# Restart Docker after updating daemon.json.

# Push images to the private registry
docker pull nginx:alpine
docker tag nginx:alpine registry.internal:5000/library/nginx:alpine
docker push registry.internal:5000/library/nginx:alpine
```

Configure each K3s node to use the private registry:

```bash
sudo tee /etc/rancher/k3s/registries.yaml > /dev/null <<EOF
mirrors:
  "docker.io":
    endpoint:
      - "http://registry.internal:5000"
EOF

# Restart K3s to apply registry settings on server nodes
sudo systemctl restart k3s

# Restart K3s to apply registry settings on worker nodes
sudo systemctl restart k3s-agent
```

## Step 6: Pre-Loading Additional Images

For application images, pre-load them into the K3s image store:

```bash
# On a connected machine, save images to tar files
docker pull my-app:1.0
docker save -o my-app-1.0.tar my-app:1.0

# Transfer to the air-gapped node
scp my-app-1.0.tar user@airgap-node:/tmp/

# On the air-gapped node, import into containerd
sudo /usr/local/bin/k3s ctr images import /tmp/my-app-1.0.tar

# Verify the image is loaded
sudo /usr/local/bin/k3s ctr images list | grep my-app
```

## Step 7: Verify the Air-Gapped Installation

```bash
# Configure kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Check nodes are Ready
kubectl get nodes

# Check system pods (should start from pre-loaded images)
kubectl get pods -n kube-system

# Deploy a test workload using the mirrored image
kubectl create deployment test --image=nginx:alpine
kubectl rollout status deployment/test
kubectl delete deployment test
```

## Step 8: Prepare Air-Gapped Update Bundles

Create a script to prepare update bundles in air-gapped environments:

```bash
#!/bin/bash
# k3s-airgap-update.sh
# Run on a connected machine to prepare update bundles

NEW_VERSION="v1.34.7+k3s1"
OUTPUT_DIR="k3s-update-${NEW_VERSION}"
mkdir -p "$OUTPUT_DIR"

# Download new binary and images
curl -L "https://github.com/k3s-io/k3s/releases/download/${NEW_VERSION}/k3s" \
    -o "${OUTPUT_DIR}/k3s"
curl -L "https://github.com/k3s-io/k3s/releases/download/${NEW_VERSION}/k3s-airgap-images-amd64.tar.zst" \
    -o "${OUTPUT_DIR}/k3s-airgap-images-amd64.tar.zst"
curl -L https://get.k3s.io -o "${OUTPUT_DIR}/install.sh"

chmod +x "${OUTPUT_DIR}/k3s" "${OUTPUT_DIR}/install.sh"

# Create a tarball for transfer
tar -czf "k3s-update-${NEW_VERSION}.tar.gz" "$OUTPUT_DIR/"
echo "Update bundle ready: k3s-update-${NEW_VERSION}.tar.gz"
```

## Conclusion

K3s's air-gapped installation mode is straightforward: download the binary, install script, and image archive on a connected machine, transfer them to the isolated environment, then run the install script with `INSTALL_K3S_SKIP_DOWNLOAD=true`. For custom application images, set up a private registry and configure K3s's registry mirrors. The image pre-loading mechanism ensures that all system components start without requiring any outbound connections, making K3s an excellent choice for secure, isolated deployments.
