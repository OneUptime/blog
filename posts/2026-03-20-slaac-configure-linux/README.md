# How to Configure SLAAC on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, Linux, IPv6, Address Autoconfiguration, Sysctl, NetworkManager

Description: Configure IPv6 SLAAC on Linux using sysctl, NetworkManager, and systemd-networkd to automatically obtain IPv6 addresses from Router Advertisements.

## Introduction

Linux supports SLAAC natively through the kernel's IPv6 stack. When SLAAC is enabled, the kernel automatically processes Router Advertisements, generates IPv6 addresses from the advertised prefixes, and sets up default routes. Configuration is done through sysctl parameters, NetworkManager, or systemd-networkd depending on your distribution and network management approach.

## Sysctl Parameters for SLAAC

The key kernel parameters controlling SLAAC behavior.

```bash
# Accept Router Advertisements and perform SLAAC

# 0 = disabled, 1 = accept if forwarding disabled, 2 = always accept
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# Expected: 1 (on non-routing hosts)

# Accept prefix information from RA (SLAAC address generation)
cat /proc/sys/net/ipv6/conf/eth0/autoconf
# Expected: 1 (SLAAC enabled)

# Accept default route from RA
cat /proc/sys/net/ipv6/conf/eth0/accept_ra_defrtr
# Expected: 1

# Accept prefix info from RA (populates prefix list)
cat /proc/sys/net/ipv6/conf/eth0/accept_ra_pinfo
# Expected: 1

# Enable SLAAC (if disabled):
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=1
sudo sysctl -w net.ipv6.conf.eth0.autoconf=1

# For a router (forwarding enabled), SLAAC requires accept_ra=2
# because forwarding disables accept_ra by default
# sudo sysctl -w net.ipv6.conf.eth0.accept_ra=2  # for routers
```

## Persisting SLAAC Configuration

```bash
# Create sysctl configuration file
sudo tee /etc/sysctl.d/60-ipv6-slaac.conf > /dev/null << 'EOF'
# Enable SLAAC on all interfaces
net.ipv6.conf.all.accept_ra = 1
net.ipv6.conf.default.accept_ra = 1
net.ipv6.conf.all.autoconf = 1
net.ipv6.conf.default.autoconf = 1

# Accept default route from RA
net.ipv6.conf.all.accept_ra_defrtr = 1

# Privacy extensions (optional)
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2
EOF

sudo sysctl -p /etc/sysctl.d/60-ipv6-slaac.conf
```

## Configuring SLAAC with NetworkManager

```bash
# Show current IPv6 configuration method for a connection
nmcli connection show "Wired connection 1" | grep ipv6.method
# ipv6.method: auto   ← SLAAC is enabled

# Set to SLAAC (auto = use RA/SLAAC and DHCPv6 according to RA flags)
nmcli connection modify "Wired connection 1" ipv6.method auto

# Keep automatically configured DNS (from RA RDNSS or DHCPv6)
nmcli connection modify "Wired connection 1" \
    ipv6.method auto \
    ipv6.ignore-auto-dns no

# Disable SLAAC (manual addressing only)
nmcli connection modify "Wired connection 1" ipv6.method manual

# Apply changes
nmcli connection up "Wired connection 1"

# Verify SLAAC-obtained addresses
nmcli device show eth0 | grep IP6
```

## Configuring SLAAC with systemd-networkd

```bash
# Create or edit network file
sudo tee /etc/systemd/network/10-eth0.network > /dev/null << 'EOF'
[Match]
Name=eth0

[Network]
DHCP=no
IPv6AcceptRA=yes

[IPv6AcceptRA]
# Accept autonomous prefixes for SLAAC
UseAutonomousPrefix=yes
UseGateway=yes
UseDNS=yes
EOF

# Restart systemd-networkd
sudo systemctl restart systemd-networkd

# Verify
networkctl status eth0

# For privacy extensions with systemd-networkd:
# Add to [Network] section:
# IPv6PrivacyExtensions=yes

# For stable privacy (RFC 7217) address generation:
# Add to [IPv6AcceptRA] section:
# Token=prefixstable
```

## Verifying SLAAC Operation

```bash
# Show all IPv6 addresses (SLAAC addresses are "dynamic")
ip -6 addr show eth0

# Expected output:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>
#     inet6 2001:db8::211:22ff:fe33:4455/64 scope global dynamic
#        valid_lft 2591894sec preferred_lft 604694sec
#     inet6 fe80::211:22ff:fe33:4455/64 scope link
#        valid_lft forever preferred_lft forever

# Show SLAAC-learned prefix routes
ip -6 route show | grep "proto kernel"
# 2001:db8::/64 dev eth0 proto kernel metric 256 expires 2591894sec

# Show default route from RA
ip -6 route show default
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1799sec

# Force refresh by sending Router Solicitation
sudo rdisc6 eth0  # requires ndisc6 package
# Or wait for the next unsolicited RA from the router

# Check if SLAAC RA was received
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 134" -c 3
# Capture up to 3 Router Advertisements
```

## Disabling SLAAC (Static Only)

```bash
# Disable SLAAC on an interface (use static address instead)
sudo sysctl -w net.ipv6.conf.eth0.autoconf=0
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=0

# Add static IPv6 address
sudo ip -6 addr add 2001:db8::10/64 dev eth0

# Add static default route
sudo ip -6 route add default via fe80::1 dev eth0

# Persist static configuration in /etc/network/interfaces (Debian/Ubuntu):
# iface eth0 inet6 static
#   address 2001:db8::10
#   netmask 64
#   gateway fe80::1
#   autoconf 0
#   accept_ra 0
```

## Troubleshooting SLAAC

```bash
# Problem: No SLAAC address received
# Check 1: Is accept_ra enabled?
cat /proc/sys/net/ipv6/conf/eth0/accept_ra
# Expected: 1 (or 2 if IPv6 forwarding=1)

# Check 2: Is IPv6 forwarding interfering?
cat /proc/sys/net/ipv6/conf/eth0/forwarding
# If 1: need accept_ra=2 for SLAAC to work

# Check 3: Is RA being received?
sudo tcpdump -i eth0 -n "icmp6 and ip6[40] == 134"
# If no output: no RA on this segment (check router config)

# Check 4: DAD failure?
ip -6 addr show eth0 | grep TENTATIVE
# TENTATIVE means DAD in progress (wait ~1 second)
# If stuck in TENTATIVE: possible address collision

# Check 5: Check kernel log for RA processing
sudo dmesg | grep -i "ipv6\|slaac\|RA"
```

## Conclusion

Linux SLAAC configuration revolves around the `accept_ra` and `autoconf` sysctl parameters. With `accept_ra=1` and `autoconf=1`, the kernel processes RA Prefix Information options and generates global IPv6 addresses automatically. NetworkManager uses `ipv6.method=auto` and systemd-networkd uses `IPv6AcceptRA=yes`. Verify SLAAC operation with `ip -6 addr show` (look for "dynamic" addresses) and `ip -6 route show default` (look for "proto ra" route). For routers with forwarding enabled, use `accept_ra=2` to maintain SLAAC operation.
