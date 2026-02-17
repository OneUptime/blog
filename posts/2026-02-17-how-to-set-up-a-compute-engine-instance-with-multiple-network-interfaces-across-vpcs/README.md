# How to Set Up a Compute Engine Instance with Multiple Network Interfaces Across VPCs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Networking, VPC, Multi-NIC

Description: Learn how to create a Compute Engine VM with multiple network interfaces connected to different VPC networks for network segmentation, security appliances, and cross-VPC routing.

---

Most Compute Engine VMs get by with a single network interface. But there are scenarios where you need a VM connected to multiple VPC networks at the same time - running a network appliance, separating management traffic from data traffic, or bridging between isolated network segments. GCP supports this through multiple network interfaces (multi-NIC) on a single VM.

This setup is more involved than a typical VM creation, so let me walk through the details.

## When You Need Multiple Network Interfaces

The most common use cases are:

- **Network appliances** - Firewalls, load balancers, or IDS/IPS systems that need to inspect traffic between networks
- **Management plane separation** - Keeping management SSH traffic on a separate network from application data traffic
- **Legacy application requirements** - Applications that expect to communicate on specific network interfaces
- **Cross-VPC communication** - Connecting VPCs that do not have VPC peering configured

Each network interface connects to a different VPC network. A single VM can have up to 8 network interfaces, depending on the machine type. The number of allowed interfaces scales with the number of vCPUs.

## Prerequisites: Create the VPC Networks

Each network interface must connect to a different VPC. You cannot have two interfaces in the same VPC. Let me create two VPC networks for this example:

```bash
# Create the first VPC network for application traffic
gcloud compute networks create app-network \
  --subnet-mode=custom

# Create a subnet in the app network
gcloud compute networks subnets create app-subnet \
  --network=app-network \
  --region=us-central1 \
  --range=10.0.1.0/24
```

```bash
# Create the second VPC network for management traffic
gcloud compute networks create mgmt-network \
  --subnet-mode=custom

# Create a subnet in the management network
gcloud compute networks subnets create mgmt-subnet \
  --network=mgmt-network \
  --region=us-central1 \
  --range=10.0.2.0/24
```

```bash
# Create firewall rules for both networks
# Allow SSH on the management network
gcloud compute firewall-rules create mgmt-allow-ssh \
  --network=mgmt-network \
  --allow=tcp:22 \
  --source-ranges=0.0.0.0/0

# Allow internal traffic on the app network
gcloud compute firewall-rules create app-allow-internal \
  --network=app-network \
  --allow=tcp,udp,icmp \
  --source-ranges=10.0.1.0/24

# Allow health checks on the app network
gcloud compute firewall-rules create app-allow-health-check \
  --network=app-network \
  --allow=tcp:80,tcp:443 \
  --source-ranges=130.211.0.0/22,35.191.0.0/16
```

## Creating the Multi-NIC VM

When creating a VM with multiple network interfaces, you specify each one using the `--network-interface` flag:

```bash
# Create a VM with two network interfaces in different VPCs
gcloud compute instances create multi-nic-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --network-interface=subnet=app-subnet,no-address \
  --network-interface=subnet=mgmt-subnet
```

In this example:
- The first interface connects to `app-subnet` with no external IP (internal-only)
- The second interface connects to `mgmt-subnet` with an ephemeral external IP for SSH access

The order matters. The first `--network-interface` becomes `nic0` (the default interface), and the second becomes `nic1`.

## Verifying the Network Interfaces

After the VM is created, verify the interfaces:

```bash
# Check the network interfaces on the VM
gcloud compute instances describe multi-nic-vm \
  --zone=us-central1-a \
  --format="yaml(networkInterfaces)"
```

SSH into the VM and check the interfaces from inside:

```bash
# SSH via the management interface
gcloud compute ssh multi-nic-vm --zone=us-central1-a

# List all network interfaces inside the VM
ip addr show
```

You should see `ens4` (nic0, connected to app-subnet) and `ens5` (nic1, connected to mgmt-subnet).

## Configuring Routing Inside the VM

This is where multi-NIC setups get tricky. By default, the VM only has a default route through `nic0`. Traffic destined for subnets on other interfaces will try to go through `nic0` and fail.

You need to set up policy-based routing so that responses go back through the correct interface:

