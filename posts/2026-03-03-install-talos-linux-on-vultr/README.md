# How to Install Talos Linux on Vultr

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Vultr, Kubernetes, Cloud, Infrastructure

Description: Learn how to deploy Talos Linux on Vultr cloud instances to create a secure and cost-effective Kubernetes cluster.

---

Vultr provides high-performance cloud infrastructure with data centers across multiple continents, making it a versatile choice for deploying Talos Linux. With support for custom ISOs and affordable pricing, Vultr is well suited for running immutable Kubernetes clusters. This guide walks you through the full deployment process.

## Prerequisites

Set up your tools:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install the Vultr CLI
# On macOS
brew install vultr-cli
# On Linux
curl -sL https://github.com/vultr/vultr-cli/releases/latest/download/vultr-cli_linux_amd64.tar.gz | tar xz
sudo mv vultr-cli /usr/local/bin/

# Set your Vultr API key
export VULTR_API_KEY="your-api-key-here"

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Uploading the Talos ISO

Vultr supports custom ISOs, which is the easiest way to get Talos running:

```bash
# Upload the Talos ISO to Vultr
ISO_ID=$(vultr-cli iso create \
  --url "https://github.com/siderolabs/talos/releases/download/v1.7.0/talos-amd64.iso" \
  | grep "^ID" | awk '{print $2}')

echo "ISO ID: ${ISO_ID}"

# Wait for the ISO to be downloaded
while true; do
  STATUS=$(vultr-cli iso list | grep ${ISO_ID} | awk '{print $3}')
  echo "ISO status: ${STATUS}"
  if [ "${STATUS}" = "complete" ]; then
    break
  fi
  sleep 15
done
```

Alternatively, you can use a startup script with the raw image approach. Vultr also supports custom snapshots which work well for Talos:

```bash
# Create an instance with the Talos ISO to build a snapshot
BUILDER_ID=$(vultr-cli instance create \
  --region ewr \
  --plan vc2-2c-4gb \
  --iso ${ISO_ID} \
  --label "talos-builder" \
  | grep "^ID" | awk '{print $2}')

# Wait for the instance to boot from ISO and install
sleep 120

# Get the IP
BUILDER_IP=$(vultr-cli instance get ${BUILDER_ID} | grep "MAIN IP" | awk '{print $3}')
```

## Setting Up the Network

Create a VPC for your cluster:

```bash
# Create a VPC
VPC_ID=$(vultr-cli vpc2 create \
  --region ewr \
  --description "Talos Cluster Network" \
  --ip-type v4 \
  --ip-block 10.0.0.0 \
  --prefix-length 16 \
  | grep "^ID" | awk '{print $2}')

echo "VPC ID: ${VPC_ID}"
```

## Creating a Load Balancer

Set up a load balancer for the Kubernetes API:

```bash
# Create a load balancer
LB_ID=$(vultr-cli load-balancer create \
  --region ewr \
  --label "talos-k8s-api" \
  --forwarding-rules "frontend_protocol:tcp,frontend_port:6443,backend_protocol:tcp,backend_port:6443" \
  --health-check "protocol:tcp,port:6443,check_interval:10,response_timeout:5,healthy_threshold:3,unhealthy_threshold:3" \
  | grep "^ID" | awk '{print $2}')

echo "LB ID: ${LB_ID}"

# Get the load balancer IP
sleep 30
LB_IP=$(vultr-cli load-balancer get ${LB_ID} | grep "IPV4" | awk '{print $2}')
echo "Load Balancer IP: ${LB_IP}"
```

## Generating Talos Configuration

Generate the machine configurations:

```bash
# Generate Talos configuration
talosctl gen config talos-vultr-cluster "https://${LB_IP}:6443" \
  --output-dir _out

# Create a Vultr-specific patch
cat > vultr-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/vda
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
  --patch @vultr-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @vultr-patch.yaml \
  --output _out/worker-patched.yaml
```

## Launching Control Plane Instances

Create the control plane nodes. When using the ISO approach, you boot from the ISO and then apply the configuration via the Talos API:

