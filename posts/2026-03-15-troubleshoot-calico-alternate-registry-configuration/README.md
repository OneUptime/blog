# How to Troubleshoot Calico Alternate Registry Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Registry, Container, Troubleshooting, Kubernetes, Air-gapped

Description: Troubleshoot common issues when configuring Calico to pull container images from an alternate or private registry.

---

## Introduction

Organizations running air-gapped clusters or enforcing registry policies need Calico components to pull images from an alternate registry instead of the default public registries. When this configuration is incorrect, Calico pods fail to start with image pull errors.

Troubleshooting alternate registry issues requires checking image paths, registry authentication, network connectivity, and Calico installation manifests. The symptoms are usually straightforward (ImagePullBackOff) but the root causes vary.

This guide walks through systematic diagnosis and resolution of Calico alternate registry configuration problems.

## Prerequisites

- Kubernetes cluster with Calico installed or being installed
- Access to the alternate container registry
- `kubectl` with cluster access
- `crictl` or `docker` on cluster nodes for local testing

## Step 1: Identify Image Pull Failures

Check for pods stuck in ImagePullBackOff or ErrImagePull:

```bash
kubectl get pods -n calico-system -o wide
kubectl get pods -n calico-apiserver -o wide

# Get detailed error messages
kubectl describe pod -n calico-system -l k8s-app=calico-node | grep -A5 "Events:"
```

Extract the exact image reference being pulled:

```bash
kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.image}{"\n"}{end}{end}'

kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.initContainers[*]}{.image}{"\n"}{end}{end}'
```

## Step 2: Verify Images Exist in the Alternate Registry

Confirm the expected images are present in your registry:

```bash
REGISTRY="registry.internal.example.com"

# Check for core Calico images
IMAGES=(
  "calico/node:v3.27.0"
  "calico/cni:v3.27.0"
  "calico/kube-controllers:v3.27.0"
  "calico/typha:v3.27.0"
  "calico/pod2daemon-flexvol:v3.27.0"
  "calico/csi:v3.27.0"
  "calico/node-driver-registrar:v3.27.0"
)

for IMG in "${IMAGES[@]}"; do
  echo -n "Checking ${REGISTRY}/${IMG} ... "
  if crane manifest "${REGISTRY}/${IMG}" > /dev/null 2>&1; then
    echo "OK"
  else
    echo "NOT FOUND"
  fi
done
```

## Step 3: Verify Registry Authentication

Check that image pull secrets are configured:

```bash
# List secrets in calico namespace
kubectl get secrets -n calico-system -o name | grep -i pull

# Check if pods reference the pull secret
kubectl get daemonset calico-node -n calico-system \
  -o jsonpath='{.spec.template.spec.imagePullSecrets[*].name}'
```

Create an image pull secret if missing:

```bash
kubectl create secret docker-registry calico-registry-secret \
  -n calico-system \
  --docker-server=registry.internal.example.com \
  --docker-username=calico-pull \
  --docker-password='<password>'
```

## Step 4: Test Registry Connectivity from Nodes

SSH into a cluster node and test pulling directly:

```bash
# Using crictl
crictl pull registry.internal.example.com/calico/node:v3.27.0

# Using docker (if available)
docker pull registry.internal.example.com/calico/node:v3.27.0
```

Test network connectivity to the registry:

```bash
# Check DNS resolution
nslookup registry.internal.example.com

# Test HTTPS connectivity
curl -s -o /dev/null -w "%{http_code}" https://registry.internal.example.com/v2/
```

## Step 5: Verify Calico Installation Manifest Configuration

For Calico operator installations, check the Installation resource:

```bash
kubectl get installation default -o yaml | grep -A5 registry
```

The Installation resource should specify your registry:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  registry: registry.internal.example.com
  imagePath: calico
```

For manifest-based installations, check that all image references are updated:

```bash
kubectl get daemonset calico-node -n calico-system -o yaml | grep "image:"
kubectl get deployment calico-kube-controllers -n calico-system -o yaml | grep "image:"
kubectl get deployment calico-typha -n calico-system -o yaml | grep "image:"
```

## Step 6: Check for TLS Certificate Issues

If your registry uses a private CA, nodes must trust it:

```bash
# Check if the registry certificate is trusted
openssl s_client -connect registry.internal.example.com:443 </dev/null 2>/dev/null | \
  openssl x509 -noout -issuer -dates

# If using containerd, check its config
cat /etc/containerd/config.toml | grep -A5 "registry.internal.example.com"
```

Configure containerd to trust a private CA:

```toml
# /etc/containerd/config.toml
[plugins."io.containerd.grpc.v1.cri".registry.configs."registry.internal.example.com".tls]
  ca_file = "/etc/containerd/certs.d/registry.internal.example.com/ca.crt"
```

Restart containerd after changes:

```bash
sudo systemctl restart containerd
```

## Step 7: Mirror Images to the Alternate Registry

If images are missing, copy them from the public registry:

```bash
REGISTRY="registry.internal.example.com"
VERSION="v3.27.0"

IMAGES=(
  "calico/node"
  "calico/cni"
  "calico/kube-controllers"
  "calico/typha"
  "calico/csi"
  "calico/node-driver-registrar"
)

for IMG in "${IMAGES[@]}"; do
  echo "Mirroring ${IMG}:${VERSION}..."
  crane copy "docker.io/${IMG}:${VERSION}" "${REGISTRY}/${IMG}:${VERSION}"
done
```

## Verification

After fixes, confirm all Calico pods are running:

```bash
kubectl get pods -n calico-system
kubectl get pods -n calico-apiserver

# Verify nodes are ready
kubectl get nodes -o wide
calicoctl node status
```

## Troubleshooting

- **ImagePullBackOff with "unauthorized"**: The image pull secret is missing, expired, or does not have access to the repository. Recreate the secret and verify credentials.
- **ImagePullBackOff with "not found"**: The image tag or path does not exist in the alternate registry. Verify the exact image path and tag using `crane` or the registry API.
- **TLS handshake errors**: The node does not trust the registry's TLS certificate. Install the CA certificate on the node and restart the container runtime.
- **Init container failures**: Check init container images separately, as they may use different image paths or tags.

## Conclusion

Troubleshooting Calico alternate registry configuration follows a systematic approach: identify which images are failing, verify they exist in the registry, check authentication and network connectivity, and ensure the installation manifests point to the correct registry. Resolving these issues restores Calico pod startup in air-gapped or policy-restricted environments.
