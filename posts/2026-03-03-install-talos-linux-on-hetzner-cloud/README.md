# How to Install Talos Linux on Hetzner Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Hetzner Cloud, Kubernetes, Cloud, Infrastructure

Description: Deploy a Talos Linux Kubernetes cluster on Hetzner Cloud with this complete guide covering image upload, networking, and bootstrapping.

---

Hetzner Cloud is popular among developers and small teams for its exceptional price-to-performance ratio. Running Talos Linux on Hetzner gives you an extremely cost-effective Kubernetes cluster with enterprise-grade security. This guide covers the complete deployment process using the Hetzner Cloud CLI tool.

## Prerequisites

Install the required tools:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install hcloud CLI
# On macOS
brew install hcloud
# On Linux
curl -sL https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz | tar xz
sudo mv hcloud /usr/local/bin/

# Configure hcloud with your API token
hcloud context create talos-project
# Enter your Hetzner Cloud API token when prompted

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Uploading the Talos Image

Hetzner Cloud does not have native Talos images, so you need to upload one as a custom snapshot. The recommended approach uses a temporary server to write the Talos image:

```bash
# Create a temporary server to install Talos from
hcloud server create \
  --name talos-image-builder \
  --type cx22 \
  --image ubuntu-22.04 \
  --location nbg1

# Get the server IP
BUILDER_IP=$(hcloud server ip talos-image-builder)

# Wait for the server to be ready
sleep 30

# SSH into the server and write the Talos image to disk
ssh root@${BUILDER_IP} << 'REMOTEOF'
# Download the Talos image for Hetzner (nocloud variant)
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/nocloud-amd64.raw.xz
# Write directly to the primary disk
xz -d -c nocloud-amd64.raw.xz | dd of=/dev/sda bs=4M status=progress
sync
REMOTEOF

# Power off the server
hcloud server shutdown talos-image-builder
sleep 10

# Create a snapshot from the server
SNAPSHOT_ID=$(hcloud server create-image talos-image-builder \
  --type snapshot \
  --description "Talos Linux v1.7.0" \
  -o json | jq -r '.image.id')

echo "Snapshot ID: ${SNAPSHOT_ID}"

# Delete the temporary server
hcloud server delete talos-image-builder
```

## Setting Up Networking

Create a private network for your cluster:

```bash
# Create a network
hcloud network create \
  --name talos-network \
  --ip-range 10.0.0.0/16

# Create a subnet
hcloud network add-subnet talos-network \
  --type server \
  --network-zone eu-central \
  --ip-range 10.0.1.0/24
```

## Creating a Load Balancer

Set up a load balancer for the Kubernetes API:

```bash
# Create a load balancer
hcloud load-balancer create \
  --name talos-lb \
  --type lb11 \
  --location nbg1 \
  --network-zone eu-central

# Attach the load balancer to the network
hcloud load-balancer attach-to-network talos-lb \
  --network talos-network

# Add a service for the Kubernetes API
hcloud load-balancer add-service talos-lb \
  --protocol tcp \
  --listen-port 6443 \
  --destination-port 6443

# Add a health check
hcloud load-balancer update-health-check talos-lb \
  --protocol tcp \
  --port 6443 \
  --interval 10 \
  --timeout 5 \
  --retries 3

# Get the load balancer IP
LB_IP=$(hcloud load-balancer describe talos-lb -o json | jq -r '.public_net.ipv4.ip')
echo "Load Balancer IP: ${LB_IP}"
```

## Generating Talos Configuration

Generate the machine configuration for your cluster:

```bash
# Generate Talos configuration
talosctl gen config talos-hetzner-cluster "https://${LB_IP}:6443" \
  --output-dir _out

# Create a patch for Hetzner-specific settings
cat > hetzner-patch-cp.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
      - interface: eth1
        dhcp: true
  certSANs: []
EOF

cat > hetzner-patch-worker.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
      - interface: eth1
        dhcp: true
EOF

# Apply patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @hetzner-patch-cp.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @hetzner-patch-worker.yaml \
  --output _out/worker-patched.yaml
```

## Launching Control Plane Nodes

Create the control plane servers:

```bash
# Create control plane servers
for i in 1 2 3; do
  hcloud server create \
    --name talos-cp-${i} \
    --type cx32 \
    --image ${SNAPSHOT_ID} \
    --location nbg1 \
    --network talos-network \
    --user-data-from-file _out/controlplane-patched.yaml \
    --label role=controlplane

  # Add to load balancer
  hcloud load-balancer add-target talos-lb \
    --server talos-cp-${i}

  echo "Control plane node ${i} created"
done
```

## Launching Worker Nodes

Create the worker servers:

```bash
# Create worker servers
for i in 1 2 3; do
  hcloud server create \
    --name talos-worker-${i} \
    --type cx32 \
    --image ${SNAPSHOT_ID} \
    --location nbg1 \
    --network talos-network \
    --user-data-from-file _out/worker-patched.yaml \
    --label role=worker

  echo "Worker node ${i} created"
done
```

## Bootstrapping the Cluster

Bootstrap and verify:

```bash
# Get the IP of the first control plane node
CP1_IP=$(hcloud server ip talos-cp-1)
echo "Control plane 1 IP: ${CP1_IP}"

# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Wait for nodes to be ready
sleep 120

# Bootstrap the cluster
talosctl bootstrap --nodes ${CP1_IP}

# Wait for health
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Installing Essential Components

Install a CNI and the Hetzner Cloud Controller Manager:

```bash
# Install Cilium as CNI
cilium install --helm-set ipam.mode=kubernetes

# Install Hetzner Cloud Controller Manager
kubectl create secret generic hcloud \
  --namespace kube-system \
  --from-literal=token=your-hetzner-api-token \
  --from-literal=network=talos-network

helm repo add hcloud https://charts.hetzner.cloud
helm install hccm hcloud/hcloud-cloud-controller-manager \
  --namespace kube-system \
  --set networking.enabled=true \
  --set networking.clusterCIDR=10.244.0.0/16

# Install Hetzner CSI driver for persistent volumes
helm install hcloud-csi hcloud/hcloud-csi \
  --namespace kube-system
```

Create a storage class:

```yaml
# hetzner-storageclass.yaml
# Hetzner Cloud volume storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hcloud-volumes
provisioner: csi.hetzner.cloud
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f hetzner-storageclass.yaml
```

## Cleaning Up

Remove all resources:

```bash
# Delete servers
for i in 1 2 3; do
  hcloud server delete talos-cp-${i}
  hcloud server delete talos-worker-${i}
done

# Delete load balancer
hcloud load-balancer delete talos-lb

# Delete network
hcloud network delete talos-network

# Delete the snapshot
hcloud image delete ${SNAPSHOT_ID}
```

## Conclusion

Hetzner Cloud and Talos Linux make a compelling combination. You get a security-hardened Kubernetes cluster at a fraction of the cost of major cloud providers. The deployment process requires a few extra steps compared to AWS or GCP because you need to create a custom image, but once that is done, the workflow is standard Talos. For teams looking to maximize their infrastructure budget without compromising on security, this is one of the best options available.
