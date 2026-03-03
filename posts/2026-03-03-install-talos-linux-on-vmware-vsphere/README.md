# How to Install Talos Linux on VMware vSphere

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VMware, vSphere, Kubernetes, Virtualization

Description: A step-by-step guide to deploying Talos Linux on VMware vSphere using OVA templates for a production Kubernetes cluster.

---

VMware vSphere is the most widely used virtualization platform in enterprise data centers, and Talos Linux works well on it. Talos publishes an OVA template specifically for vSphere deployments, which simplifies the process of creating virtual machines. This guide covers the complete workflow from importing the OVA to running a production Kubernetes cluster.

## Prerequisites

Make sure you have the following ready:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install govc (vSphere CLI tool)
curl -L -o govc.gz https://github.com/vmware/govmomi/releases/latest/download/govc_Linux_x86_64.tar.gz
gunzip govc.gz && chmod +x govc && sudo mv govc /usr/local/bin/

# Configure govc with your vSphere credentials
export GOVC_URL="vcenter.example.com"
export GOVC_USERNAME="administrator@vsphere.local"
export GOVC_PASSWORD="your-password"
export GOVC_INSECURE=true  # Only for self-signed certs
export GOVC_DATACENTER="Datacenter"
export GOVC_DATASTORE="datastore1"
export GOVC_NETWORK="VM Network"
export GOVC_RESOURCE_POOL="/Datacenter/host/Cluster/Resources"

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Importing the Talos OVA

Download and import the Talos OVA template into vSphere:

```bash
# Download the Talos vSphere OVA
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/vmware-amd64.ova

# Import the OVA as a template
govc import.ova -name talos-v1.7.0 vmware-amd64.ova

# Mark it as a template
govc vm.markastemplate talos-v1.7.0
```

## Planning Your Network

Before creating VMs, plan your network layout. A typical Talos vSphere deployment uses:

- A management network for vSphere and Talos API access
- A workload network for Kubernetes pod traffic
- Optionally, a storage network for distributed storage

```bash
# Verify your network is available
govc ls network/

# Check available datastores
govc ls datastore/
```

## Generating Talos Configuration

Generate the machine configuration. You will need to choose an IP address or DNS name for the Kubernetes API endpoint:

```bash
# Set your cluster endpoint
# This should be the IP of a load balancer in front of the control plane
CLUSTER_ENDPOINT="https://10.0.1.100:6443"

# Generate Talos configuration
talosctl gen config talos-vsphere-cluster "${CLUSTER_ENDPOINT}" \
  --output-dir _out

# Create a vSphere-specific patch for control plane nodes
cat > vsphere-cp-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    hostname: talos-cp-1
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.11/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
    nameservers:
      - 10.0.1.1
      - 8.8.8.8
EOF

# Create a patch for worker nodes
cat > vsphere-worker-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    hostname: talos-worker-1
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.21/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
    nameservers:
      - 10.0.1.1
      - 8.8.8.8
EOF
```

## Creating Control Plane VMs

Clone the template to create control plane VMs:

```bash
# Create control plane VMs from the template
for i in 1 2 3; do
  IP_SUFFIX=$((10 + i))

  # Clone the template
  govc vm.clone -vm talos-v1.7.0 \
    -ds ${GOVC_DATASTORE} \
    -pool ${GOVC_RESOURCE_POOL} \
    -on=false \
    talos-cp-${i}

  # Configure VM hardware
  govc vm.change -vm talos-cp-${i} \
    -c 4 \
    -m 8192 \
    -e "disk.enableUUID=TRUE" \
    -e "guestinfo.talos.config=$(base64 -w0 _out/controlplane.yaml)"

  # Add a second disk for etcd (recommended)
  govc vm.disk.create -vm talos-cp-${i} \
    -size 50G \
    -name talos-cp-${i}/etcd-disk

  # Power on the VM
  govc vm.power -on talos-cp-${i}

  echo "Control plane ${i} created with IP 10.0.1.${IP_SUFFIX}"
done
```

