# How to Set Up a Highly Available Virtual IP with Pacemaker on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Virtual IP, VIP, Pacemaker, High Availability, Cluster, Linux

Description: Learn how to set up a highly available virtual IP address with Pacemaker on RHEL 9 for seamless failover between cluster nodes.

---

A virtual IP (VIP) is a floating IP address managed by Pacemaker that automatically moves between cluster nodes during failover. Clients connect to the VIP and are transparently redirected to whichever node currently hosts the service.

## Prerequisites

- A RHEL 9 Pacemaker cluster with at least two nodes
- STONITH fencing configured
- An unused IP address on the cluster network

## Understanding Virtual IPs

A VIP works by:

1. Pacemaker assigns the IP to the active node's network interface
2. ARP announcements inform the network of the new MAC address for the IP
3. When failover occurs, the IP moves to another node
4. New ARP announcements redirect traffic to the new node

## Step 1: Choose the VIP Address

Select an IP address on the same subnet as your cluster nodes that is not assigned to any other device. Example: 192.168.1.100

## Step 2: Create the VIP Resource

```bash
sudo pcs resource create ClusterVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 \
    cidr_netmask=24 \
    op monitor interval=30s
```

Parameters:

- `ip` - The virtual IP address
- `cidr_netmask` - The subnet mask in CIDR notation
- `nic` (optional) - The network interface (auto-detected if omitted)

## Step 3: Verify the VIP

Check that the VIP is running:

```bash
sudo pcs status resources
```

Check which node has the VIP:

```bash
ip addr show | grep 192.168.1.100
```

Test connectivity:

```bash
ping 192.168.1.100
```

## Step 4: Configure the VIP with a Service

Group the VIP with a service resource:

```bash
sudo pcs resource create AppService systemd:myapp \
    op monitor interval=30s

sudo pcs resource group add AppGroup ClusterVIP AppService
```

The VIP starts first, then the service. They always run on the same node.

## Step 5: Test Failover

Put the active node in standby:

```bash
sudo pcs node standby node1
```

Verify the VIP moved:

```bash
sudo pcs status
ping 192.168.1.100
```

Bring the node back:

```bash
sudo pcs node unstandby node1
```

## Configuring Multiple VIPs

For services that need multiple IP addresses:

```bash
sudo pcs resource create VIP1 ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24

sudo pcs resource create VIP2 ocf:heartbeat:IPaddr2 \
    ip=192.168.1.101 cidr_netmask=24
```

Group them if they must be on the same node:

```bash
sudo pcs resource group add MultiVIP VIP1 VIP2
```

Or let them float independently on different nodes for load distribution.

## VIP on a Specific Interface

Specify the network interface:

```bash
sudo pcs resource create ClusterVIP ocf:heartbeat:IPaddr2 \
    ip=192.168.1.100 cidr_netmask=24 nic=eth0 \
    op monitor interval=30s
```

## Configuring VIP with IPv6

```bash
sudo pcs resource create VIP6 ocf:heartbeat:IPaddr2 \
    ip=fd00::100 cidr_netmask=64 \
    op monitor interval=30s
```

## Monitoring VIP Health

The IPaddr2 resource agent monitors by:

1. Checking if the IP is assigned to a local interface
2. Sending ARP/neighbor solicitation packets

Customize monitor behavior:

```bash
sudo pcs resource update ClusterVIP op monitor interval=10s timeout=20s
```

## Configuring Resource Stickiness

Prevent the VIP from moving back when the original node recovers:

```bash
sudo pcs resource meta ClusterVIP resource-stickiness=100
```

## Configuring Preferred Node

Make the VIP prefer a specific node:

```bash
sudo pcs constraint location ClusterVIP prefers node1=50
```

## Troubleshooting VIP Issues

### VIP Not Responding

Check if the VIP is assigned:

```bash
ip addr show | grep 192.168.1.100
```

Check ARP tables on a client:

```bash
arp -n | grep 192.168.1.100
```

### VIP Does Not Failover

Check resource status and errors:

```bash
sudo pcs resource status ClusterVIP
sudo pcs resource failcount show ClusterVIP
```

Clean up failures:

```bash
sudo pcs resource cleanup ClusterVIP
```

## Conclusion

A virtual IP with Pacemaker on RHEL 9 provides seamless failover for client connections. The VIP automatically moves during node failures, and ARP announcements redirect network traffic to the new node. Group the VIP with service resources and configure stickiness to control failover behavior.