```bash
# Create control plane instances
for i in 1 2 3; do
  INSTANCE_ID=$(vultr-cli instance create \
    --region ewr \
    --plan vc2-4c-8gb \
    --iso ${ISO_ID} \
    --vpc-ids ${VPC_ID} \
    --label "talos-cp-${i}" \
    | grep "^ID" | awk '{print $2}')

  echo "Control plane ${i} created: ${INSTANCE_ID}"

  # Add to load balancer
  vultr-cli load-balancer rule-update ${LB_ID} \
    --instances ${INSTANCE_ID}

  # Store the instance ID
  eval "CP${i}_ID=${INSTANCE_ID}"
done

# Wait for instances to boot
sleep 120

# Get IPs for control plane nodes
CP1_IP=$(vultr-cli instance get ${CP1_ID} | grep "MAIN IP" | awk '{print $2}')
CP2_IP=$(vultr-cli instance get ${CP2_ID} | grep "MAIN IP" | awk '{print $2}')
CP3_IP=$(vultr-cli instance get ${CP3_ID} | grep "MAIN IP" | awk '{print $2}')

echo "Control plane IPs: ${CP1_IP}, ${CP2_IP}, ${CP3_IP}"
```

## Applying Configuration to Nodes

When booting from ISO, the nodes enter maintenance mode. Apply the configuration through the Talos API:

```bash
# Apply configuration to control plane nodes
talosctl apply-config --insecure --nodes ${CP1_IP} \
  --file _out/controlplane-patched.yaml

talosctl apply-config --insecure --nodes ${CP2_IP} \
  --file _out/controlplane-patched.yaml

talosctl apply-config --insecure --nodes ${CP3_IP} \
  --file _out/controlplane-patched.yaml
```

## Launching Worker Instances

Create and configure worker nodes:

```bash
# Create worker instances
for i in 1 2 3; do
  INSTANCE_ID=$(vultr-cli instance create \
    --region ewr \
    --plan vc2-4c-8gb \
    --iso ${ISO_ID} \
    --vpc-ids ${VPC_ID} \
    --label "talos-worker-${i}" \
    | grep "^ID" | awk '{print $2}')

  echo "Worker ${i} created: ${INSTANCE_ID}"
  eval "WORKER${i}_ID=${INSTANCE_ID}"
done

# Wait and get IPs
sleep 120

for i in 1 2 3; do
  WORKER_VAR="WORKER${i}_ID"
  WORKER_IP=$(vultr-cli instance get ${!WORKER_VAR} | grep "MAIN IP" | awk '{print $2}')

  # Apply worker configuration
  talosctl apply-config --insecure --nodes ${WORKER_IP} \
    --file _out/worker-patched.yaml

  echo "Worker ${i} configured at ${WORKER_IP}"
done
```

## Bootstrapping the Cluster

Bootstrap the Kubernetes cluster:

```bash
# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Wait for nodes to install and reboot
sleep 180

# Bootstrap the cluster
talosctl bootstrap --nodes ${CP1_IP}

# Wait for the cluster to be healthy
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Post-Installation Setup

Install the essential components:

```bash
# Install Cilium CNI
cilium install --helm-set ipam.mode=kubernetes

# Verify Cilium
cilium status --wait
```

For persistent storage, you can use Vultr Block Storage through the CSI driver:

```yaml
# vultr-csi-secret.yaml
# Secret for Vultr CSI driver
apiVersion: v1
kind: Secret
metadata:
  name: vultr-csi
  namespace: kube-system
type: Opaque
stringData:
  api-key: "your-vultr-api-key"
```

```bash
# Apply the secret
kubectl apply -f vultr-csi-secret.yaml

# Install the Vultr CSI driver
kubectl apply -f https://raw.githubusercontent.com/vultr/vultr-csi/master/docs/releases/latest.yaml
```

## Cleaning Up

Remove all resources:

```bash
# Delete instances
for i in 1 2 3; do
  CP_VAR="CP${i}_ID"
  WORKER_VAR="WORKER${i}_ID"
  vultr-cli instance delete ${!CP_VAR}
  vultr-cli instance delete ${!WORKER_VAR}
done

# Delete load balancer
vultr-cli load-balancer delete ${LB_ID}

# Delete VPC
vultr-cli vpc2 delete ${VPC_ID}

# Delete ISO
vultr-cli iso delete ${ISO_ID}
```

## Conclusion

Vultr provides a solid platform for running Talos Linux with competitive pricing and global data center coverage. The ISO boot approach is slightly different from cloud providers that support custom images natively, but the maintenance mode workflow in Talos makes it straightforward to apply configurations to freshly booted nodes. Once the cluster is up, you get the same secure, immutable Kubernetes experience regardless of where it is running.
