# How to Set Up Talos Linux on OpenStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OpenStack, Cloud, Kubernetes, Private Cloud

Description: A complete guide to deploying Talos Linux on OpenStack for building secure Kubernetes clusters in private cloud environments.

---

OpenStack is the most widely deployed open-source private cloud platform, and running Talos Linux on it gives you a secure, immutable Kubernetes layer on top of your existing infrastructure. Organizations that already operate OpenStack clouds can add Kubernetes capabilities without introducing a new infrastructure layer or adopting a managed service they do not control.

This guide covers deploying Talos Linux as OpenStack instances and building a Kubernetes cluster from them.

## Why Talos Linux on OpenStack?

OpenStack provides compute, networking, and storage primitives. You could install any Linux distribution and set up Kubernetes manually, but that creates management burden. Talos Linux simplifies the stack by removing SSH access, package management, and configuration drift. You get instances that do exactly one thing: run Kubernetes.

This combination is particularly valuable for enterprises that need:

- Consistent Kubernetes deployments across multiple OpenStack regions
- An immutable OS layer that reduces the attack surface
- API-driven management that fits into existing automation pipelines

## Prerequisites

You will need:

- An OpenStack cloud with sufficient quota for your cluster
- The OpenStack CLI tools installed and configured
- Access to create images, instances, networks, and security groups
- `talosctl` installed on your workstation

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install OpenStack CLI
pip install python-openstackclient

# Verify OpenStack connectivity
openstack token issue
```

Make sure your OpenStack RC file is sourced so the CLI tools can authenticate:

```bash
source openrc.sh
```

## Step 1: Upload the Talos Linux Image

Download the OpenStack-compatible Talos Linux image and upload it to Glance:

```bash
# Download the OpenStack (nocloud) image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/nocloud-amd64.raw.xz

# Decompress it
xz -d nocloud-amd64.raw.xz

# Upload to OpenStack Glance
openstack image create \
  --disk-format raw \
  --container-format bare \
  --file nocloud-amd64.raw \
  --property os_type=linux \
  --public \
  "Talos Linux v1.9.0"
```

Note the image ID from the output. You will use it when creating instances.

## Step 2: Create Network Infrastructure

Set up the networking for your Talos cluster:

```bash
# Create a network for the cluster
openstack network create talos-net

# Create a subnet
openstack subnet create talos-subnet \
  --network talos-net \
  --subnet-range 10.0.1.0/24 \
  --dns-nameserver 8.8.8.8 \
  --gateway 10.0.1.1

# Create a router and connect to external network
openstack router create talos-router
openstack router set talos-router --external-gateway external-net
openstack router add subnet talos-router talos-subnet
```

## Step 3: Configure Security Groups

Create security groups that allow the necessary traffic for Kubernetes:

```bash
# Create a security group for Talos nodes
openstack security group create talos-cluster

# Allow all traffic between cluster nodes
openstack security group rule create talos-cluster \
  --protocol tcp --dst-port 1:65535 \
  --remote-group talos-cluster

openstack security group rule create talos-cluster \
  --protocol udp --dst-port 1:65535 \
  --remote-group talos-cluster

# Allow Kubernetes API from outside
openstack security group rule create talos-cluster \
  --protocol tcp --dst-port 6443 \
  --remote-ip 0.0.0.0/0

# Allow Talos API from your management IP
openstack security group rule create talos-cluster \
  --protocol tcp --dst-port 50000 \
  --remote-ip <YOUR_IP>/32

# Allow ICMP for debugging
openstack security group rule create talos-cluster \
  --protocol icmp
```

## Step 4: Create a Load Balancer

Set up an Octavia load balancer for the Kubernetes API:

```bash
# Create the load balancer
openstack loadbalancer create \
  --name talos-api-lb \
  --vip-subnet-id talos-subnet

# Wait for it to become active
openstack loadbalancer show talos-api-lb

# Create a listener
openstack loadbalancer listener create \
  --name talos-api-listener \
  --protocol TCP \
  --protocol-port 6443 \
  talos-api-lb

# Create a pool
openstack loadbalancer pool create \
  --name talos-api-pool \
  --protocol TCP \
  --listener talos-api-listener \
  --lb-algorithm ROUND_ROBIN

# Create a health monitor
openstack loadbalancer healthmonitor create \
  --type TCP \
  --delay 10 \
  --timeout 5 \
  --max-retries 3 \
  talos-api-pool
