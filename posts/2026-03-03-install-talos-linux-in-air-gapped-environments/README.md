# How to Install Talos Linux in Air-Gapped Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Air-Gapped, Security, Kubernetes, Offline Installation

Description: A comprehensive guide to deploying Talos Linux in air-gapped and disconnected environments without internet access.

---

Air-gapped environments - networks with no connection to the public internet - are common in government, military, financial, and healthcare settings. Installing Kubernetes in these environments presents unique challenges because most tools assume they can pull container images and configurations from the internet. Talos Linux handles this scenario well, but it requires careful preparation.

This guide covers everything you need to know to deploy Talos Linux and bootstrap a Kubernetes cluster in a fully air-gapped environment.

## Understanding the Challenge

When you deploy Talos Linux in a connected environment, several things happen automatically. The installer pulls its image from a container registry. Kubernetes components download from public registries. CNI plugins, CoreDNS, and other system components all come from the internet.

In an air-gapped environment, none of this works. You need to:

1. Pre-download all required images and artifacts
2. Set up a local container registry
3. Build custom Talos Linux installation media
4. Configure Talos to use your local registry instead of public ones

## Prerequisites

Before going into the air gap, you need a connected machine to prepare all the assets:

- A connected workstation with Docker installed
- USB drives or portable storage for transferring files
- `talosctl` and `crane` (or `skopeo`) installed on the connected machine
- Knowledge of the Talos Linux version you want to deploy

```bash
# Install talosctl on the connected machine
curl -sL https://talos.dev/install | sh

# Install crane for copying container images
go install github.com/google/go-containerregistry/cmd/crane@latest

# Or use skopeo
sudo apt-get install skopeo
```

## Step 1: Download Talos Linux Assets

On your connected machine, download all the files you will need:

```bash
# Create a directory for all air-gap assets
mkdir -p /tmp/talos-airgap
cd /tmp/talos-airgap

# Download the Talos Linux ISO
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64.iso

# Download talosctl binary for the air-gapped environment
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/talosctl-linux-amd64
chmod +x talosctl-linux-amd64

# Download kubectl
wget https://dl.k8s.io/release/v1.31.0/bin/linux/amd64/kubectl
chmod +x kubectl
```

## Step 2: Collect All Required Container Images

Talos Linux needs several container images to run Kubernetes. You need to identify and download all of them:

```bash
# Generate the list of images required by Talos Linux
talosctl image default

# This outputs a list like:
# ghcr.io/siderolabs/installer:v1.9.0
# registry.k8s.io/kube-apiserver:v1.31.0
# registry.k8s.io/kube-controller-manager:v1.31.0
# registry.k8s.io/kube-scheduler:v1.31.0
# registry.k8s.io/kube-proxy:v1.31.0
# registry.k8s.io/coredns/coredns:v1.11.1
# registry.k8s.io/etcd:v3.5.12
# registry.k8s.io/pause:3.9
# ghcr.io/siderolabs/flannel:v0.25.1
# ... and more
```

Save this list and download every image:

```bash
# Save the image list
talosctl image default > image-list.txt

# Create a directory for image tarballs
mkdir -p images

# Download each image as a tarball
while read -r image; do
  # Create a safe filename
  filename=$(echo "$image" | tr '/:' '_')
  echo "Pulling $image..."
  crane pull "$image" "images/${filename}.tar"
done < image-list.txt
```

## Step 3: Set Up a Local Container Registry

Inside your air-gapped network, you need a container registry to serve the images. You can use Docker's registry image, which you also need to bring in:

```bash
# On the connected machine, save the registry image
crane pull registry:2 images/registry_2.tar

# Also download the registry binary if Docker is not available
# in your air-gapped environment
```

Transfer all downloaded assets to your air-gapped network using approved media (USB drives, data diodes, or whatever your security policy permits).

On a machine inside the air-gapped network, set up the registry:

```bash
# Load the registry image
docker load < images/registry_2.tar

# Start the local registry
docker run -d \
  --name registry \
  --restart always \
  -p 5000:5000 \
  -v /var/lib/registry:/var/lib/registry \
  registry:2
```

## Step 4: Push Images to the Local Registry

Load all the Talos and Kubernetes images into your local registry:

