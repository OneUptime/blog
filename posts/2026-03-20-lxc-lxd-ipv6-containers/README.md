# How to Configure LXC/LXD Containers with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LXC, LXD, IPv6, Container Networking, Linux, System Containers

Description: A guide to configuring LXC and LXD system containers with IPv6 networking, including bridge configuration, SLAAC, DHCPv6, and per-container IPv6 address assignment.

LXD (the daemon managing LXC containers) provides full IPv6 support through its managed bridge networking. LXD containers behave like VMs from a networking perspective, making full dual-stack configuration straightforward.

## LXD Network Bridge with IPv6

```bash
# Check existing networks

lxc network list

# Create a new bridge with IPv6 enabled
lxc network create lxdbr1 \
  ipv4.address=10.100.0.1/24 \
  ipv4.nat=true \
  ipv6.address=fd42:100:100::1/64 \
  ipv6.nat=true

# Inspect the network
lxc network show lxdbr1
```

## Enabling IPv6 on the Default Bridge

```bash
# Edit the default lxdbr0 network
lxc network set lxdbr0 ipv6.address=fd42:100:101::1/64
lxc network set lxdbr0 ipv6.nat=true

# Verify
lxc network show lxdbr0 | grep ipv6
```

LXD automatically configures `dnsmasq` on the bridge to advertise the prefix for SLAAC and, when enabled, provide DHCPv6, so containers receive IPv6 addresses without additional configuration.

## Launching Containers with IPv6

```bash
# Launch a container on the IPv6 bridge
lxc launch ubuntu:22.04 web1 --network lxdbr1

# Check container IP addresses
lxc exec web1 -- ip -6 addr show

# Or via lxc list
lxc list web1 -c n6

# Test IPv6 to the bridge gateway
lxc exec web1 -- ping -6 -c 3 fd42:100:100::1
```

## Static IPv6 Address for a Container

```bash
# Request a specific IPv6 address on the existing eth0 device
# This requires stateful DHCPv6 on the bridge (see below)
lxc config device set web1 eth0 ipv6.address=fd42:100:100::10

# Restart so the container renews its lease cleanly
lxc restart web1

# Verify
lxc exec web1 -- ip -6 addr show dev eth0
```

## LXD Profile with IPv6 Networking

```yaml
# Save as ipv6-profile.yaml
config: {}
description: Profile with IPv6 networking
devices:
  eth0:
    name: eth0
    network: lxdbr1
    type: nic
name: ipv6-profile
```

```bash
# Create the profile from YAML
lxc profile create ipv6-profile
lxc profile edit ipv6-profile < ipv6-profile.yaml

# Launch containers using the profile
lxc launch ubuntu:22.04 app1 --profile default --profile ipv6-profile

# Check applied profiles
lxc config show app1 | grep profiles
```

## LXD Managed Bridge Without NAT

For production environments where containers should have globally routable IPv6:

```bash
# Configure a bridge with a global IPv6 prefix (no NAT)
lxc network create lxdbrpub \
  ipv4.address=none \
  ipv6.address=2001:db8:100::1/64 \
  ipv6.nat=false

# The host must have proper routing to forward this prefix
# Containers receive addresses via SLAAC from the advertised prefix
lxc launch ubuntu:22.04 pub-web --network lxdbrpub
lxc exec pub-web -- ip -6 addr show
```

## DHCPv6 Configuration in LXD

```bash
# Enable stateful DHCPv6 (in addition to SLAAC)
lxc network set lxdbr1 ipv6.dhcp=true
lxc network set lxdbr1 ipv6.dhcp.stateful=true

# Limit the DHCPv6 pool used for dynamic assignments
lxc network set lxdbr1 ipv6.dhcp.ranges=fd42:100:100::100-fd42:100:100::1ff

# Inspect the resulting DHCP leases
lxc network list-leases lxdbr1
```

## IPv6 Firewall Rules for LXD Containers

LXD can use `nftables` or `xtables` depending on the host firewall backend. If you let LXD manage bridge firewall rules, verify the IPv6 bridge firewall is enabled and inspect the active ruleset:

```bash
# Verify LXD is managing IPv6 firewall rules for the bridge
lxc network get lxdbr1 ipv6.firewall

# Check nftables rules affecting lxdbr1 on nftables-based hosts
nft list ruleset | grep -A 5 lxdbr1

# Or inspect the IPv6 forwarding chain on xtables-based hosts
ip6tables -L FORWARD -n
```

## Verifying IPv6 Connectivity

```bash
# Test IPv6 from container to internet
lxc exec web1 -- ping -6 -c 3 2001:4860:4860::8888

# Test container-to-container IPv6
lxc exec web1 -- ping -6 -c 3 <app1-ipv6-address>

# Check SLAAC assignment worked
lxc exec web1 -- ip -6 addr show | grep "scope global"

# Verify default IPv6 route
lxc exec web1 -- ip -6 route show default
```

## Troubleshooting LXD IPv6

```bash
# If containers don't get IPv6 addresses, check the bridge IPv6 settings
lxc network show lxdbr1 | grep ipv6

# Check runtime information for the bridge
lxc network info lxdbr1

# Watch LXD log messages while reproducing the issue
lxc monitor --pretty --type=logging --loglevel=info

# Verify kernel IPv6 forwarding is enabled
sysctl net.ipv6.conf.all.forwarding
# Should be 1
```

LXD's managed networking makes IPv6 configuration straightforward: enable IPv6 on the bridge network and containers automatically receive SLAAC addresses. For production use, configure a managed bridge without NAT to give containers real globally routable IPv6 addresses.
