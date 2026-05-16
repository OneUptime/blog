# How to Use Air-Gapped Container Images with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Air-Gapped, Container Image, Offline Installation, Security

Description: A comprehensive guide to deploying Talos Linux in air-gapped environments where nodes have no internet access for pulling container images.

---

Air-gapped environments are networks that have no connection to the internet. They are common in government, military, healthcare, and financial organizations where security requirements prohibit external network access. Running Kubernetes in an air-gapped environment means every container image your cluster needs must be available locally. Nothing can be pulled from Docker Hub, GitHub Container Registry, or any other external source.

Talos Linux supports air-gapped deployments, but it requires careful planning. This guide covers how to prepare, deploy, and maintain a Talos Linux cluster in an air-gapped environment.

## What You Need for an Air-Gapped Deployment

Before you disconnect from the internet, you need to collect everything your cluster requires:

1. Talos Linux installation images (ISO or PXE boot images)
2. Talos system images (installer, kubelet, etcd, CNI installer, etc.)
3. Kubernetes control plane images (API server, scheduler, controller manager)
4. CNI plugin images
5. CoreDNS images
6. Your application images
7. Any other images your workloads depend on

## Setting Up a Local Registry

The first step is deploying a container registry inside your air-gapped network:

```bash
# On a machine with internet access, pull the registry image

docker pull registry:2
docker save registry:2 -o registry-image.tar

# Transfer registry-image.tar to the air-gapped network

# On a machine inside the air-gapped network
docker load -i registry-image.tar
docker run -d \
  --name local-registry \
  --restart always \
  -p 5000:5000 \
  -v /data/registry:/var/lib/registry \
  registry:2
```

## Collecting Required Images

You need to know exactly which images your cluster will need. Here is how to find them:

```bash
# Get the list of Talos system images for your version
talosctl image default

# This gives you a list like:
# ghcr.io/siderolabs/installer:v1.7.x
# ghcr.io/siderolabs/kubelet:v1.30.x
# ghcr.io/siderolabs/install-cni:v1.x
# gcr.io/etcd-development/etcd:v3.5.x
# registry.k8s.io/kube-apiserver:v1.30.x
# registry.k8s.io/kube-controller-manager:v1.30.x
# registry.k8s.io/kube-scheduler:v1.30.x
# registry.k8s.io/kube-proxy:v1.30.x
# registry.k8s.io/coredns/coredns:v1.11.x
# registry.k8s.io/pause:3.9
```

## Pulling and Saving Images

On a machine with internet access, pull all required images and save them:

```bash
#!/bin/bash
# pull-and-save.sh - Run this on a machine with internet access

talosctl image default > images.txt

# Add your application images
cat >> images.txt <<'EOF'
nginx:1.25
redis:7.2
postgres:16
EOF

# Pull all images
while read -r img; do
  [ -z "$img" ] && continue
  echo "Pulling $img"
  docker pull "$img"
done < images.txt

# Save all images to a single tar file
echo "Saving images to images-bundle.tar"
docker save $(cat images.txt) -o images-bundle.tar

echo "Bundle size: $(du -h images-bundle.tar | cut -f1)"
```

## Loading Images into the Local Registry

Transfer the image bundle to the air-gapped network and load it:

```bash
#!/bin/bash
# load-and-push.sh - Run this inside the air-gapped network

LOCAL_REGISTRY="local-registry.internal:5000"

# Load images from the tar file. Transfer images.txt with images-bundle.tar.
docker load -i images-bundle.tar

local_name() {
  image="$1"
  first="${image%%/*}"

  # Strip the source registry host. For Docker Hub official images, add library/.
  if [ "$first" = "$image" ]; then
    echo "${LOCAL_REGISTRY}/library/${image}"
  elif echo "$first" | grep -qE '(\.|:)|^localhost$'; then
    echo "${LOCAL_REGISTRY}/${image#*/}"
  else
    echo "${LOCAL_REGISTRY}/${image}"
  fi
}

while read -r img; do
  [ -z "$img" ] && continue
  local_tag="$(local_name "$img")"
  echo "Tagging and pushing $img -> $local_tag"
  docker tag "$img" "$local_tag"
  docker push "$local_tag"
done < images.txt
```

## Configuring Talos for Air-Gapped Operation

