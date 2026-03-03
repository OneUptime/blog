# How to Set Up Talos Linux on Akamai / Linode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Akamai, Linode, Cloud, Kubernetes

Description: Step-by-step instructions for deploying Talos Linux on Akamai (formerly Linode) cloud instances for managed Kubernetes clusters.

---

Akamai Cloud Computing, formerly known as Linode, offers straightforward cloud infrastructure at competitive prices. Running Talos Linux on Akamai gives you a secure, immutable Kubernetes platform in the cloud without the complexity of managed Kubernetes services. You get full control over your cluster while keeping the simplicity of Talos Linux's API-driven management.

This guide walks through deploying Talos Linux on Akamai/Linode instances and bootstrapping a production-ready Kubernetes cluster.

## Why Talos Linux on Akamai?

Akamai's cloud platform is known for its simplicity and predictable pricing. But their managed Kubernetes offering (LKE) may not suit every use case. Running Talos Linux directly on compute instances gives you:

- Full control over the Kubernetes version and configuration
- Talos Linux's immutable OS with no SSH access, reducing your attack surface
- The ability to run the same OS image in the cloud and on bare metal
- Consistent management tooling across all your environments

## Prerequisites

You will need:

- An Akamai Cloud (Linode) account with API access
- The Linode CLI (`linode-cli`) installed and configured
- `talosctl` installed on your workstation
- Basic familiarity with Linode's dashboard or API

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install the Linode CLI
pip install linode-cli

# Configure the Linode CLI with your API token
linode-cli configure
```

## Step 1: Download the Talos Linux Disk Image

Talos Linux provides a raw disk image for Akamai/Linode. Download it to your local machine:

```bash
# Download the Linode-specific image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/nocloud-amd64.raw.xz

# Decompress it
xz -d nocloud-amd64.raw.xz

# Compress as gzip (Linode requires gzip format)
gzip nocloud-amd64.raw
```

## Step 2: Upload the Image to Linode

Upload the Talos Linux image to your Linode account:

```bash
# Upload the image using the Linode CLI
linode-cli image-upload \
  --label "Talos Linux v1.9.0" \
  --description "Talos Linux for Kubernetes" \
  --region us-east \
  nocloud-amd64.raw.gz
```

Alternatively, you can use the Linode API directly:

```bash
# Create an upload URL
curl -X POST https://api.linode.com/v4/images/upload \
  -H "Authorization: Bearer $LINODE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "talos-linux-v1.9.0",
    "description": "Talos Linux for Kubernetes",
    "region": "us-east"
  }'

# Upload the image to the returned URL
curl -X PUT "<UPLOAD_URL>" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @nocloud-amd64.raw.gz
```

Note the image ID returned by the upload - you will need it when creating instances.

## Step 3: Create Linode Instances

Create instances using your uploaded Talos Linux image:

```bash
# Create a control plane instance
linode-cli linodes create \
  --label talos-cp-1 \
  --region us-east \
  --type g6-standard-4 \
  --image private/<IMAGE_ID> \
  --root_pass "$(openssl rand -base64 32)" \
  --private_ip true

# Note the public and private IPs from the output
```

For a complete cluster, create at least three control plane nodes and two workers:

```bash
# Create additional control plane nodes
for i in 2 3; do
  linode-cli linodes create \
    --label "talos-cp-${i}" \
    --region us-east \
    --type g6-standard-4 \
    --image "private/<IMAGE_ID>" \
    --root_pass "$(openssl rand -base64 32)" \
    --private_ip true
done

# Create worker nodes
for i in 1 2; do
  linode-cli linodes create \
    --label "talos-worker-${i}" \
    --region us-east \
    --type g6-standard-8 \
    --image "private/<IMAGE_ID>" \
    --root_pass "$(openssl rand -base64 32)" \
    --private_ip true
done
```

## Step 4: Set Up a NodeBalancer

Create a NodeBalancer to serve as the stable endpoint for your Kubernetes API:

```bash
# Create a NodeBalancer
linode-cli nodebalancers create \
  --label talos-api-lb \
  --region us-east

# Create a configuration for port 6443
linode-cli nodebalancers config-create <NODEBALANCER_ID> \
  --port 6443 \
  --protocol tcp \
  --check connection \
  --check_interval 15 \
  --check_timeout 10

# Add control plane nodes as backends
for node_ip in <CP1_PRIVATE_IP> <CP2_PRIVATE_IP> <CP3_PRIVATE_IP>; do
  linode-cli nodebalancers node-create <NODEBALANCER_ID> <CONFIG_ID> \
    --label "cp-node" \
    --address "${node_ip}:6443"
