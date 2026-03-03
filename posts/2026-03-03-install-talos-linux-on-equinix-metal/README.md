# How to Install Talos Linux on Equinix Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Equinix Metal, Bare Metal, Kubernetes, Infrastructure

Description: Deploy Talos Linux on Equinix Metal bare metal servers for high-performance Kubernetes clusters with dedicated hardware.

---

Equinix Metal (formerly Packet) provides bare metal servers on demand, which makes it one of the best platforms for running Talos Linux when you need dedicated hardware performance. Bare metal means no hypervisor overhead, direct hardware access, and consistent performance. Talos has first-class support for Equinix Metal with an official integration. This guide covers the complete deployment.

## Prerequisites

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install the Metal CLI
curl -sLO https://github.com/equinix/metal-cli/releases/latest/download/metal-linux-amd64
chmod +x metal-linux-amd64
sudo mv metal-linux-amd64 /usr/local/bin/metal

# Configure Metal CLI
metal init
# Follow the prompts to enter your API token and project ID

# Set your project ID
export METAL_PROJECT_ID="your-project-id"

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Setting Up Networking

Create a VLAN for your cluster's internal network:

```bash
# Create a VLAN for the Talos cluster
VLAN_ID=$(metal virtual-network create \
  --project-id ${METAL_PROJECT_ID} \
  --metro da \
  --description "Talos Cluster VLAN" \
  --vxlan 1000 \
  -o json | jq -r '.id')

echo "VLAN ID: ${VLAN_ID}"

# Reserve a block of public IPs for the cluster
IP_RESERVATION=$(metal ip request \
  --project-id ${METAL_PROJECT_ID} \
  --metro da \
  --quantity 8 \
  --type public_ipv4 \
  -o json | jq -r '.id')

echo "IP Reservation: ${IP_RESERVATION}"
```

## Creating a Load Balancer VIP

For the Kubernetes API endpoint, you can use Equinix Metal's Elastic IP feature or deploy a load balancer. The simplest approach for small clusters is to use a shared VIP:

```bash
# Reserve an Elastic IP for the Kubernetes API
API_VIP=$(metal ip request \
  --project-id ${METAL_PROJECT_ID} \
  --metro da \
  --quantity 1 \
  --type public_ipv4 \
  -o json | jq -r '.address')

echo "Kubernetes API VIP: ${API_VIP}"
```

## Generating Talos Configuration

Generate the machine configuration with Equinix Metal-specific patches:

```bash
# Generate base configuration
talosctl gen config talos-equinix-cluster "https://${API_VIP}:6443" \
  --output-dir _out

# Create patches for Equinix Metal
cat > equinix-cp-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: bond0
        dhcp: true
        vip:
          ip: "${API_VIP}"
  certSANs:
    - "${API_VIP}"
cluster:
  controlPlane:
    endpoint: "https://${API_VIP}:6443"
EOF

# Substitute the actual VIP in the patch
sed -i "s/\${API_VIP}/${API_VIP}/g" equinix-cp-patch.yaml

cat > equinix-worker-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: bond0
        dhcp: true
EOF

# Apply patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @equinix-cp-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @equinix-worker-patch.yaml \
  --output _out/worker-patched.yaml
```

## Provisioning Control Plane Servers

Create the bare metal servers for the control plane:

```bash
# Provision control plane servers
for i in 1 2 3; do
  SERVER_ID=$(metal device create \
    --project-id ${METAL_PROJECT_ID} \
    --metro da \
    --plan c3.small.x86 \
    --hostname "talos-cp-${i}" \
    --operating-system custom_ipxe \
    --ipxe-script-url "https://pxe.factory.talos.dev/pxe/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba/v1.7.0/metal-amd64" \
    --userdata-file _out/controlplane-patched.yaml \
    -o json | jq -r '.id')

  echo "Control plane ${i}: ${SERVER_ID}"
  eval "CP${i}_ID=${SERVER_ID}"
done

# Wait for servers to provision (bare metal takes a few minutes)
echo "Waiting for servers to provision..."
sleep 300
```

Equinix Metal supports iPXE booting, which is the cleanest way to boot Talos. The iPXE URL points to the Talos PXE boot endpoint, which loads the Talos kernel and initramfs directly.

## Provisioning Worker Servers

