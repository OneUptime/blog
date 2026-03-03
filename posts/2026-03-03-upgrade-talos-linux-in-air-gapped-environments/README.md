# How to Upgrade Talos Linux in Air-Gapped Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Air-Gapped, Upgrade, Security, Offline Installation

Description: Step-by-step instructions for upgrading Talos Linux clusters in air-gapped environments without internet access.

---

Air-gapped environments present a unique challenge for Talos Linux upgrades. Without internet access, your nodes cannot pull upgrade images from public registries. Everything needs to be pre-staged and made available through internal infrastructure. This guide covers the entire process of upgrading Talos Linux when your cluster has no connection to the outside world.

## Understanding the Air-Gapped Upgrade Challenge

When you run `talosctl upgrade` in a connected environment, Talos pulls the installer image from `ghcr.io/siderolabs/installer`. In an air-gapped setup, that registry is unreachable. You need to make the installer image available through a local container registry that your nodes can access.

Beyond the installer image, you also need to consider:

- Kubernetes component images (kube-apiserver, kube-controller-manager, kube-scheduler, kube-proxy, etc.)
- CNI plugin images
- CoreDNS images
- Any system extension images
- etcd images (if upgrading the bundled etcd)

## Step 1: Identify All Required Images

Start by figuring out exactly which images the new Talos version needs. The Talos project publishes image lists with each release.

```bash
# On a machine with internet access, pull the image list
# for the target Talos version
crane export ghcr.io/siderolabs/installer:v1.7.0 - | \
  tar -xf - images.txt

# Alternatively, check the release notes for the image list
# or use the Talos image list tool
talosctl images --kubernetes-version 1.30.0
```

Create a comprehensive list that includes:

```text
# Talos installer
ghcr.io/siderolabs/installer:v1.7.0

# Kubernetes components
registry.k8s.io/kube-apiserver:v1.30.0
registry.k8s.io/kube-controller-manager:v1.30.0
registry.k8s.io/kube-scheduler:v1.30.0
registry.k8s.io/kube-proxy:v1.30.0

# etcd
gcr.io/etcd-development/etcd:v3.5.12

# CoreDNS
registry.k8s.io/coredns/coredns:v1.11.1

# Flannel or your CNI
docker.io/flannel/flannel:v0.25.0

# System extensions (if used)
ghcr.io/siderolabs/iscsi-tools:v0.1.4
ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
```

## Step 2: Mirror Images to Your Local Registry

On a machine that has both internet access and connectivity to your air-gapped environment (often called a "jump box" or "bastion"), pull and push all the required images.

```bash
# Set your local registry address
LOCAL_REGISTRY="registry.internal.example.com"

# Pull and retag each image
# Talos installer
crane copy ghcr.io/siderolabs/installer:v1.7.0 \
  ${LOCAL_REGISTRY}/siderolabs/installer:v1.7.0

# Kubernetes components
crane copy registry.k8s.io/kube-apiserver:v1.30.0 \
  ${LOCAL_REGISTRY}/kube-apiserver:v1.30.0

crane copy registry.k8s.io/kube-controller-manager:v1.30.0 \
  ${LOCAL_REGISTRY}/kube-controller-manager:v1.30.0

crane copy registry.k8s.io/kube-scheduler:v1.30.0 \
  ${LOCAL_REGISTRY}/kube-scheduler:v1.30.0

crane copy registry.k8s.io/kube-proxy:v1.30.0 \
  ${LOCAL_REGISTRY}/kube-proxy:v1.30.0
```

If you cannot use `crane`, you can use `docker pull`, `docker tag`, and `docker push`, or even `skopeo copy` for OCI-native transfers.

```bash
# Alternative using skopeo
skopeo copy \
  docker://ghcr.io/siderolabs/installer:v1.7.0 \
  docker://${LOCAL_REGISTRY}/siderolabs/installer:v1.7.0
```

## Step 3: Configure Talos to Use Your Local Registry

Your Talos machine configuration needs to tell the nodes to pull from your local registry instead of the public ones. This is done through registry mirrors in the machine config.

