# How to Configure PLAT (Provider-Side Translator) for 464XLAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 464XLAT, PLAT, NAT64, Mobile Networks

Description: A guide to configuring the PLAT (Provider-side Translator) component of 464XLAT on Linux, which acts as the NAT64 gateway in a carrier or enterprise network.

## What Is PLAT?

The PLAT (Provider-side Translator) is the network-side component of 464XLAT. It functions as a stateful NAT64 gateway that translates IPv6 packets from devices' CLATs back to IPv4 for reaching IPv4-only internet destinations.

From a technical standpoint, the PLAT is a standard NAT64 implementation. The "PLAT" terminology is specific to 464XLAT deployments where it serves CLATs on IPv6-only access networks.

## PLAT vs Standard NAT64

| Aspect | Standard NAT64 | PLAT in 464XLAT |
|---|---|---|
| Clients | IPv6-only hosts using DNS64 | Devices with CLAT translators |
| IPv4 packets? | No (only IPv6 from clients) | Originated as IPv4, re-wrapped as IPv6 by CLAT |
| DNS64 needed? | Yes | No (CLAT handles IPv4 literals) |
| Both needed? | DNS64+NAT64 | PLAT only + CLAT on devices |

## Installing and Configuring PLAT with Jool

Jool is the recommended open-source NAT64 implementation for Linux PLAT deployments:

```bash
# Install Jool on the PLAT gateway

apt install jool-dkms jool-tools

# Load the Jool kernel module
modprobe jool

# Persist across reboots
echo 'jool' >> /etc/modules-load.d/jool.conf
```

## Configuring the PLAT NAT64 Instance

```bash
# Create the Jool NAT64 instance with the PLAT prefix
# (must match CLAT prefix on devices; well-known prefix is 64:ff9b::/96)
jool instance add --iptables --pool6 64:ff9b::/96

# Configure IPv4 address pool for outbound translations
# These should be your public IPv4 addresses
jool pool4 add --tcp 203.0.113.0/24
jool pool4 add --udp 203.0.113.0/24
jool pool4 add --icmp 203.0.113.0/24

# View configuration
jool global display
jool pool4 display
```

## Configuring iptables for the PLAT

```bash
# Route IPv6 packets destined for the NAT64 prefix through Jool
ip6tables -t mangle -A PREROUTING -d 64:ff9b::/96 -j JOOL --instance default

# Route translated IPv4 responses back through Jool
iptables -t mangle -A PREROUTING -d 203.0.113.0/24 -j JOOL --instance default

# Enable IP forwarding
sysctl -w net.ipv6.conf.all.forwarding=1
sysctl -w net.ipv4.ip_forward=1

# Save forwarding settings
cat >> /etc/sysctl.d/99-plat.conf << 'EOF'
net.ipv6.conf.all.forwarding=1
net.ipv4.ip_forward=1
EOF
```

## Setting Up DNS64 for Non-CLAT Clients

Although CLAT handles IPv4-literal connections, DNS64 is still needed for IPv6-only clients that use hostnames (without CLAT):

```bash
# Install BIND for DNS64
apt install bind9

# Configure DNS64 in named.conf.options
cat >> /etc/bind/named.conf.options << 'EOF'
    dns64 64:ff9b::/96 {
        clients { any; };
        mapped { any; };
        exclude { 10.0.0.0/8; 172.16.0.0/12; 192.168.0.0/16; };
    };
EOF

systemctl restart bind9
```

## Advertising the NAT64 Prefix via PREF64 RA Option

RFC 8781 defines the PREF64 Router Advertisement option, which lets devices automatically discover the NAT64/PLAT prefix without DNS queries:

```bash
# radvd configuration with PREF64 option
cat > /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;
    prefix 2001:db8:mobile::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
    # Advertise the NAT64 prefix via PREF64 RA option
    nat64prefix 64:ff9b::/96 {
        AdvValidLifetime 65528;
    };
    # Advertise DNS64 resolver
    RDNSS 2001:db8::dns64resolver {
        AdvRDNSSLifetime 300;
    };
};
EOF

systemctl restart radvd
```

## Verifying PLAT Operation

```bash
# Check Jool instance is running
jool instance display

# Monitor active translation sessions
watch -n 2 'jool session display --tcp | wc -l'

# View detailed session table
jool session display --tcp | head -30

# Check BIB (Binding Information Base) for persistent mappings
jool bib display

# Test translation from a CLAT-enabled device
# On the device: ping -4 8.8.8.8
# On PLAT, observe session being created
jool session display --icmp
```

## Scaling the PLAT

For large deployments (ISP/carrier scale), consider:

```bash
# Increase Jool session limits
jool global update maximum-simultaneous-opens 512
jool global update udp-timeout 120
jool global update tcp-est-timeout 7200

# Use multiple IPv4 pool addresses for better distribution
jool pool4 add --tcp 203.0.113.0/24
jool pool4 add --tcp 198.51.100.0/24

# Monitor pool4 utilization
jool pool4 display
```

## Summary

The PLAT is essentially a NAT64 gateway deployed in the provider network. Using Jool on Linux, configure a NAT64 instance with the same prefix as the devices' CLATs, assign an IPv4 pool for outbound translations, and configure iptables to route traffic through Jool. Add DNS64 for hostname-based clients and optionally advertise the NAT64 prefix via PREF64 RA options for automatic device discovery.
