# How to Install RKE2 in an Air-Gapped Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Air-Gapped, Installation, Security, Offline

Description: Learn how to install RKE2 in an air-gapped (offline) environment where nodes have no direct internet access, using pre-downloaded artifacts.

Air-gapped environments are isolated networks with no direct internet access, commonly used in government, defense, financial, and healthcare sectors for security reasons. Installing RKE2 in an air-gapped environment requires pre-downloading all necessary artifacts and setting up a private registry. This guide covers the complete air-gapped installation process.

## Prerequisites

- A machine with internet access for downloading artifacts
- A private container registry (Harbor, Nexus, or similar)
- A file server or shared storage accessible by all cluster nodes
- A fixed registration address (load balancer, DNS name, or virtual IP) for multi-server clusters
- Linux nodes (Ubuntu, CentOS, Rocky Linux, etc.) with no internet access
- SSH access to all nodes

## Step 1: Download RKE2 Artifacts on an Internet-Connected Machine

```bash
# Set the RKE2 version to download

RKE2_VERSION="v1.34.6+rke2r3"

# Create a directory for artifacts
mkdir -p ~/rke2-artifacts && cd ~/rke2-artifacts

# Download the RKE2 installation script
curl -sfL https://get.rke2.io -o install.sh
chmod +x install.sh

# Download RKE2 binaries and checksum
# For amd64 (x86_64) systems:
curl -LO https://github.com/rancher/rke2/releases/download/${RKE2_VERSION}/rke2.linux-amd64.tar.gz
curl -LO https://github.com/rancher/rke2/releases/download/${RKE2_VERSION}/sha256sum-amd64.txt

# Download the RKE2 images tarball
# This includes all container images needed by RKE2
curl -LO https://github.com/rancher/rke2/releases/download/${RKE2_VERSION}/rke2-images.linux-amd64.tar.zst

# Verify checksum
sha256sum -c sha256sum-amd64.txt --ignore-missing

echo "All artifacts downloaded successfully"
ls -lh ~/rke2-artifacts/
```

## Step 2: Transfer Artifacts to Air-Gapped Nodes

```bash
# Copy artifacts to each server node
# Using scp (or rsync for large files)
for SERVER in server1 server2 server3; do
  echo "Copying to $SERVER..."
  ssh "$SERVER" "mkdir -p ~/rke2-artifacts"

  # Copy the complete offline artifact set
  scp ~/rke2-artifacts/install.sh \
    ~/rke2-artifacts/rke2.linux-amd64.tar.gz \
    ~/rke2-artifacts/sha256sum-amd64.txt \
    ~/rke2-artifacts/rke2-images.linux-amd64.tar.zst \
    "$SERVER:~/rke2-artifacts/"
done

# For worker nodes
for WORKER in worker1 worker2 worker3; do
  echo "Copying to $WORKER..."
  ssh "$WORKER" "mkdir -p ~/rke2-artifacts"
  scp ~/rke2-artifacts/install.sh \
    ~/rke2-artifacts/rke2.linux-amd64.tar.gz \
    ~/rke2-artifacts/sha256sum-amd64.txt \
    ~/rke2-artifacts/rke2-images.linux-amd64.tar.zst \
    "$WORKER:~/rke2-artifacts/"
done
```

## Step 3: Install RKE2 on Air-Gapped Nodes

```bash
# On each server node - Run the installation in air-gapped mode
# The INSTALL_RKE2_ARTIFACT_PATH tells the installer to use local files

# Set the path to the artifacts
ARTIFACT_DIR="${HOME}/rke2-artifacts"

# On server nodes, install the RKE2 server service
sudo env INSTALL_RKE2_ARTIFACT_PATH="${ARTIFACT_DIR}" \
  sh "${ARTIFACT_DIR}/install.sh"

# On worker nodes, run this instead to install the agent service
sudo env INSTALL_RKE2_ARTIFACT_PATH="${ARTIFACT_DIR}" \
  INSTALL_RKE2_TYPE="agent" \
  sh "${ARTIFACT_DIR}/install.sh"

# The installer will:
# 1. Extract the RKE2 binary
# 2. Install the container image tarball under /var/lib/rancher/rke2/agent/images/
# 3. Create systemd service files

echo "RKE2 installed from local artifacts"
```

## Step 4: Configure Private Registry