```yaml
# Machine config patch for registry mirrors
machine:
  registries:
    mirrors:
      ghcr.io:
        endpoints:
          - https://registry.internal.example.com
      registry.k8s.io:
        endpoints:
          - https://registry.internal.example.com
      gcr.io:
        endpoints:
          - https://registry.internal.example.com
      docker.io:
        endpoints:
          - https://registry.internal.example.com
    config:
      registry.internal.example.com:
        tls:
          insecureSkipVerify: false
          clientIdentity:
            crt: <base64-encoded-client-cert>
            key: <base64-encoded-client-key>
```

Apply this configuration to all nodes before starting the upgrade:

```bash
# Apply registry mirror config to each node
talosctl apply-config --nodes <node-ip> \
  --file updated-machine-config.yaml
```

If your local registry uses a self-signed CA, include the CA certificate in the machine config:

```yaml
machine:
  registries:
    config:
      registry.internal.example.com:
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            <your CA certificate here>
            -----END CERTIFICATE-----
```

## Step 4: Handle System Extensions

If you use system extensions (like iscsi-tools, qemu-guest-agent, or others), you need to build a custom installer image that includes them. In an air-gapped setup, this means using Image Factory on a connected machine and then transferring the result.

```bash
# On a connected machine, use Image Factory to generate
# a custom installer with extensions
# Visit https://factory.talos.dev or use the API

# Then mirror the custom installer to your local registry
crane copy ghcr.io/siderolabs/installer:<custom-hash>:v1.7.0 \
  ${LOCAL_REGISTRY}/siderolabs/installer:v1.7.0-custom
```

## Step 5: Transfer Images via Sneakernet (If Needed)

In fully disconnected environments where even the bastion host cannot reach your internal registry directly, you may need to use portable media.

```bash
# On the connected machine, save images to a tar file
crane pull ghcr.io/siderolabs/installer:v1.7.0 installer-v1.7.0.tar

# Transfer the tar file to the air-gapped network
# (USB drive, approved file transfer mechanism, etc.)

# On a machine inside the air-gapped network, load and push
crane push installer-v1.7.0.tar \
  ${LOCAL_REGISTRY}/siderolabs/installer:v1.7.0
```

Repeat this for every image on your list. It is tedious but necessary for fully disconnected environments.

## Step 6: Run the Upgrade

With all images mirrored and registry configuration in place, the upgrade command itself is similar to a connected upgrade - you just point to your local registry:

```bash
# Upgrade control plane nodes one at a time
talosctl upgrade --nodes <cp-node-ip> \
  --image ${LOCAL_REGISTRY}/siderolabs/installer:v1.7.0

# Wait for the node to come back
talosctl health --nodes <cp-node-ip> --wait-timeout 10m

# Verify etcd health
talosctl etcd status --nodes <cp-node-ip>

# Continue with remaining control plane nodes, then workers
```

## Step 7: Verify the Upgrade

After all nodes are upgraded, verify everything is working:

```bash
# Check versions
talosctl version --nodes <all-nodes>

# Verify all pods are running
kubectl get pods --all-namespaces

# Check that images are being pulled from the local registry
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort | uniq
```

## Common Pitfalls in Air-Gapped Upgrades

**Missing images**: The upgrade starts but pods fail to come up because an image was not mirrored. Always verify your image list is complete before starting.

**Registry certificate issues**: Nodes cannot reach the local registry because of TLS errors. Make sure the CA certificate is properly configured in the machine config.

**Image path mismatches**: The registry mirror configuration does not match the actual image paths in your local registry. Double-check that the path structure matches what Talos expects.

**Stale configurations**: Registry mirror settings from a previous upgrade might conflict with the current one. Review the machine config before every upgrade.

## Summary

Upgrading Talos Linux in an air-gapped environment requires more preparation than a connected upgrade, but the process is straightforward once you have a reliable workflow for mirroring images and configuring registry access. Build a checklist of all required images, mirror them to your local registry, verify the registry configuration on each node, and then follow the standard upgrade procedure. With practice, air-gapped upgrades become just another part of your regular maintenance cycle.