```

## Step 5: Generate Talos Configuration

Generate the machine configuration using the load balancer's VIP:

```bash
# Get the LB VIP address
LB_VIP=$(openstack loadbalancer show talos-api-lb -f value -c vip_address)

# Generate configuration
talosctl gen config openstack-cluster https://${LB_VIP}:6443

# Customize for OpenStack
```

Edit the configuration for the OpenStack environment:

```yaml
# In controlplane.yaml
machine:
  install:
    disk: /dev/vda
    image: ghcr.io/siderolabs/installer:v1.9.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
  certSANs:
    - ${LB_VIP}
```

## Step 6: Create Instances

Launch the control plane instances:

```bash
# Create control plane instances
for i in 1 2 3; do
  openstack server create \
    --flavor m1.large \
    --image "Talos Linux v1.9.0" \
    --network talos-net \
    --security-group talos-cluster \
    --key-name my-keypair \
    "talos-cp-${i}"
done

# Create worker instances
for i in 1 2; do
  openstack server create \
    --flavor m1.xlarge \
    --image "Talos Linux v1.9.0" \
    --network talos-net \
    --security-group talos-cluster \
    "talos-worker-${i}"
done
```

Wait for instances to become active and get their IP addresses:

```bash
# List instances and their IPs
openstack server list --name talos
```

## Step 7: Add Instances to Load Balancer

Register control plane instances as backends:

```bash
# Add each CP node to the LB pool
for ip in <CP1_IP> <CP2_IP> <CP3_IP>; do
  openstack loadbalancer member create \
    --address $ip \
    --protocol-port 6443 \
    --subnet-id talos-subnet \
    talos-api-pool
done
```

## Step 8: Assign Floating IPs

Assign floating IPs so you can reach the instances from outside the OpenStack network:

```bash
# Create and assign floating IPs for management
for server in talos-cp-1 talos-cp-2 talos-cp-3; do
  FIP=$(openstack floating ip create external-net -f value -c floating_ip_address)
  openstack server add floating ip $server $FIP
  echo "$server: $FIP"
done

# Also assign a floating IP to the load balancer VIP
LB_FIP=$(openstack floating ip create external-net -f value -c floating_ip_address)
openstack floating ip set --port $(openstack loadbalancer show talos-api-lb -f value -c vip_port_id) $LB_FIP
```

## Step 9: Apply Configuration and Bootstrap

```bash
# Apply control plane config to each node
for ip in <CP1_FIP> <CP2_FIP> <CP3_FIP>; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file controlplane.yaml
done

# Apply worker config
for ip in <WORKER1_IP> <WORKER2_IP>; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file worker.yaml
done

# Bootstrap the first control plane node
talosctl config endpoint <CP1_FIP>
talosctl config node <CP1_FIP>
talosctl bootstrap

# Check health
talosctl health --wait-timeout 10m

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
kubectl --kubeconfig=./kubeconfig get nodes
```

## Integrating with Cinder Storage

To use OpenStack Cinder volumes as Kubernetes persistent storage, install the OpenStack Cloud Provider:

```yaml
# cloud-config secret for the OpenStack provider
apiVersion: v1
kind: Secret
metadata:
  name: cloud-config
  namespace: kube-system
stringData:
  cloud.conf: |
    [Global]
    auth-url=https://your-openstack:5000/v3
    username=your-user
    password=your-password
    tenant-name=your-project
    domain-name=Default
    region=RegionOne
    [BlockStorage]
    bs-version=v3
```

## Troubleshooting

If instances boot but are not reachable, check security group rules and verify that the network and subnet are configured correctly. Use the OpenStack console to view the instance's boot output.

If the load balancer health checks fail, ensure the API server is actually running on the control plane nodes. Check with `talosctl service` to see the status of Kubernetes services.

For DNS resolution issues within the cluster, verify that your subnet's DNS settings are correct and that CoreDNS pods are running.

## Conclusion

Running Talos Linux on OpenStack gives you a secure, consistent Kubernetes platform on top of your private cloud infrastructure. The combination leverages OpenStack's compute and networking while Talos Linux provides an immutable, API-driven operating system layer. This approach scales from small development clusters to large production deployments, and the automation-friendly nature of both platforms means you can manage everything through code.
