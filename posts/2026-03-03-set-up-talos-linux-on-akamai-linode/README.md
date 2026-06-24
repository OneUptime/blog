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
- Helm installed on your workstation for the Linode cloud integrations
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

Talos Linux provides a raw disk image for Akamai/Linode through the Talos Image Factory. Download the Akamai image to your local machine:

```bash
# Download the Akamai-specific image from the Image Factory
# Use the Image Factory UI to generate the URL for your Talos version and schematic.
wget -O akamai-amd64.raw.gz \
  "https://factory.talos.dev/image/<SCHEMATIC_ID>/v1.9.0/akamai-amd64.raw.gz"

# For the default "vanilla" schematic, the schematic ID is:
# 376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba
```

## Step 2: Upload the Image to Linode

Upload the Talos Linux image to your Linode account:

```bash
# Upload the image using the Linode CLI
linode-cli image-upload \
  --label "Talos Linux v1.9.0" \
  --description "Talos Linux for Kubernetes" \
  --region us-east \
  akamai-amd64.raw.gz
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
  --data-binary @akamai-amd64.raw.gz
```

Note the image ID returned by the upload - you will need it when creating instances.

## Step 3: Create Linode Instances

Create instances using your uploaded Talos Linux image:

```bash
# Create a control plane instance
linode-cli linodes create \
  --no-defaults \
  --label talos-cp-1 \
  --region us-east \
  --type g6-standard-4 \
  --image private/<IMAGE_ID> \
  --root_pass "$(openssl rand -base64 32)" \
  --private_ip true

# Note the Linode ID, public IP, and private IP from the output.
# Then change the Linode configuration to boot the uploaded disk directly.
linode-cli linodes configs-list <LINODE_ID> --format id --text --no-headers
linode-cli linodes config-update <LINODE_ID> <CONFIG_ID> \
  --kernel "linode/direct-disk"
```

For a complete cluster, create at least three control plane nodes and two workers:

```bash
# Create additional control plane nodes
for i in 2 3; do
  linode-cli linodes create \
    --no-defaults \
    --label "talos-cp-${i}" \
    --region us-east \
    --type g6-standard-4 \
    --image "private/<IMAGE_ID>" \
    --root_pass "$(openssl rand -base64 32)" \
    --private_ip true

  linode_id=$(linode-cli linodes list --label "talos-cp-${i}" --format id --text --no-headers)
  config_id=$(linode-cli linodes configs-list "${linode_id}" --format id --text --no-headers)
  linode-cli linodes config-update "${linode_id}" "${config_id}" --kernel "linode/direct-disk"
done

# Create worker nodes
for i in 1 2; do
  linode-cli linodes create \
    --no-defaults \
    --label "talos-worker-${i}" \
    --region us-east \
    --type g6-standard-8 \
    --image "private/<IMAGE_ID>" \
    --root_pass "$(openssl rand -base64 32)" \
    --private_ip true

  linode_id=$(linode-cli linodes list --label "talos-worker-${i}" --format id --text --no-headers)
  config_id=$(linode-cli linodes configs-list "${linode_id}" --format id --text --no-headers)
  linode-cli linodes config-update "${linode_id}" "${config_id}" --kernel "linode/direct-disk"
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
# Edit controlplane.yaml and worker.yaml. The apiServer section is only needed
# in controlplane.yaml; externalCloudProvider should be present in both files.
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
cluster:
  apiServer:
    certSANs:
      - <NODEBALANCER_IP>
  externalCloudProvider:
    enabled: true
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

To use Linode Block Storage as persistent volumes in your cluster, install the Linode Cloud Controller Manager and the Linode CSI driver with Helm:

```bash
# Install the Linode Cloud Controller Manager
helm repo add ccm-linode https://linode.github.io/linode-cloud-controller-manager/
helm repo update ccm-linode
helm install ccm-linode \
  --kubeconfig ./kubeconfig \
  --namespace kube-system \
  --set apiToken="$LINODE_TOKEN" \
  --set region="us-east" \
  ccm-linode/ccm-linode

# Install the Linode CSI driver
helm repo add linode-csi https://linode.github.io/linode-blockstorage-csi-driver/
helm repo update linode-csi
helm install linode-csi-driver \
  --kubeconfig ./kubeconfig \
  --namespace kube-system \
  --set apiToken="$LINODE_TOKEN" \
  --set region="us-east" \
  linode-csi/linode-blockstorage-csi-driver
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
  --no-defaults \
  --label talos-worker-3 \
  --region us-east \
  --type g6-standard-8 \
  --image "private/<IMAGE_ID>" \
  --root_pass "$(openssl rand -base64 32)" \
  --private_ip true

linode-cli linodes config-update <LINODE_ID> <CONFIG_ID> \
  --kernel "linode/direct-disk"

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
