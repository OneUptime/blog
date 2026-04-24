# How to Configure Rancher for Air-Gapped Enterprise Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Air-Gap, Enterprise, Disconnected, Kubernetes, Security

Description: A step-by-step guide to deploying Rancher in air-gapped enterprise environments, covering image mirroring, private registry setup, and disconnected cluster management.

## Overview

Air-gapped environments - systems with no direct internet connectivity - are common in government, financial services, and high-security enterprise environments. Deploying Rancher in an air-gapped environment requires mirroring all container images to a private registry, configuring package repositories, and setting up an internal Helm chart repository. This guide covers the complete air-gapped Rancher deployment process.

## Architecture

```text
Internet (outside)
        |
  [One-way sync/mirror process]
        |
  Internal Mirror Server
  ├── Harbor (private registry)
  ├── Nexus or JFrog (Helm/package repo)
  └── Gitea or GitLab (Git repo)
        |
  [Air gap - no outbound internet]
        |
  Air-Gapped Environment
  ├── Rancher Management Cluster
  └── Managed Kubernetes Clusters
```

## Step 1: Mirror Container Images

On a machine WITH internet access, download all required images:

```bash
#!/bin/bash
# mirror-rancher-images.sh - Run on internet-connected machine

RANCHER_VERSION="v2.8.3"
RKE2_VERSION="v1.28.6+rke2r1"
REGISTRY_SERVER="harbor.internal.company.com"
REGISTRY_PROJECT="rancher"

# Download Rancher image lists

curl -O https://github.com/rancher/rancher/releases/download/${RANCHER_VERSION}/rancher-images.txt
curl -O https://github.com/rancher/rancher/releases/download/${RANCHER_VERSION}/rancher-save-images.sh
curl -O https://github.com/rancher/rancher/releases/download/${RANCHER_VERSION}/rancher-load-images.sh

chmod +x rancher-save-images.sh rancher-load-images.sh

# Save all images to a tar file
./rancher-save-images.sh \
  --image-list rancher-images.txt \
  --images rancher-images-${RANCHER_VERSION}.tar.gz

echo "Images saved. Transfer rancher-images-${RANCHER_VERSION}.tar.gz to air-gapped environment"
```

## Step 2: Transfer Images to Air-Gapped Environment

```bash
# Transfer via physical media or one-way data diode
# Verify integrity before import
sha256sum rancher-images-v2.8.3.tar.gz > rancher-images-v2.8.3.tar.gz.sha256

# On air-gapped side, verify checksum
sha256sum -c rancher-images-v2.8.3.tar.gz.sha256
```

## Step 3: Load Images into Private Registry

```bash
#!/bin/bash
# load-images-harbor.sh - Run on air-gapped machine

IMAGES_TAR="rancher-images-v2.8.3.tar.gz"
REGISTRY_SERVER="harbor.internal.company.com"
REGISTRY_PROJECT="rancher"

# Login to internal registry
docker login ${REGISTRY_SERVER} \
  --username admin \
  --password "${HARBOR_PASSWORD}"

# Load and push images to Harbor
./rancher-load-images.sh \
  --image-list rancher-images.txt \
  --registry ${REGISTRY_SERVER} \
  --images ${IMAGES_TAR}

echo "All Rancher images loaded into ${REGISTRY_SERVER}/${REGISTRY_PROJECT}"
```

## Step 4: Set Up Internal Helm Repository

```bash
# Download Rancher Helm chart on internet-connected machine
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
helm pull rancher-stable/rancher --version 2.8.3

# Transfer chart tarball to air-gapped environment
# Then host with a simple HTTP server or use Nexus/Harbor

# On air-gapped: Host Helm charts using Harbor OCI or Nexus
helm registry login harbor.internal.company.com \
  --username admin \
  --password "${HARBOR_PASSWORD}"

helm push rancher-2.8.3.tgz oci://harbor.internal.company.com/helm-charts/
```

## Step 5: Install RKE2 Air-Gapped

