# How to Configure a Mobile IPv6 Home Agent on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mobile IPv6, Home Agent, Linux, UMIP, MIPv6, Configuration

Description: Configure a Linux server as a Mobile IPv6 Home Agent using the UMIP (USAGI Mobile IPv6) daemon to accept Binding Updates and tunnel traffic to Mobile Nodes.

## Introduction

The Home Agent is the cornerstone of a Mobile IPv6 deployment. This guide covers installing and configuring the UMIP daemon on Ubuntu/Debian Linux to provide Home Agent functionality.

## Prerequisites

- Linux server with kernel 4.x+ and IPv6 enabled
- Two IPv6 addresses: one for management, one as the HA address
- The home network prefix assigned to the HA interface

## Step 1: Install UMIP

```bash
# Install from package or source

sudo apt-get update
sudo apt-get install umip

# Or build from source
git clone https://github.com/openairinterface/umip.git
cd umip
./autogen.sh
./configure --enable-ha --enable-vt
make
sudo make install
```

## Step 2: Enable Required Kernel Features

```bash
# Enable IPv6 forwarding
echo "net.ipv6.conf.all.forwarding = 1" | \
  sudo tee -a /etc/sysctl.d/99-mipv6.conf

# Enable proxy NDP (needed for HA to intercept traffic for MN HoAs)
echo "net.ipv6.conf.eth0.proxy_ndp = 1" | \
  sudo tee -a /etc/sysctl.d/99-mipv6.conf

# Accept router advertisements (needed if HA is not a default router)
echo "net.ipv6.conf.eth0.accept_ra = 2" | \
  sudo tee -a /etc/sysctl.d/99-mipv6.conf

sudo sysctl -p /etc/sysctl.d/99-mipv6.conf
```

## Step 3: Configure the UMIP Home Agent

```bash
# /etc/mip6d.conf - Home Agent configuration

# Role: Home Agent
NodeConfig HA;

# Debug level (0-10)
DebugLevel 3;

# HA interface - must be on the home network
Interface "eth0";

# Home network prefix served by this HA
# All MNs with HoAs in this prefix register here
HaServedPrefix 2001:db8:1::/64;

# Accept Mobile Router registrations (NEMO support)
HaAcceptMobRtr enabled;

# Send Mobile Prefix Advertisements to MNs
SendMobPfxAdvs enabled;

# Allow specific MNs to register; deny all others by default
DefaultBindingAclPolicy deny;
BindingAclPolicy 2001:db8:1::1234 allow;

# IPsec configuration for BU authentication
# Using manual keys (for testing - use IKEv2 in production)
UseMnHaIPsec enabled;

IPsecPolicySet {
    HomeAgentAddress 2001:db8:1::1;
    HomeAddress 2001:db8:1::1234/64;

    # Policies for MN-HA signaling and tunneled data
    # Syntax: IPsecPolicy <type> UseESP <reqid MN->HA> <reqid HA->MN>
    IPsecPolicy Mh UseESP 1 2;
    IPsecPolicy ICMP UseESP 3 4;
    IPsecPolicy MobPfxDisc UseESP 5 6;
    IPsecPolicy TunnelMh UseESP 7 8;
    IPsecPolicy TunnelPayload UseESP 9 10;
}
```

Note: `HomeAgentPreference` and `HomeAgentLifetime` are not mip6d.conf options — they are advertised in Router Advertisements and configured in `radvd.conf` via `HomeAgentPreference` and `HomeAgentLifetime` under an `interface` block with `AdvHomeAgentFlag on;` and `AdvHomeAgentInfo on;`.

## Step 4: Configure IPsec Security Associations

For testing with manual keys (use IKEv2/strongSwan in production):

```bash
# Manual SA for MN-HA authentication (transport mode, RFC 3776)
ip xfrm state add \
  src 2001:db8:1::1234 \
  dst 2001:db8:1::1 \
  proto esp \
  spi 0x1001 \
  mode transport \
  auth 'hmac(sha256)' 0x$(openssl rand -hex 32) \
  enc 'cbc(aes)' 0x$(openssl rand -hex 16)

# Policy: protect Mobility Header (proto 135) packets
ip xfrm policy add \
  src 2001:db8:1::1234/128 \
  dst 2001:db8:1::1/128 \
  proto mh \
  dir in \
  tmpl \
    src 2001:db8:1::1234 \
    dst 2001:db8:1::1 \
    proto esp \
    mode transport
```

## Step 5: Start the Home Agent Daemon

```bash
# Start UMIP in HA mode
sudo mip6d -c /etc/mip6d.conf

# Or as a systemd service
sudo systemctl enable mip6d
sudo systemctl start mip6d

# Check status
sudo systemctl status mip6d
```

## Step 6: Verify Home Agent Operation

UMIP exposes runtime state through a virtual terminal (compile with
`--enable-vt`). Connect with telnet to the configured port (default 7777) to
inspect the binding cache:

```bash
# Connect to the mip6d virtual terminal
telnet ::1 7777

# At the mip6d> prompt, dump the binding cache:
# mip6d> bc
#
# Expected output:
# == BC entries ==
#  hoa 2001:db8:1::1234 coa 2001:db8:2::50
#   lifetime 587 / 600 seq 12 flags AH--
#   local 2001:db8:1::1

# Exit with: quit

# Check proxy NDP entries (HA creates one per registered MN HoA)
ip -6 neigh show proxy dev eth0

# Verify tunnel interfaces created by UMIP (typically ip6tnl*)
ip -6 tunnel show

# Test by pinging the MN's HoA from the home network
ping6 -c 5 2001:db8:1::1234
```

## Monitoring Home Agent Health

```bash
# Watch binding cache updates in real-time via the VT
watch -n5 'echo bc | nc -q1 ::1 7777'

# Monitor UMIP logs
journalctl -u mip6d -f

# Trigger a state dump to syslog with SIGUSR1
sudo pkill -USR1 mip6d
```

## Conclusion

Configuring a Linux Home Agent with UMIP enables Mobile IPv6 for your network. Production deployments should replace manual IPsec keys with IKEv2/strongSwan for certificate-based authentication. Use OneUptime to monitor the HA's IPv6 address availability and binding update response times.
