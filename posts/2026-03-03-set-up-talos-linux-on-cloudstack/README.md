# How to Set Up Talos Linux on CloudStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CloudStack, Private Cloud, Kubernetes, Virtualization

Description: Learn how to deploy Talos Linux on Apache CloudStack to run Kubernetes clusters in your private cloud infrastructure.

---

Apache CloudStack is a mature, open-source cloud computing platform that powers some of the world's largest cloud providers and private clouds. If your organization runs CloudStack, deploying Talos Linux on it lets you add a secure, immutable Kubernetes layer without changing your existing infrastructure.

This guide walks through the process of getting Talos Linux running on CloudStack instances and setting up a Kubernetes cluster.

## Why Talos Linux on CloudStack?

CloudStack provides solid infrastructure-as-a-service capabilities, including virtual machine management, networking, and storage. However, its built-in Kubernetes support (CloudStack Kubernetes Service) may not meet all requirements. Running Talos Linux directly on CloudStack instances gives you:

- Full control over the Kubernetes version and configuration
- An immutable, API-driven OS that is resistant to configuration drift
- No SSH access, which dramatically reduces the attack surface
- Consistency with Talos Linux deployments on other platforms

## Prerequisites

Before you start, gather the following:

- A CloudStack deployment with admin or user-level API access
- The CloudStack CLI (`cmk`) or direct API access
- Sufficient compute quota for your cluster (at least 3 VMs for HA)
- `talosctl` on your workstation

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install the CloudStack CLI (cloudmonkey)
pip install cloudmonkey

# Configure cloudmonkey
cmk set url http://cloudstack.example.com:8080/client/api
cmk set apikey YOUR_API_KEY
cmk set secretkey YOUR_SECRET_KEY
```

## Step 1: Register the Talos Linux Template

Download the Talos Linux image and register it as a CloudStack template:

```bash
# Download the Talos Linux image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/nocloud-amd64.raw.xz

# Decompress
xz -d nocloud-amd64.raw.xz

# Convert to qcow2 format (CloudStack often prefers qcow2)
qemu-img convert -f raw -O qcow2 nocloud-amd64.raw nocloud-amd64.qcow2
```

Register the template in CloudStack. You can either upload directly or host it on an HTTP server:

```bash
# Option 1: Register from a URL
cmk register template \
  name="Talos-Linux-v1.9.0" \
  displaytext="Talos Linux v1.9.0 for Kubernetes" \
  format=QCOW2 \
  hypervisor=KVM \
  ostypeid=<LINUX_OS_TYPE_ID> \
  zoneid=<ZONE_ID> \
  url="http://your-server/nocloud-amd64.qcow2" \
  requireshvm=true

# Option 2: Upload via the CloudStack UI
# Navigate to Images -> Templates -> Register Template
```

Wait for the template to be fully downloaded and ready before proceeding.

## Step 2: Set Up Networking

Create a network for your Talos cluster:

```bash
# Create an isolated network for the cluster
cmk create network \
  name="talos-network" \
  displaytext="Talos Linux Cluster Network" \
  networkofferingid=<NETWORK_OFFERING_ID> \
  zoneid=<ZONE_ID>

# If using VPC
cmk create vpc \
  name="talos-vpc" \
  displaytext="Talos Cluster VPC" \
  vpcofferingid=<VPC_OFFERING_ID> \
  zoneid=<ZONE_ID> \
  cidr=10.0.0.0/16
```

## Step 3: Configure Firewall and Port Forwarding

Set up the necessary firewall rules:

```bash
# Allow Kubernetes API access (port 6443)
cmk create firewallrule \
  ipaddressid=<PUBLIC_IP_ID> \
  protocol=tcp \
  startport=6443 \
  endport=6443 \
  cidrlist=<YOUR_IP>/32

# Allow Talos API access (port 50000)
cmk create firewallrule \
  ipaddressid=<PUBLIC_IP_ID> \
  protocol=tcp \
  startport=50000 \
  endport=50000 \
  cidrlist=<YOUR_IP>/32

# Create port forwarding rules to your CP nodes
cmk create portforwardingrule \
  ipaddressid=<PUBLIC_IP_ID> \
  protocol=tcp \
  publicport=6443 \
  publicendport=6443 \
  privateport=6443 \
  privateendport=6443 \
  virtualmachineid=<CP_VM_ID>
```

## Step 4: Deploy Virtual Machines

Create the instances for your cluster:

```bash
# Create control plane VMs
for i in 1 2 3; do
  cmk deploy virtualmachine \
    name="talos-cp-${i}" \
    displayname="Talos Control Plane ${i}" \
    serviceofferingid=<4CPU_8GB_OFFERING_ID> \
    templateid=<TALOS_TEMPLATE_ID> \
    zoneid=<ZONE_ID> \
    networkids=<TALOS_NETWORK_ID>
done