```bash
# Push each image to the local registry
LOCAL_REGISTRY="registry.airgap.local:5000"

while read -r image; do
  filename=$(echo "$image" | tr '/:' '_')

  # Determine the new tag for local registry
  # Strip the original registry prefix and add local registry
  new_tag="${LOCAL_REGISTRY}/$(echo $image | sed 's|[^/]*/||')"

  echo "Pushing $image as $new_tag"
  crane push "images/${filename}.tar" "$new_tag"
done < image-list.txt
```

If you are using skopeo instead of crane:

```bash
# Using skopeo to copy from tarball to registry
while read -r image; do
  filename=$(echo "$image" | tr '/:' '_')
  new_tag="${LOCAL_REGISTRY}/$(echo $image | sed 's|[^/]*/||')"

  skopeo copy \
    "docker-archive:images/${filename}.tar" \
    "docker://${new_tag}" \
    --dest-tls-verify=false
done < image-list.txt
```

## Step 5: Generate Talos Configuration for Air-Gap

Generate the Talos machine configuration with registry mirrors pointing to your local registry:

```bash
# Generate base configuration
talosctl gen config airgap-cluster https://<CONTROL_PLANE_IP>:6443

# Edit controlplane.yaml to add registry mirrors
```

Add registry mirror configuration to your machine configs:

```yaml
# In controlplane.yaml and worker.yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - http://registry.airgap.local:5000
      ghcr.io:
        endpoints:
          - http://registry.airgap.local:5000
      registry.k8s.io:
        endpoints:
          - http://registry.airgap.local:5000
    config:
      registry.airgap.local:5000:
        tls:
          insecureSkipVerify: true
  install:
    image: registry.airgap.local:5000/siderolabs/installer:v1.9.0
```

## Step 6: Create Custom Boot Media

For the initial boot, you have the ISO you downloaded earlier. Flash it to USB drives:

```bash
# Write the ISO to a USB drive
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

Alternatively, if you have PXE infrastructure inside the air-gapped network, set up PXE boot using the assets you transferred.

## Step 7: Deploy and Bootstrap

Boot your machines from the USB drives or PXE, then apply configurations:

```bash
# Apply control plane configuration
./talosctl-linux-amd64 apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml

# After reboot, bootstrap the cluster
./talosctl-linux-amd64 config endpoint <CONTROL_PLANE_IP>
./talosctl-linux-amd64 config node <CONTROL_PLANE_IP>
./talosctl-linux-amd64 bootstrap

# Wait for health
./talosctl-linux-amd64 health

# Get kubeconfig
./talosctl-linux-amd64 kubeconfig ./kubeconfig
./kubectl --kubeconfig=./kubeconfig get nodes
```

## Handling Updates in Air-Gapped Environments

When a new version of Talos Linux is released, you need to repeat the image download process on your connected machine and transfer the new assets:

```bash
# On the connected machine - download new version assets
NEW_VERSION="v1.10.0"
talosctl image default --kubernetes-version 1.32.0 > image-list-new.txt

# Download new images
while read -r image; do
  filename=$(echo "$image" | tr '/:' '_')
  crane pull "$image" "images-new/${filename}.tar"
done < image-list-new.txt

# Transfer to air-gapped network and push to local registry
```

## DNS Configuration

Inside the air-gapped network, make sure DNS resolves your registry hostname:

```bash
# Add a DNS entry for your registry
# Or use /etc/hosts on each management machine
echo "192.168.1.50 registry.airgap.local" >> /etc/hosts
```

Talos Linux nodes will use the registry mirror configuration, so they do not need DNS entries for public registries. They only need to resolve your local registry hostname.

## Troubleshooting

If image pulls fail, check that all images are present in your local registry:

```bash
# List repositories in the local registry
curl http://registry.airgap.local:5000/v2/_catalog

# Check tags for a specific image
curl http://registry.airgap.local:5000/v2/siderolabs/installer/tags/list
```

If the Talos installer fails, verify that the installer image is correctly pushed to your local registry and that the machine config points to it.

For certificate issues with the local registry, make sure the `insecureSkipVerify` setting is applied, or set up TLS with a certificate authority trusted inside your air-gapped network.

## Conclusion

Deploying Talos Linux in an air-gapped environment takes more preparation than a connected deployment, but the process is straightforward once you understand the dependencies. The key is thorough preparation on the connected side - download everything, verify it, and package it for transfer. With a local registry serving all the required images and proper mirror configuration in Talos, your air-gapped Kubernetes cluster runs just as smoothly as a connected one.
