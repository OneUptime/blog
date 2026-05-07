# How to Install Rancher on an Air-Gapped Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Air-Gapped, Docker, Installation

Description: A detailed guide to installing Rancher in an air-gapped environment without internet access, including mirroring container images and configuring private registries.

Air-gapped environments are networks that have no direct connection to the internet. These are common in government, military, financial, and healthcare organizations where strict security requirements exist. Installing Rancher in such environments requires additional preparation, including mirroring all required container images to a private registry.

This guide walks you through every step needed to deploy Rancher in an air-gapped environment.

## Prerequisites

You will need:

- A workstation with internet access (for downloading images)
- A private container registry accessible from your air-gapped network (such as Harbor, Nexus, or Docker Registry)
- A Kubernetes cluster running in the air-gapped network (v1.27 through v1.30 for Rancher v2.9.3)
- `kubectl` and Helm 3 installed on a machine within the air-gapped network
- `docker` or `skopeo` installed on the internet-connected workstation
- At least 50 GB of disk space for image downloads

## Step 1: Set Up a Private Registry

If you do not already have a private registry, you can set one up using Docker:

```bash
docker run -d \
  -p 5000:5000 \
  --name registry \
  --restart=unless-stopped \
  -v /opt/registry:/var/lib/registry \
  registry:2
```

For production use, configure the registry with TLS certificates and authentication.

## Step 2: Download the Rancher Image List

On your internet-connected workstation, download the list of images required by Rancher:

```bash
RANCHER_VERSION=v2.9.3

# Download the rancher-images.txt file

curl -LO https://github.com/rancher/rancher/releases/download/${RANCHER_VERSION}/rancher-images.txt

# Download the rancher-save-images.sh script
curl -LO https://github.com/rancher/rancher/releases/download/${RANCHER_VERSION}/rancher-save-images.sh

# Download the rancher-load-images.sh script
curl -LO https://github.com/rancher/rancher/releases/download/${RANCHER_VERSION}/rancher-load-images.sh

chmod +x rancher-save-images.sh rancher-load-images.sh
```

## Step 3: Mirror cert-manager Images

Since Rancher depends on cert-manager, add the cert-manager images to the list:

```bash
CERT_MANAGER_VERSION=v1.14.4

# Add cert-manager images
echo "quay.io/jetstack/cert-manager-controller:${CERT_MANAGER_VERSION}" >> rancher-images.txt
echo "quay.io/jetstack/cert-manager-webhook:${CERT_MANAGER_VERSION}" >> rancher-images.txt
echo "quay.io/jetstack/cert-manager-cainjector:${CERT_MANAGER_VERSION}" >> rancher-images.txt
echo "quay.io/jetstack/cert-manager-startupapicheck:${CERT_MANAGER_VERSION}" >> rancher-images.txt
echo "quay.io/jetstack/cert-manager-acmesolver:${CERT_MANAGER_VERSION}" >> rancher-images.txt
```

## Step 4: Save Images to a Tar Archive

Pull all required images and save them to a tar file:

```bash
# Sort and remove duplicates
sort -u rancher-images.txt -o rancher-images.txt

# Save all images to a tar archive
./rancher-save-images.sh --image-list ./rancher-images.txt
```

This process can take a significant amount of time depending on your internet connection. It will create a `rancher-images.tar.gz` file.

## Step 5: Transfer Files to the Air-Gapped Network

Transfer the following files to a machine within the air-gapped network using a secure transfer method such as a USB drive or secure file transfer:

- `rancher-images.tar.gz`
- `rancher-images.txt`
- `rancher-load-images.sh`
- Rancher Helm chart (download it separately)
- cert-manager Helm chart and CRDs

Download the Helm charts while still on the internet-connected workstation:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm pull rancher-stable/rancher --version ${RANCHER_VERSION}
helm pull jetstack/cert-manager --version ${CERT_MANAGER_VERSION}

# Download cert-manager CRDs
curl -LO https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.crds.yaml
```

## Step 6: Load Images into the Private Registry

On the machine within the air-gapped network, load the images into your private registry:

```bash
REGISTRY=registry.yourdomain.com:5000

./rancher-load-images.sh \
  --image-list ./rancher-images.txt \
  --registry ${REGISTRY}
```

If you prefer to tag and push the images manually with Docker instead:

```bash
# Load the tar archive
docker load -i rancher-images.tar.gz

# Tag and push each image
while IFS= read -r image; do
  source_image="${image}"
  target_image="${REGISTRY}/${image}"
  docker tag "${source_image}" "${target_image}"
  docker push "${target_image}"
done < rancher-images.txt
```

## Step 7: Install cert-manager

Apply the cert-manager CRDs:

```bash
kubectl apply -f cert-manager.crds.yaml
```

Install cert-manager using the downloaded Helm chart with the private registry:

```bash
kubectl create namespace cert-manager

helm install cert-manager ./cert-manager-${CERT_MANAGER_VERSION}.tgz \
  --namespace cert-manager \
  --set image.repository=${REGISTRY}/quay.io/jetstack/cert-manager-controller \
  --set webhook.image.repository=${REGISTRY}/quay.io/jetstack/cert-manager-webhook \
  --set cainjector.image.repository=${REGISTRY}/quay.io/jetstack/cert-manager-cainjector \
  --set startupapicheck.image.repository=${REGISTRY}/quay.io/jetstack/cert-manager-startupapicheck
```

## Step 8: Install Rancher

Create the Rancher namespace and install using the downloaded chart:

```bash
kubectl create namespace cattle-system

helm install rancher ./rancher-${RANCHER_VERSION#v}.tgz \
  --namespace cattle-system \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=yourSecurePassword \
  --set replicas=3 \
  --set certmanager.version=${CERT_MANAGER_VERSION} \
  --set rancherImage=${REGISTRY}/rancher/rancher \
  --set systemDefaultRegistry=${REGISTRY} \
  --set useBundledSystemChart=true
```

The `systemDefaultRegistry` setting tells Rancher to pull all system images from your private registry instead of Docker Hub.

## Step 9: Verify the Installation

Check the deployment status:

```bash
kubectl rollout status deployment rancher -n cattle-system
kubectl get pods -n cattle-system
```

Access the Rancher UI at `https://rancher.yourdomain.com` and complete the initial setup.

## Configuring Downstream Clusters

When creating downstream clusters in the air-gapped environment, configure them to use your private registry. In the Rancher UI, go to the cluster settings and set the system default registry to your private registry address.

## Troubleshooting

Common issues in air-gapped environments:

- **Image pull errors**: Verify all images are available in the private registry using `docker pull ${REGISTRY}/image:tag`
- **Certificate issues**: Ensure the private registry's TLS certificate is trusted by all nodes
- **DNS resolution**: Confirm that the registry hostname resolves correctly within the air-gapped network

```bash
# Check for image pull errors
kubectl get events -n cattle-system --field-selector reason=Failed

# Verify registry connectivity
curl -k https://${REGISTRY}/v2/_catalog
```

## Conclusion

You have successfully installed Rancher in an air-gapped environment. This setup ensures that your Kubernetes management platform operates entirely within your secured network. Remember to repeat the image mirroring process whenever you upgrade Rancher or add new features that require additional container images.