```bash
# Add a routing table for the second interface (nic1/ens5)
# This ensures responses on nic1 go back through nic1

# Get the gateway IP for nic1 (usually the first IP in the subnet)
GATEWAY_NIC1="10.0.2.1"
NIC1_IP=$(ip addr show ens5 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)

# Create a separate routing table for nic1 traffic
echo "100 mgmt" | sudo tee -a /etc/iproute2/rt_tables

# Add rules to use the mgmt routing table for traffic from nic1
sudo ip rule add from "${NIC1_IP}" table mgmt priority 100
sudo ip route add default via "${GATEWAY_NIC1}" dev ens5 table mgmt
sudo ip route add 10.0.2.0/24 dev ens5 table mgmt
```

To make these routes persistent across reboots, create a script:

```bash
#!/bin/bash
# /etc/network/if-up.d/multi-nic-routes
# Configure policy routing for multi-NIC setup

if [ "$IFACE" = "ens5" ]; then
  GATEWAY="10.0.2.1"
  NIC_IP=$(ip addr show ens5 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)

  # Add routing table entry if not present
  grep -q "100 mgmt" /etc/iproute2/rt_tables || echo "100 mgmt" >> /etc/iproute2/rt_tables

  # Configure policy routing
  ip rule add from "${NIC_IP}" table mgmt priority 100 2>/dev/null
  ip route add default via "${GATEWAY}" dev ens5 table mgmt 2>/dev/null
  ip route add 10.0.2.0/24 dev ens5 table mgmt 2>/dev/null
fi
```

## Enabling IP Forwarding

If the VM will act as a router or network appliance forwarding traffic between the two networks, you need to enable IP forwarding:

```bash
# Enable IP forwarding on the VM (must be set at creation or while stopped)
gcloud compute instances stop multi-nic-vm --zone=us-central1-a

gcloud compute instances update multi-nic-vm \
  --zone=us-central1-a \
  --can-ip-forward

gcloud compute instances start multi-nic-vm --zone=us-central1-a
```

Inside the VM, enable kernel IP forwarding:

```bash
# Enable IP forwarding in the kernel
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Setting Up the VM as a Network Appliance

Here is an example of configuring the multi-NIC VM as a simple NAT gateway between the two networks:

```bash
# Configure iptables to NAT traffic from app-network through mgmt-network
sudo iptables -t nat -A POSTROUTING -o ens5 -j MASQUERADE
sudo iptables -A FORWARD -i ens4 -o ens5 -j ACCEPT
sudo iptables -A FORWARD -i ens5 -o ens4 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Save iptables rules to persist across reboots
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

Then update routes in the app-network to send traffic through this VM:

```bash
# Create a route in the app network that sends traffic through the multi-NIC VM
gcloud compute routes create app-to-internet \
  --network=app-network \
  --destination-range=0.0.0.0/0 \
  --next-hop-instance=multi-nic-vm \
  --next-hop-instance-zone=us-central1-a \
  --priority=800
```

## Machine Type NIC Limits

Not every machine type supports the same number of network interfaces. Here is a quick reference:

| vCPUs | Maximum NICs |
|-------|-------------|
| 1 | 2 |
| 2-3 | 3 |
| 4-5 | 4 |
| 6-7 | 5 |
| 8+ | 8 |

If you try to add more interfaces than your machine type allows, the creation will fail with an error message telling you the maximum.

## Monitoring Multi-NIC Traffic

You can monitor traffic on each interface separately in Cloud Monitoring. The metrics include bytes sent/received per interface, packets per interface, and dropped packets.

```bash
# Check per-interface network metrics
gcloud monitoring time-series list \
  --filter='metric.type="compute.googleapis.com/instance/network/received_bytes_count" AND resource.labels.instance_id="INSTANCE_ID"' \
  --interval-start-time=$(date -u -d '-1 hour' +%Y-%m-%dT%H:%M:%SZ)
```

VPC Flow Logs are also useful for debugging multi-NIC routing. Enable them on both subnets:

```bash
# Enable VPC Flow Logs on both subnets for traffic debugging
gcloud compute networks subnets update app-subnet \
  --region=us-central1 \
  --enable-flow-logs

gcloud compute networks subnets update mgmt-subnet \
  --region=us-central1 \
  --enable-flow-logs
```

Multi-NIC VMs are a powerful networking tool, but they add complexity. Make sure you really need them before going down this path. For simple cross-VPC communication, VPC peering or Shared VPC is usually simpler. But when you need a network appliance or true traffic separation, multi-NIC is the way to go.