Create the worker servers:

```bash
# Provision worker servers
for i in 1 2 3; do
  SERVER_ID=$(metal device create \
    --project-id ${METAL_PROJECT_ID} \
    --metro da \
    --plan c3.small.x86 \
    --hostname "talos-worker-${i}" \
    --operating-system custom_ipxe \
    --ipxe-script-url "https://pxe.factory.talos.dev/pxe/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba/v1.7.0/metal-amd64" \
    --userdata-file _out/worker-patched.yaml \
    -o json | jq -r '.id')

  echo "Worker ${i}: ${SERVER_ID}"
done

echo "Waiting for worker servers..."
sleep 300
```

## Bootstrapping the Cluster

Once the servers are running, bootstrap the Kubernetes cluster:

```bash
# Get the IP of the first control plane server
CP1_IP=$(metal device get --id ${CP1_ID} -o json | \
  jq -r '.ip_addresses[] | select(.public == true and .address_family == 4) | .address')

echo "Control plane 1 IP: ${CP1_IP}"

# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Check if nodes are in maintenance mode
talosctl disks --nodes ${CP1_IP} --insecure

# Bootstrap the cluster
talosctl bootstrap --nodes ${CP1_IP}

# Wait for the cluster to be ready
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Configuring BGP for Load Balancing

Equinix Metal supports BGP, which you can use with MetalLB for native load balancing:

```bash
# Enable BGP on the project
metal bgp enable \
  --project-id ${METAL_PROJECT_ID} \
  --deployment-type local \
  --asn 65000

# Enable BGP on each server
for i in 1 2 3; do
  CP_VAR="CP${i}_ID"
  metal bgp session create --device-id ${!CP_VAR}
done
```

Install MetalLB with Equinix Metal BGP configuration:

```bash
# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml
```

```yaml
# metallb-config.yaml
# MetalLB configuration for Equinix Metal BGP
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: equinix-pool
  namespace: metallb-system
spec:
  addresses:
    - "${API_VIP}/32"
---
apiVersion: metallb.io/v1beta1
kind: BGPPeer
metadata:
  name: equinix-peer
  namespace: metallb-system
spec:
  myASN: 65000
  peerASN: 65530
  peerAddress: 169.254.255.1
  peerAddress: 169.254.255.2
---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: equinix-bgp
  namespace: metallb-system
spec:
  ipAddressPools:
    - equinix-pool
```

```bash
kubectl apply -f metallb-config.yaml
```

## Installing CNI and Storage

```bash
# Install Cilium
cilium install --helm-set ipam.mode=kubernetes

# For persistent storage, you can use local volumes or
# attach Equinix Metal Block Storage
# Block storage requires the CSI driver
kubectl apply -f https://raw.githubusercontent.com/packethost/csi-packet/master/deploy/kubernetes/setup.yaml
kubectl apply -f https://raw.githubusercontent.com/packethost/csi-packet/master/deploy/kubernetes/node.yaml
kubectl apply -f https://raw.githubusercontent.com/packethost/csi-packet/master/deploy/kubernetes/controller.yaml
```

## Performance Benefits of Bare Metal

Running Talos on bare metal through Equinix Metal gives you several performance advantages:

- **No hypervisor overhead** - Every CPU cycle goes directly to your workloads
- **Dedicated hardware** - No noisy neighbors affecting your I/O or network performance
- **Hardware access** - TPM, NVMe, and high-bandwidth networking are directly available
- **Consistent latency** - No virtualization jitter affecting latency-sensitive workloads

These benefits make Equinix Metal particularly good for running etcd (which is sensitive to disk latency), high-performance databases, and real-time applications.

## Cleaning Up

```bash
# Delete all servers
for i in 1 2 3; do
  CP_VAR="CP${i}_ID"
  metal device delete --id ${!CP_VAR} --force
done

# Delete workers similarly
# Clean up networking resources
metal virtual-network delete --id ${VLAN_ID}
```

## Conclusion

Equinix Metal is the ideal platform for Talos Linux when you need bare metal performance. The iPXE boot support makes Talos deployment clean and repeatable, and the BGP integration with MetalLB provides native load balancing without cloud-specific workarounds. While bare metal provisioning takes longer than spinning up virtual machines, the performance and security benefits make it worthwhile for production workloads.
