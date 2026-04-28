# How to Configure IPv6 in OpenStack Neutron

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OpenStack, Neutron, Cloud, SLAAC, DHCPv6, Dual-Stack

Description: Configure IPv6 subnets, router advertisement modes, and dual-stack networks in OpenStack Neutron, enabling IPv6 connectivity for cloud instances through SLAAC, DHCPv6, and static addressing.

## Introduction

OpenStack Neutron supports IPv6 through IPv6 subnets on networks, with three address assignment modes: SLAAC, DHCPv6-stateless, and DHCPv6-stateful. Router Advertisement (RA) configuration determines whether VMs configure addresses automatically or receive them from Neutron's dnsmasq. Dual-stack networks have both IPv4 and IPv6 subnets on the same network.

## Create IPv6 Subnet in Neutron

```bash
# Create a network

openstack network create my-network

# Create IPv4 subnet
openstack subnet create \
    --network my-network \
    --subnet-range 10.0.1.0/24 \
    --allocation-pool start=10.0.1.100,end=10.0.1.200 \
    --dns-nameserver 8.8.8.8 \
    my-subnet-v4

# Create IPv6 subnet with SLAAC (stateless, no DHCPv6)
openstack subnet create \
    --network my-network \
    --ip-version 6 \
    --subnet-range 2001:db8:c10d:1::/64 \
    --ipv6-address-mode slaac \
    --ipv6-ra-mode slaac \
    --dns-nameserver 2001:db8::53 \
    my-subnet-v6-slaac

# Create IPv6 subnet with DHCPv6-stateless (SLAAC + DNS from DHCPv6)
openstack subnet create \
    --network my-network \
    --ip-version 6 \
    --subnet-range fd00:c10d:1::/64 \
    --ipv6-address-mode dhcpv6-stateless \
    --ipv6-ra-mode dhcpv6-stateless \
    my-subnet-v6-stateless

# Create IPv6 subnet with DHCPv6-stateful (full address assignment from DHCPv6)
openstack subnet create \
    --network my-network \
    --ip-version 6 \
    --subnet-range fd00:c10d:2::/64 \
    --ipv6-address-mode dhcpv6-stateful \
    --ipv6-ra-mode dhcpv6-stateful \
    --allocation-pool start=fd00:c10d:2::100,end=fd00:c10d:2::200 \
    my-subnet-v6-stateful
```

## Create Router with IPv6 External Gateway

```bash
# Create a router
openstack router create my-router

# Add IPv4 external gateway
openstack router set my-router \
    --external-gateway public-network

# Add IPv6 subnet to router
openstack router add subnet my-router my-subnet-v6-slaac

# List router ports including IPv6
openstack router show my-router
openstack port list --router my-router
```

## Launch Instance with IPv6

```bash
# Create a server on the dual-stack network
openstack server create \
    --flavor m1.small \
    --image ubuntu-22.04 \
    --network my-network \
    --key-name mykey \
    my-ipv6-server

# Check assigned IP addresses (both IPv4 and IPv6)
openstack server show my-ipv6-server | grep -A10 addresses

# Expected:
# addresses: my-network=10.0.1.101, 2001:db8:c10d:1:5054:ff:feab:cdef
#                                    ^ SLAAC-generated from MAC

# Assign a floating IP (IPv4) if external access needed
openstack floating ip create public-network
openstack server add floating ip my-ipv6-server 203.0.113.50
```

## Security Groups for IPv6

```bash
# Add IPv6 security group rules

# Allow all incoming IPv6 traffic (for testing only)
openstack security group rule create default \
    --ethertype IPv6 \
    --ingress \
    --protocol any

# Allow specific IPv6 traffic
# SSH over IPv6
openstack security group rule create my-sg \
    --ethertype IPv6 \
    --ingress \
    --protocol tcp \
    --dst-port 22 \
    --remote-ip ::/0

# ICMPv6 (essential for NDP and PMTUD)
openstack security group rule create my-sg \
    --ethertype IPv6 \
    --ingress \
    --protocol icmpv6
```

## Neutron Configuration for IPv6

```ini
# /etc/neutron/neutron.conf

[DEFAULT]
# IPv6 extensions
ipv6_pd_enabled = true

# /etc/neutron/plugins/ml2/ml2_conf.ini
[ml2]
# Ensure IPv6 address scope support
# No special IPv6 config needed here; Neutron handles it

# For provider networks with IPv6:
[ml2_type_vlan]
network_vlan_ranges = physnet1:100:200
```

## IPv6 Prefix Delegation (PD)

```bash
# Create an IPv6 subnet with prefix delegation (for router prefixes)

# Create a PD subnet using the default subnet pool
openstack subnet create \
    --network my-tenant-network \
    --ip-version 6 \
    --use-default-subnet-pool \
    --ipv6-address-mode slaac \
    --ipv6-ra-mode slaac \
    my-pd-subnet

# PD assigns a /64 prefix from the upstream router's /56 or /48
# delegated to the tenant router
```

## Verify IPv6 in OpenStack

```bash
# Check subnet details
openstack subnet show my-subnet-v6-slaac | grep -E "cidr|gateway|ipv6"

# Check port has IPv6 address
openstack port list --network my-network --long | grep -E "ipv6|2001"

# From inside the instance (SSH over IPv4):
# Check IPv6 was assigned
ip -6 addr show
ping6 2001:4860:4860::8888   # External IPv6 test

# Check Neutron router's IPv6 routing
openstack router show my-router --format json | jq '.routes'

# Check dhcp/radvd process is running
# On the network node:
ps aux | grep -E "radvd|dnsmasq.*v6"
```

## Conclusion

OpenStack Neutron supports three IPv6 subnet modes: SLAAC (VMs self-configure from RA), DHCPv6-stateless (SLAAC addressing with DNS from DHCPv6), and DHCPv6-stateful (full address assignment from Neutron's dnsmasq). Dual-stack networks combine an IPv4 subnet and an IPv6 subnet on the same Neutron network, and instances receive both addresses automatically. Security groups require explicit ICMPv6 rules - without them, NDP fails and IPv6 does not work even if addresses are assigned. IPv6 floating IPs are available when the provider network has IPv6 subnets, enabling direct IPv6 external access without NAT.
