# How to Install Istio in an Air-Gapped Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Air-Gapped, Kubernetes, Security, Offline Installation

Description: Complete instructions for installing Istio in an air-gapped Kubernetes cluster with no internet access, including image mirroring and offline Helm charts.

---

Air-gapped environments have zero internet connectivity. This is common in government, defense, financial, and healthcare organizations where security regulations prohibit any connection to the public internet. Installing Istio in these environments requires careful preparation on a connected machine, transferring everything to the isolated network, and then installing from local sources.

## What You Need to Prepare

Before going into the air-gapped network, you need to collect:

1. The `istioctl` binary
2. All container images used by Istio
3. Helm charts (if using Helm)
4. The Istio release archive (contains sample configs and CRDs)

## Step 1: Download Everything on a Connected Machine

### Download istioctl

```bash
ISTIO_VERSION=1.24.0

# Download the release archive
curl -L https://github.com/istio/istio/releases/download/${ISTIO_VERSION}/istio-${ISTIO_VERSION}-linux-amd64.tar.gz -o istio-${ISTIO_VERSION}.tar.gz

# Extract
tar xzf istio-${ISTIO_VERSION}.tar.gz
```

The archive contains `istioctl`, sample configs, and manifests.

### Download Helm Charts

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update

# Pull charts as tarballs
helm pull istio/base --version ${ISTIO_VERSION} -d helm-charts/
helm pull istio/istiod --version ${ISTIO_VERSION} -d helm-charts/
helm pull istio/gateway --version ${ISTIO_VERSION} -d helm-charts/
helm pull istio/cni --version ${ISTIO_VERSION} -d helm-charts/
```

### Download Container Images

Pull all required Istio images:

```bash
ISTIO_VERSION=1.24.0

# Core Istio images
IMAGES=(
  "docker.io/istio/pilot:${ISTIO_VERSION}"
  "docker.io/istio/proxyv2:${ISTIO_VERSION}"
  "docker.io/istio/install-cni:${ISTIO_VERSION}"
)

# Pull and save to tar files
for img in "${IMAGES[@]}"; do
  echo "Pulling ${img}..."
  docker pull ${img}
done

# Save all images to a single tar
docker save ${IMAGES[@]} -o istio-images-${ISTIO_VERSION}.tar

echo "Saved images to istio-images-${ISTIO_VERSION}.tar"
ls -lh istio-images-${ISTIO_VERSION}.tar
```

If you plan to use the Bookinfo sample or observability addons, also download:

```bash
ADDON_IMAGES=(
  "docker.io/istio/examples-bookinfo-productpage-v1:1.20.1"
  "docker.io/istio/examples-bookinfo-details-v1:1.20.1"
  "docker.io/istio/examples-bookinfo-reviews-v1:1.20.1"
  "docker.io/istio/examples-bookinfo-reviews-v2:1.20.1"
  "docker.io/istio/examples-bookinfo-reviews-v3:1.20.1"
  "docker.io/istio/examples-bookinfo-ratings-v1:1.20.1"
  "docker.io/prom/prometheus:v2.51.0"
  "docker.io/grafana/grafana:10.4.1"
  "quay.io/kiali/kiali:v1.82.0"
  "docker.io/jaegertracing/all-in-one:1.56"
)

for img in "${ADDON_IMAGES[@]}"; do
  docker pull ${img}
done

docker save ${ADDON_IMAGES[@]} -o istio-addon-images.tar
```

## Step 2: Transfer to the Air-Gapped Network

Bundle everything into a single directory:

```bash
mkdir istio-airgap-bundle
cp istio-${ISTIO_VERSION}.tar.gz istio-airgap-bundle/
cp istio-images-${ISTIO_VERSION}.tar istio-airgap-bundle/
cp -r helm-charts/ istio-airgap-bundle/
```

Transfer this bundle to your air-gapped environment using approved media (USB drive, DVD, approved file transfer system, etc.).

## Step 3: Load Images into the Air-Gapped Registry

Your air-gapped environment should have an internal container registry (Harbor, Nexus, or a basic Docker registry). Load and push the images:

```bash
INTERNAL_REGISTRY=registry.internal.example.com

# Load images from tar
docker load -i istio-images-${ISTIO_VERSION}.tar

# Tag and push each image
ISTIO_VERSION=1.24.0

for component in pilot proxyv2 install-cni; do
  docker tag docker.io/istio/${component}:${ISTIO_VERSION} \
    ${INTERNAL_REGISTRY}/istio/${component}:${ISTIO_VERSION}

  docker push ${INTERNAL_REGISTRY}/istio/${component}:${ISTIO_VERSION}
done
```

If your nodes use containerd directly (no Docker), use `ctr` or `nerdctl`:

```bash
# Import into containerd
ctr -n k8s.io images import istio-images-${ISTIO_VERSION}.tar

# Tag for internal registry
ctr -n k8s.io images tag docker.io/istio/pilot:${ISTIO_VERSION} \
  ${INTERNAL_REGISTRY}/istio/pilot:${ISTIO_VERSION}