done
```

## Step 5: Generate Talos Configuration

Generate the machine configuration using the NodeBalancer's address:

```bash
# Generate configuration with the NodeBalancer endpoint
talosctl gen config talos-linode-cluster \
  https://<NODEBALANCER_IP>:6443

# The generated files:
# controlplane.yaml
# worker.yaml
# talosconfig
```

Customize the configuration for the Linode environment:

```yaml
# Edit controlplane.yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.9.0
  network:
    interfaces:
      # Public interface
      - interface: eth0
        dhcp: true
      # Private interface (VLAN)
      - interface: eth1
        dhcp: true
  certSANs:
    - <NODEBALANCER_IP>
```

## Step 6: Apply Configuration

Apply the configuration to each instance. Use the Linode LISH console or the instance's public IP:

```bash
# Apply control plane config to each CP node
for ip in <CP1_PUBLIC_IP> <CP2_PUBLIC_IP> <CP3_PUBLIC_IP>; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file controlplane.yaml
done

# Apply worker config
for ip in <WORKER1_PUBLIC_IP> <WORKER2_PUBLIC_IP>; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file worker.yaml
done
```

## Step 7: Bootstrap the Cluster

Bootstrap the cluster from the first control plane node:

```bash
# Set up talosctl to talk to the cluster
talosctl config endpoint <CP1_PUBLIC_IP>
talosctl config node <CP1_PUBLIC_IP>

# Bootstrap etcd
talosctl bootstrap

# Monitor health
talosctl health --wait-timeout 10m

# Get kubeconfig
talosctl kubeconfig ./kubeconfig

# Verify
kubectl --kubeconfig=./kubeconfig get nodes
```

## Setting Up the Linode CSI Driver

To use Linode Block Storage as persistent volumes in your cluster, install the Linode CSI driver:

```bash
# Create a secret with your Linode API token
kubectl --kubeconfig=./kubeconfig create secret generic linode-token \
  --from-literal=token="$LINODE_TOKEN" \
  --from-literal=region="us-east" \
  -n kube-system

# Install the Linode CSI driver
kubectl --kubeconfig=./kubeconfig apply -f \
  https://raw.githubusercontent.com/linode/linode-blockstorage-csi-driver/master/pkg/linode-bs/deploy/releases/linode-blockstorage-csi-driver.yaml
```

Now you can create PersistentVolumeClaims backed by Linode Block Storage:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: linode-block-storage
```

## Firewall Configuration

Set up Linode Cloud Firewalls to protect your cluster:

```bash
# Create a firewall for control plane nodes
linode-cli firewalls create \
  --label talos-cp-firewall \
  --rules.inbound_policy DROP \
  --rules.outbound_policy ACCEPT

# Allow Kubernetes API from your IP
linode-cli firewalls rules-update <FIREWALL_ID> \
  --inbound '[
    {"action": "ACCEPT", "protocol": "TCP", "ports": "6443", "addresses": {"ipv4": ["YOUR_IP/32"]}},
    {"action": "ACCEPT", "protocol": "TCP", "ports": "50000", "addresses": {"ipv4": ["YOUR_IP/32"]}},
    {"action": "ACCEPT", "protocol": "TCP", "ports": "1-65535", "addresses": {"ipv4": ["192.168.0.0/16"]}}
  ]'
```

## Scaling Your Cluster

Adding nodes on Linode is straightforward:

```bash
# Create a new worker instance
linode-cli linodes create \
  --label talos-worker-3 \
  --region us-east \
  --type g6-standard-8 \
  --image "private/<IMAGE_ID>" \
  --root_pass "$(openssl rand -base64 32)" \
  --private_ip true

# Apply the worker configuration
talosctl apply-config --insecure \
  --nodes <NEW_WORKER_IP> \
  --file worker.yaml
```

The new node joins the cluster automatically within minutes.

## Troubleshooting

If instances do not boot into Talos, verify the image was uploaded correctly and that you selected it when creating the instance. Check the Linode LISH console for boot messages.

If nodes cannot communicate, ensure private networking is enabled and that your firewall rules allow inter-node traffic on the private network.

For NodeBalancer health check failures, confirm that the Kubernetes API server is running on all control plane nodes and listening on port 6443.

## Conclusion

Running Talos Linux on Akamai/Linode gives you a clean, secure Kubernetes platform with the flexibility of cloud infrastructure. The combination of Linode's simple pricing, Talos Linux's immutable design, and standard Kubernetes tooling creates a production-ready environment that is straightforward to set up and manage. Whether you are running a small development cluster or a larger production deployment, this setup provides a solid foundation.