# Create worker VMs
for i in 1 2; do
  cmk deploy virtualmachine \
    name="talos-worker-${i}" \
    displayname="Talos Worker ${i}" \
    serviceofferingid=<8CPU_16GB_OFFERING_ID> \
    templateid=<TALOS_TEMPLATE_ID> \
    zoneid=<ZONE_ID> \
    networkids=<TALOS_NETWORK_ID>
done
```

List the VMs and note their IP addresses:

```bash
cmk list virtualmachines filter=name,id,nic
```

## Step 5: Generate and Apply Talos Configuration

Generate the configuration and apply it to each instance:

```bash
# Generate configuration
talosctl gen config cloudstack-cluster https://<LB_OR_CP_IP>:6443

# Customize for CloudStack
```

Edit the machine configuration:

```yaml
# controlplane.yaml
machine:
  install:
    disk: /dev/vda
    image: ghcr.io/siderolabs/installer:v1.9.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
```

Apply configurations:

```bash
# Apply to control plane nodes
for ip in <CP1_IP> <CP2_IP> <CP3_IP>; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file controlplane.yaml
done

# Apply to worker nodes
for ip in <WORKER1_IP> <WORKER2_IP>; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file worker.yaml
done
```

## Step 6: Bootstrap and Verify

```bash
# Bootstrap the cluster
talosctl config endpoint <CP1_IP>
talosctl config node <CP1_IP>
talosctl bootstrap

# Check health
talosctl health --wait-timeout 10m

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
kubectl --kubeconfig=./kubeconfig get nodes
kubectl --kubeconfig=./kubeconfig get pods -A
```

## Using CloudStack Volumes for Persistent Storage

CloudStack provides block storage that you can attach to VMs. For Kubernetes persistent volumes, you have a couple of options:

**Manual volume attachment:**

```bash
# Create a volume in CloudStack
cmk create volume \
  name="talos-data-01" \
  diskofferingid=<DISK_OFFERING_ID> \
  zoneid=<ZONE_ID> \
  size=50

# Attach to a VM
cmk attach volume \
  id=<VOLUME_ID> \
  virtualmachineid=<VM_ID>
```

**CloudStack CSI driver:**

If a CloudStack CSI driver is available for your version, install it in the cluster for dynamic provisioning:

```yaml
# StorageClass for CloudStack volumes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cloudstack-storage
provisioner: csi.cloudstack.apache.org
parameters:
  diskOfferingId: <DISK_OFFERING_ID>
  zoneId: <ZONE_ID>
```

## Load Balancing Options

For production clusters, set up a proper load balancer in front of your control plane:

```bash
# If CloudStack supports internal LB
cmk create loadbalancerrule \
  name="talos-k8s-api" \
  publicipid=<PUBLIC_IP_ID> \
  publicport=6443 \
  privateport=6443 \
  algorithm=roundrobin

# Assign VMs to the LB rule
cmk assign toloadbalancerrule \
  id=<LB_RULE_ID> \
  virtualmachineids=<CP1_ID>,<CP2_ID>,<CP3_ID>
```

Alternatively, use Talos Linux's built-in VIP feature for a simpler setup within the private network.

## Scaling the Cluster

Adding nodes is straightforward:

```bash
# Deploy a new VM from the Talos template
cmk deploy virtualmachine \
  name="talos-worker-3" \
  serviceofferingid=<OFFERING_ID> \
  templateid=<TALOS_TEMPLATE_ID> \
  zoneid=<ZONE_ID> \
  networkids=<TALOS_NETWORK_ID>

# Apply the worker configuration
talosctl apply-config --insecure \
  --nodes <NEW_WORKER_IP> \
  --file worker.yaml
```

## High Availability Considerations

For production use, make sure your control plane VMs are distributed across different CloudStack hosts:

```bash
# Create an anti-affinity group
cmk create affinitygroup \
  name="talos-cp-antiaffinity" \
  type="host anti-affinity"

# Deploy CP VMs with the anti-affinity group
cmk deploy virtualmachine \
  name="talos-cp-1" \
  serviceofferingid=<OFFERING_ID> \
  templateid=<TALOS_TEMPLATE_ID> \
  zoneid=<ZONE_ID> \
  networkids=<NETWORK_ID> \
  affinitygroupnames="talos-cp-antiaffinity"
```

## Troubleshooting

If VMs fail to boot with the Talos template, check that the template format matches your hypervisor (KVM uses QCOW2, VMware uses OVA). Also verify that the OS type is set correctly - use a generic Linux 64-bit type.

If nodes cannot communicate, review your CloudStack network configuration and security group rules. In isolated networks, inter-VM communication should work by default, but verify with the CloudStack UI.

For storage-related issues, make sure the virtual disk is large enough. The Talos installer needs space to write its partitions.

## Conclusion

Deploying Talos Linux on CloudStack brings modern, secure Kubernetes to your private cloud. The combination works well because CloudStack handles the infrastructure layer while Talos Linux provides a purpose-built operating system for running Kubernetes. With API-driven management on both sides, you can automate the entire stack from VM provisioning through cluster bootstrapping.