# Push (if using a registry)
ctr -n k8s.io images push ${INTERNAL_REGISTRY}/istio/pilot:${ISTIO_VERSION}
```

## Step 4: Install Using istioctl

Extract the istioctl binary:

```bash
tar xzf istio-${ISTIO_VERSION}.tar.gz
export PATH=$PWD/istio-${ISTIO_VERSION}/bin:$PATH
```

Create an IstioOperator configuration pointing to your internal registry:

```yaml
# istio-airgap.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: registry.internal.example.com/istio
  tag: 1.24.0
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
```

```bash
istioctl install -f istio-airgap.yaml -y
```

## Step 5: Install Using Helm (Alternative)

If you prefer Helm, use the downloaded chart tarballs:

```bash
# Install from local tarballs
helm install istio-base helm-charts/base-${ISTIO_VERSION}.tgz \
  -n istio-system --create-namespace

helm install istiod helm-charts/istiod-${ISTIO_VERSION}.tgz \
  -n istio-system \
  --set global.hub=registry.internal.example.com/istio \
  --set global.tag=${ISTIO_VERSION}

helm install istio-ingress helm-charts/gateway-${ISTIO_VERSION}.tgz \
  -n istio-ingress --create-namespace
```

## Step 6: Verify the Installation

```bash
# Check pods
kubectl get pods -n istio-system

# Verify images are from internal registry
kubectl get pods -n istio-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'

# Run verification
istioctl verify-install -f istio-airgap.yaml

# Analyze configuration
istioctl analyze --all-namespaces
```

## Step 7: Configure Image Pull for Sidecars

When sidecars are injected, they need to pull the `proxyv2` image. Make sure the sidecar injector uses your internal registry:

```bash
# Verify the injector config
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml | grep "image:"
```

It should reference `registry.internal.example.com/istio/proxyv2:1.24.0`.

If your internal registry requires authentication:

```bash
# Create a pull secret
kubectl create secret docker-registry registry-creds \
  -n istio-system \
  --docker-server=registry.internal.example.com \
  --docker-username=user \
  --docker-password=password

# Add to the default service account in each namespace
kubectl patch serviceaccount default -n my-app \
  -p '{"imagePullSecrets": [{"name": "registry-creds"}]}'
```

## Managing Updates

For updates in an air-gapped environment, repeat the process:

1. Download new version images on a connected machine
2. Transfer to the air-gapped network
3. Push to the internal registry
4. Upgrade Istio pointing to the new tag

```bash
# On connected machine
NEW_VERSION=1.24.1
# ... download new images ...

# On air-gapped network
# ... load and push images ...

# Upgrade
istioctl upgrade -f istio-airgap.yaml --set tag=${NEW_VERSION} -y
```

## Automation Script

Here is a script to automate the preparation on the connected machine:

```bash
#!/bin/bash
set -e

ISTIO_VERSION=${1:-"1.24.0"}
OUTPUT_DIR="istio-airgap-${ISTIO_VERSION}"

mkdir -p ${OUTPUT_DIR}/helm-charts

echo "Downloading istio release..."
curl -L "https://github.com/istio/istio/releases/download/${ISTIO_VERSION}/istio-${ISTIO_VERSION}-linux-amd64.tar.gz" \
  -o "${OUTPUT_DIR}/istio-${ISTIO_VERSION}.tar.gz"

echo "Downloading Helm charts..."
helm repo add istio https://istio-release.storage.googleapis.com/charts 2>/dev/null || true
helm repo update
for chart in base istiod gateway cni; do
  helm pull istio/${chart} --version ${ISTIO_VERSION} -d "${OUTPUT_DIR}/helm-charts/"
done

echo "Pulling container images..."
IMAGES=(
  "docker.io/istio/pilot:${ISTIO_VERSION}"
  "docker.io/istio/proxyv2:${ISTIO_VERSION}"
  "docker.io/istio/install-cni:${ISTIO_VERSION}"
)

for img in "${IMAGES[@]}"; do
  docker pull ${img}
done

echo "Saving images to tar..."
docker save ${IMAGES[@]} -o "${OUTPUT_DIR}/istio-images.tar"

echo "Bundle ready at ${OUTPUT_DIR}/"
ls -lh ${OUTPUT_DIR}/
```

Run it:

```bash
chmod +x prepare-istio-airgap.sh
./prepare-istio-airgap.sh 1.24.0
```

## Troubleshooting

**ImagePullBackOff errors**: The most common issue. Verify:
- Images exist in the internal registry with correct tags
- Nodes can reach the internal registry
- Pull secrets are configured if needed

```bash
kubectl describe pod <pod-name> -n istio-system | grep -A 10 "Events"
```

**CRD installation failures**: Make sure the base chart was installed first and CRDs are present:

```bash
kubectl get crds | grep istio.io
```

**istioctl cannot find images**: When istioctl runs pre-flight checks, it might try to verify image availability. Use `--force` if needed:

```bash
istioctl install -f istio-airgap.yaml --force -y
```

Air-gapped Istio installation is mostly about preparation. Get all the artifacts onto the isolated network, push images to your internal registry, and point the installation at that registry. Once the images are available locally, the installation process is the same as any other Istio setup.