The key configuration here is the `guestinfo.talos.config` extra config parameter. This is how Talos receives its machine configuration on vSphere. The configuration is base64-encoded and passed through vSphere's guestinfo mechanism.

## Creating Worker VMs

```bash
# Create worker VMs
for i in 1 2 3; do
  IP_SUFFIX=$((20 + i))

  govc vm.clone -vm talos-v1.7.0 \
    -ds ${GOVC_DATASTORE} \
    -pool ${GOVC_RESOURCE_POOL} \
    -on=false \
    talos-worker-${i}

  govc vm.change -vm talos-worker-${i} \
    -c 4 \
    -m 16384 \
    -e "disk.enableUUID=TRUE" \
    -e "guestinfo.talos.config=$(base64 -w0 _out/worker.yaml)"

  # Add a larger data disk for workloads
  govc vm.disk.create -vm talos-worker-${i} \
    -size 200G \
    -name talos-worker-${i}/data-disk

  govc vm.power -on talos-worker-${i}

  echo "Worker ${i} created with IP 10.0.1.${IP_SUFFIX}"
done
```

## Setting Up the Load Balancer

For the Kubernetes API endpoint, you need a load balancer in front of the control plane nodes. On vSphere, you have several options:

```bash
# Option 1: Use HAProxy as a load balancer
# Create a simple HAProxy VM or container

# haproxy.cfg
cat > haproxy.cfg <<'EOF'
frontend kubernetes-api
    bind *:6443
    default_backend kubernetes-api-backend

backend kubernetes-api-backend
    balance roundrobin
    option tcp-check
    server cp1 10.0.1.11:6443 check
    server cp2 10.0.1.12:6443 check
    server cp3 10.0.1.13:6443 check
EOF

# Option 2: Use Talos VIP (virtual IP) feature
# Add this to the control plane machine config:
# machine:
#   network:
#     interfaces:
#       - interface: eth0
#         vip:
#           ip: 10.0.1.100
```

The Talos VIP feature is simpler because it does not require an external load balancer. The VIP floats between control plane nodes automatically.

## Bootstrapping the Cluster

```bash
# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint 10.0.1.11
talosctl config node 10.0.1.11

# Wait for nodes to be ready
sleep 120

# Apply configuration to each node (if using guestinfo did not work)
talosctl apply-config --insecure --nodes 10.0.1.11 \
  --file _out/controlplane.yaml

# Bootstrap the cluster
talosctl bootstrap --nodes 10.0.1.11

# Wait for health
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Installing vSphere CSI Driver

For persistent storage backed by vSphere datastores:

```yaml
# vsphere-csi-config.yaml
# vSphere CSI driver configuration
apiVersion: v1
kind: Secret
metadata:
  name: vsphere-config-secret
  namespace: vmware-system-csi
type: Opaque
stringData:
  csi-vsphere.conf: |
    [Global]
    cluster-id = "talos-vsphere-cluster"

    [VirtualCenter "vcenter.example.com"]
    insecure-flag = "true"
    user = "administrator@vsphere.local"
    password = "your-password"
    port = "443"
    datacenters = "Datacenter"
```

```bash
# Install the vSphere CSI driver
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/v3.0.0/manifests/vanilla/vsphere-csi-driver.yaml
kubectl apply -f vsphere-csi-config.yaml
```

Create a storage class:

```yaml
# vsphere-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-csi
provisioner: csi.vsphere.vmware.com
parameters:
  datastoreurl: "ds:///vmfs/volumes/datastore1/"
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

## Conclusion

VMware vSphere and Talos Linux make a strong combination for enterprise Kubernetes deployments. The OVA template and guestinfo configuration mechanism make deployments repeatable, and vSphere's mature storage and networking features complement Talos's security-focused design. For large-scale deployments, consider using Terraform with the vSphere provider to automate the entire infrastructure provisioning process.