Configure Talos to pull all images from the local registry using mirrors:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - http://local-registry.internal:5000
      ghcr.io:
        endpoints:
          - http://local-registry.internal:5000
      gcr.io:
        endpoints:
          - http://local-registry.internal:5000
      registry.k8s.io:
        endpoints:
          - http://local-registry.internal:5000
      quay.io:
        endpoints:
          - http://local-registry.internal:5000
```

If your local registry uses HTTPS with a private or self-signed certificate, add the registry certificate authority to Talos trusted roots instead of using a plain HTTP endpoint.

## Configuring Kubernetes Component Images

Tell Talos to use specific component image versions that match what you mirrored:

```yaml
cluster:
  etcd:
    image: gcr.io/etcd-development/etcd:v3.5.12
  apiServer:
    image: registry.k8s.io/kube-apiserver:v1.30.0
  controllerManager:
    image: registry.k8s.io/kube-controller-manager:v1.30.0
  scheduler:
    image: registry.k8s.io/kube-scheduler:v1.30.0
  proxy:
    image: registry.k8s.io/kube-proxy:v1.30.0
  coreDNS:
    image: registry.k8s.io/coredns/coredns:v1.11.1

machine:
  kubelet:
    image: ghcr.io/siderolabs/kubelet:v1.30.0
```

## Generating Talos Configuration

Generate the Talos configuration with air-gapped settings:

```bash
# Generate configuration pointing to local registry
talosctl gen config air-gapped-cluster https://10.0.0.1:6443 \
  --config-patch @air-gapped-patch.yaml
```

Where `air-gapped-patch.yaml` contains all the registry and image overrides shown above.

## Bootstrapping the Cluster

Boot nodes with the Talos ISO (transferred via USB or local PXE server) and apply the configuration:

```bash
# Apply control plane configuration
talosctl apply-config --insecure --nodes 10.0.0.2 --file controlplane.yaml

# Bootstrap the cluster
talosctl bootstrap --nodes 10.0.0.2 --endpoints 10.0.0.2 --talosconfig ./talosconfig

# Apply worker configurations
talosctl apply-config --insecure --nodes 10.0.0.5 --file worker.yaml

# Wait for the cluster to be ready
talosctl health --nodes 10.0.0.2 --endpoints 10.0.0.2 --talosconfig ./talosconfig
```

## Updating Images

When you need to update images in the air-gapped environment, repeat the pull-save-transfer-load process:

```bash
# On the internet-connected machine
docker pull myapp:v2.0.0
docker save myapp:v2.0.0 -o update-bundle.tar

# Transfer to air-gapped network
# On the air-gapped machine
docker load -i update-bundle.tar
docker tag myapp:v2.0.0 local-registry.internal:5000/library/myapp:v2.0.0
docker push local-registry.internal:5000/library/myapp:v2.0.0
```

## Verifying the Setup

Confirm everything is working:

```bash
# Check that nodes are pulling from the local registry
talosctl logs containerd --nodes 10.0.0.2 | grep "local-registry"

# Verify all system pods are running
kubectl get pods -n kube-system

# Test deploying a workload
kubectl run test --image=nginx:1.25 --restart=Never
kubectl get pod test
kubectl delete pod test
```

## Handling Talos Upgrades

Upgrading Talos in an air-gapped environment requires the new Talos installer image:

```bash
# On internet-connected machine
docker pull ghcr.io/siderolabs/installer:v1.7.1
docker save ghcr.io/siderolabs/installer:v1.7.1 -o talos-installer.tar

# Transfer and load into local registry
docker load -i talos-installer.tar
docker tag ghcr.io/siderolabs/installer:v1.7.1 \
  local-registry.internal:5000/siderolabs/installer:v1.7.1
docker push local-registry.internal:5000/siderolabs/installer:v1.7.1

# Perform the upgrade
talosctl upgrade --image ghcr.io/siderolabs/installer:v1.7.1 \
  --nodes 10.0.0.2
```

## Conclusion

Running Talos Linux in an air-gapped environment requires upfront preparation but is entirely feasible. The key is maintaining a local registry with all required images and configuring Talos to use it exclusively. Establish a repeatable process for transferring images into the air-gapped network, and keep an inventory of all images your cluster needs. With proper planning, your air-gapped Talos cluster will be just as functional as an internet-connected one.
