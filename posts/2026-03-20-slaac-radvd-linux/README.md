# How to Configure radvd on Linux for SLAAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Radvd, SLAAC, Linux, Router Advertisement, IPv6, Router

Description: Configure the Router Advertisement Daemon (radvd) on Linux to send IPv6 Router Advertisements for SLAAC, including prefix configuration, RDNSS, and deployment best practices.

## Introduction

`radvd` (Router Advertisement Daemon) is the standard Linux daemon for sending IPv6 Router Advertisements. It sends periodic RA messages with Prefix Information options, allowing SLAAC hosts to autoconfigure their IPv6 addresses. radvd also supports the RDNSS option (RFC 8106) to include DNS server information in RAs, eliminating the need for a separate DHCPv6 server in many deployments.

## Installation and Basic Setup

```bash
# Install radvd

sudo apt-get install radvd         # Debian/Ubuntu
sudo yum install radvd             # RHEL/CentOS
sudo dnf install radvd             # Fedora

# Enable IPv6 forwarding (required for radvd to work)
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | \
    sudo tee /etc/sysctl.d/60-ipv6-forward.conf

# Note: enabling forwarding disables accept_ra on interfaces
# Use accept_ra=2 on WAN interface to still accept RA from ISP:
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=2  # eth0 = WAN interface

# Assign an IPv6 address to the LAN interface
# Replace 2001:db8::/64 with your routed/delegated LAN prefix
sudo ip -6 addr add 2001:db8::1/64 dev eth1
# eth1 = LAN interface (where radvd sends RAs)
```

## Minimal radvd Configuration

```bash
# Create /etc/radvd.conf
sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface eth1 {
    AdvSendAdvert on;

    prefix 2001:db8::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
};
EOF

# Start radvd
sudo systemctl start radvd
sudo systemctl enable radvd

# Verify it's running
sudo systemctl status radvd

# Verify RA is being sent
sudo radvdump   # Dumps incoming RA content visible to this host
```

## Full radvd Configuration with Comments

```bash
sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface eth1 {
    # Send RA messages (required)
    AdvSendAdvert on;

    # RA sending interval (min/max in seconds)
    # Routers must send RA at least every MaxRtrAdvInterval
    # Default max: 600 (10 minutes), min: 0.33 * MaxRtrAdvInterval
    MinRtrAdvInterval 200;
    MaxRtrAdvInterval 600;

    # IgnoreIfMissing: don't fail if interface doesn't exist yet
    IgnoreIfMissing on;

    # Router Lifetime: how long this router is valid as default gw
    # 0 = not a default router (only advertise prefix info)
    # Default: 3 * MaxRtrAdvInterval = 1800 seconds
    AdvDefaultLifetime 1800;

    # Router preference (High, Medium, Low)
    # Used to prefer one router over another
    AdvDefaultPreference medium;

    # M flag: 0 = use SLAAC for addresses
    # 1 = use stateful DHCPv6 for addresses
    AdvManagedFlag off;

    # O flag: 0 = no additional config from DHCPv6
    # 1 = use stateless DHCPv6 for DNS/NTP/etc.
    AdvOtherConfigFlag off;

    # Hop Limit to advertise (default 64)
    AdvCurHopLimit 64;

    # Reachable time (ms, 0 = use default)
    AdvReachableTime 0;

    # Retransmit timer (ms, 0 = use default)
    AdvRetransTimer 0;

    # Advertise the LAN prefix
    prefix 2001:db8::/64 {
        # L flag: prefix is on-link
        AdvOnLink on;

        # A flag: use for SLAAC (must be on for SLAAC!)
        AdvAutonomous on;

        # R flag: router uses this prefix (for Mobile IPv6)
        AdvRouterAddr off;

        # Valid Lifetime: 30 days
        AdvValidLifetime 2592000;

        # Preferred Lifetime: 7 days (must be <= ValidLifetime)
        AdvPreferredLifetime 604800;

        # Base6Interface: derive prefix from this interface
        # (use instead of explicit prefix for dynamic prefixes)
        # Base6Interface eth0;
        # Base6to4Interface eth0;
    };

    # RDNSS: Include DNS servers in RA (RFC 8106)
    # Eliminates need for DHCPv6 just for DNS
    RDNSS 2001:4860:4860::8888 2001:4860:4860::8844 {
        # How long DNS info is valid (seconds)
        AdvRDNSSLifetime 600;
    };

    # DNSSL: Include DNS search domains in RA
    DNSSL corp.example.com example.com {
        AdvDNSSLLifetime 600;
    };

    # MTU option: Advertise MTU to hosts
    AdvLinkMTU 1500;
};
EOF

sudo systemctl restart radvd
```

## Multiple Interfaces Configuration

```bash
sudo tee /etc/radvd.conf > /dev/null << 'EOF'
# VLAN 10: corporate network
interface eth1.10 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 600;
    AdvDefaultLifetime 1800;

    prefix 2001:db8:10::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };

    RDNSS 2001:db8::53 {
        AdvRDNSSLifetime 600;
    };
};

# VLAN 20: guest network
interface eth1.20 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 600;
    AdvDefaultLifetime 1800;

    prefix 2001:db8:20::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 3600;  # Short preferred: guests
    };

    RDNSS 2001:4860:4860::8888 {
        AdvRDNSSLifetime 600;
    };
};
EOF

sudo systemctl restart radvd
```

## Verification and Debugging

```bash
# Check radvd configuration syntax
sudo radvd --configtest -C /etc/radvd.conf
# Should output: config file, /etc/radvd.conf, syntax ok

# Dump RA content visible to this host
sudo radvdump
# Shows exactly what's in each RA packet

# Capture RAs on the LAN interface
sudo tcpdump -i eth1 -vvv "icmp6 and ip6[40] == 134"

# Check radvd log output
sudo journalctl -u radvd -f

# Verify radvd is running
sudo systemctl status radvd
# Check "Active" and recent log lines

# Test: send RS from a host and capture RA response
# On the host:
# sudo rdisc6 eth0
# Should see RA with your prefix information
```

## Conclusion

radvd is the standard Linux tool for sending IPv6 Router Advertisements. The minimal configuration requires enabling `AdvSendAdvert on` and declaring a prefix with `AdvOnLink on` and `AdvAutonomous on`. The RDNSS option eliminates the need for DHCPv6 in pure SLAAC deployments. Key parameters include `MaxRtrAdvInterval` (RA frequency), `AdvDefaultLifetime` (router validity), and prefix valid/preferred lifetimes. Always test configuration syntax with `radvd --configtest` before restarting, and verify RA content with `radvdump` or tcpdump.