```bash
# Create registries.yaml on every server and worker node to use a private registry mirror
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/registries.yaml
disable-default-registry-endpoint: true
mirrors:
  # Mirror Docker Hub through private registry
  "docker.io":
    endpoint:
    - "https://registry.internal.example.com"

  # Mirror ghcr.io
  "ghcr.io":
    endpoint:
    - "https://registry.internal.example.com"

  # Mirror quay.io
  "quay.io":
    endpoint:
    - "https://registry.internal.example.com"

configs:
  # TLS configuration for private registry
  "registry.internal.example.com":
    tls:
      ca_file: "/etc/ssl/certs/internal-ca.crt"
      # Or skip TLS verification (NOT recommended for production)
      # insecure_skip_verify: true
    auth:
      username: "rke2-puller"
      password: "registry-password"
EOF
```

## Step 5: Configure and Start RKE2 Servers and Agents

```bash
# On the first server node, create the RKE2 server configuration.
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# No internet access - use private registry
system-default-registry: registry.internal.example.com

# Shared token for joining additional server and worker nodes
token: "replace-with-a-strong-shared-secret"

# TLS SANs
tls-san:
  - "rke2-api.internal.example.com"
  - "$(hostname -I | awk '{print $1}')"
  - "$(hostname -f)"

# Air-gapped specific settings
write-kubeconfig-mode: "0644"
EOF
```

```bash
# On each additional server node, use the same token and join the first server or fixed registration address
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
system-default-registry: registry.internal.example.com
server: https://rke2-api.internal.example.com:9345
token: "replace-with-a-strong-shared-secret"
tls-san:
  - "rke2-api.internal.example.com"
  - "$(hostname -I | awk '{print $1}')"
  - "$(hostname -f)"
write-kubeconfig-mode: "0644"
EOF
```

```bash
# Start RKE2 on each server after writing the correct config
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service

# Monitor startup (images load from local tarball)
sudo journalctl -u rke2-server -f
```

```bash
# On each worker node, configure and start the agent
sudo mkdir -p /etc/rancher/rke2/

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
system-default-registry: registry.internal.example.com
server: https://rke2-api.internal.example.com:9345
token: "replace-with-a-strong-shared-secret"
EOF

sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service
```

## Step 6: Install Helm Charts in Air-Gapped Mode

```bash
# Download Helm charts on internet-connected machine
RANCHER_VERSION="2.13.3"
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm pull rancher-stable/rancher --version ${RANCHER_VERSION}

# Transfer to air-gapped environment
scp rancher-${RANCHER_VERSION}.tgz server1:~/

# Before installing Rancher, sync Rancher and cert-manager images
# to the private registry using the Rancher air-gap image scripts.
# If you use Rancher's default self-signed TLS, install cert-manager
# from a local chart before running this command.

# On the server, install from local chart
helm install rancher ~/rancher-${RANCHER_VERSION}.tgz \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.internal.example.com \
  --set replicas=3 \
  --set bootstrapPassword=admin \
  --set image.registry=registry.internal.example.com \
  --set systemDefaultRegistry=registry.internal.example.com \
  --set useBundledSystemChart=true
```

## Step 7: Synchronize Images to Private Registry

```bash
# Script to sync required images to private registry
# Run on an internet-connected machine with access to the private registry

cat > sync-images.sh << 'EOF'
#!/bin/bash
PRIVATE_REGISTRY="registry.internal.example.com"
RKE2_VERSION="v1.34.6+rke2r3"

# Download the images list
curl -LO https://github.com/rancher/rke2/releases/download/${RKE2_VERSION}/rke2-images-all.linux-amd64.txt

# Pull and push each image
while IFS= read -r image; do
  [ -z "$image" ] && continue
  echo "Syncing: $image"
  docker pull "$image"

  # Retag for private registry
  LOCAL_IMAGE="${PRIVATE_REGISTRY}/${image#*/}"
  docker tag "$image" "$LOCAL_IMAGE"
  docker push "$LOCAL_IMAGE"
done < rke2-images-all.linux-amd64.txt

echo "Image sync complete"
EOF

chmod +x sync-images.sh
```

## Conclusion

Installing RKE2 in an air-gapped environment requires careful preparation and planning, but the process is well-documented and reliable once you have all artifacts prepared. The key success factors are: pre-downloading all container images, setting up a private registry mirror for ongoing operations, and ensuring the RKE2 configuration points to your internal infrastructure. Air-gapped RKE2 clusters can be fully managed by an on-premises Rancher installation, providing the same capabilities as internet-connected deployments.