```bash
# Download RKE2 air-gap bundle on internet machine
mkdir -p /root/rke2-artifacts
cd /root/rke2-artifacts

curl -O https://github.com/rancher/rke2/releases/download/v1.28.6%2Brke2r1/rke2-images.linux-amd64.tar.zst
curl -O https://github.com/rancher/rke2/releases/download/v1.28.6%2Brke2r1/rke2.linux-amd64.tar.gz
curl -O https://github.com/rancher/rke2/releases/download/v1.28.6%2Brke2r1/sha256sum-amd64.txt
curl -sfL https://get.rke2.io --output install.sh

# Transfer to air-gapped nodes, then install:
# On each air-gapped node:
mkdir -p /root/rke2-artifacts
cp install.sh rke2-images.linux-amd64.tar.zst \
  rke2.linux-amd64.tar.gz sha256sum-amd64.txt /root/rke2-artifacts/

# Install RKE2 using the pre-downloaded local artifacts
INSTALL_RKE2_ARTIFACT_PATH=/root/rke2-artifacts \
sh /root/rke2-artifacts/install.sh
```

## Step 6: Configure Private Registry for RKE2

```yaml
# /etc/rancher/rke2/registries.yaml
mirrors:
  "docker.io":
    endpoint:
      - "https://harbor.internal.company.com/docker-hub-proxy"
  "registry.k8s.io":
    endpoint:
      - "https://harbor.internal.company.com/k8s-registry"
  "quay.io":
    endpoint:
      - "https://harbor.internal.company.com/quay-proxy"
  "ghcr.io":
    endpoint:
      - "https://harbor.internal.company.com/ghcr-proxy"
  "harbor.internal.company.com":
    endpoint:
      - "https://harbor.internal.company.com"

configs:
  "harbor.internal.company.com":
    auth:
      username: robot-rke2
      password: "<HARBOR_ROBOT_TOKEN>"
    tls:
      ca_file: /etc/rancher/rke2/harbor-ca.crt
```

## Step 7: Install Rancher from Internal Registry

```bash
# Install Rancher using images from private registry
helm registry login harbor.internal.company.com \
  --username admin \
  --password "${HARBOR_PASSWORD}"

helm install rancher oci://harbor.internal.company.com/helm-charts/rancher \
  --version 2.8.3 \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.internal.company.com \
  --set ingress.tls.source=secret \
  --set rancherImage=harbor.internal.company.com/rancher/rancher \
  --set systemDefaultRegistry=harbor.internal.company.com \
  --set useBundledSystemChart=true
```

## Step 8: Configure Fleet for Air-Gapped GitOps

```yaml
# Fleet GitRepo pointing to internal Git server
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: internal-apps
  namespace: fleet-default
spec:
  repo: https://gitea.internal.company.com/infra/k8s-configs
  branch: main
  # CA certificate for internal Git server TLS
  caBundle: "<BASE64_ENCODED_CA_PEM>"
  clientSecretName: gitea-credentials
  targets:
    - name: all-clusters
      clusterSelector:
        matchLabels:
          environment: production
```

## Step 9: Air-Gap Update Process

When Rancher needs to be updated:

```bash
#!/bin/bash
# update-airgap-rancher.sh

NEW_VERSION="v2.8.4"

# Step 1: On internet-connected machine
# Download new image list
curl -O https://github.com/rancher/rancher/releases/download/${NEW_VERSION}/rancher-images.txt
./rancher-save-images.sh --image-list rancher-images.txt --images rancher-${NEW_VERSION}.tar.gz

# Step 2: Transfer to air-gap environment (via approved transfer method)
# scp or physical media

# Step 3: Load new images into Harbor
./rancher-load-images.sh \
  --image-list rancher-images.txt \
  --registry harbor.internal.company.com \
  --images rancher-${NEW_VERSION}.tar.gz

# Step 4: Update Rancher
helm registry login harbor.internal.company.com \
  --username admin \
  --password "${HARBOR_PASSWORD}"

helm upgrade rancher oci://harbor.internal.company.com/helm-charts/rancher \
  --version ${NEW_VERSION#v} \
  --namespace cattle-system \
  --reuse-values
```

## Compliance and Security in Air-Gap

Air-gapped environments add an extra layer of security:

```yaml
# Kubewarden: Block any images not from internal registry
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-internal-registry
spec:
  module: registry://harbor.internal.company.com/kubewarden/trusted-repos-policy:v2.0.4
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE"]
  settings:
    registries:
      allow:
        - "harbor.internal.company.com"
```

## Conclusion

Air-gapped Rancher deployments require careful upfront planning around image mirroring, registry setup, and update procedures. The primary operational challenge is establishing a reliable, secure process for transferring updates from the internet into the air-gapped environment. Harbor or Nexus as a private registry, combined with RKE2's registry mirror configuration, provides a robust foundation. Once set up, air-gapped Rancher environments operate similarly to internet-connected environments, with the added security of no outbound internet access.
