# How to Configure IPv6 on DD-WRT Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DD-WRT, Router, Radvd, DHCPv6, Networking

Description: Configure IPv6 on DD-WRT routers using the web interface and SSH, enabling native IPv6 connectivity and SLAAC for connected devices.

## Introduction

DD-WRT is a popular open-source firmware for consumer routers. IPv6 support in DD-WRT is provided through its built-in DHCPv6 client, radvd, and ip6tables. The configuration is accessible through the web interface (**Setup > IPv6**) or via the CLI.

## Step 1: Enable IPv6 via Web Interface

1. Log in to the DD-WRT web interface (default: `http://192.168.1.1`)
2. Navigate to **Setup > IPv6**
3. Set **IPv6** to **Enable**
4. Set the **IPv6 Type**:
   - **Native IPv6 from ISP**: For native IPv6 service from your ISP
   - **DHCPv6 with Prefix Delegation**: For ISPs that delegate a routed prefix to the router
   - **6in4 Static Tunnel**: For tunnel brokers such as Hurricane Electric
5. Set **IPv6 Prefix Length** to the prefix length your ISP delegates when using **DHCPv6 with Prefix Delegation** (for example, `56`)
6. In the **Radvd** section, set **Radvd** to **Enable** so LAN clients can use SLAAC
7. Enable **DHCPv6 Server** only if you need stateful DHCPv6 on the LAN
8. Click **Save** and **Apply Settings**

## Step 2: Configure via SSH (Advanced)

SSH into the router for more control:

```bash
# Check current IPv6 configuration

ip -6 addr show

# Check if radvd is running
ps | grep radvd

# View the radvd configuration DD-WRT generated
cat /tmp/radvd/radvd.conf
```

## Step 3: Customize radvd via Custom Configuration

DD-WRT generates `radvd.conf` automatically, and it also supports a custom `radvd` configuration directly on the IPv6 page:

```conf
interface br0 {
    AdvSendAdvert on;
    AdvManagedFlag off;
    AdvOtherConfigFlag off;
    MinRtrAdvInterval 30;
    MaxRtrAdvInterval 100;
    AdvDefaultLifetime 1800;

    prefix ::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    RDNSS 2606:4700:4700::1111 2001:4860:4860::8888 {
        AdvRDNSSLifetime 600;
    };
};
```

Enable **Radvd**, enable **Custom Configuration**, paste the configuration, then click **Save** and **Apply Settings**.

## Step 4: Configure IPv6 via NVRAM

For persistent configuration in DD-WRT, use NVRAM:

```bash
# Enable IPv6
nvram set ipv6_enable=1

# Set IPv6 type to DHCPv6 with Prefix Delegation
nvram set ipv6_typ=ipv6pd

# Set delegated prefix length from ISP (example: /56)
nvram set ipv6_pf_len=56

# Enable router advertisements for SLAAC
nvram set radvd_enable=1

# Optional DNS servers to advertise
nvram set ipv6_dns1=2606:4700:4700::1111
nvram set ipv6_dns2=2001:4860:4860::8888

# Commit to flash
nvram commit

# Restart IPv6 services
stopservice dhcp6c
startservice dhcp6c
stopservice radvd
startservice radvd
```

## Step 5: Configure IPv6 Firewall

```bash
# View current ip6tables rules
ip6tables -L -n -v

# DD-WRT already installs IPv6 firewall rules when IPv6 is enabled,
# including essential ICMPv6 and established/related traffic.
# Add only specific custom exceptions through
# Administration > Commands > Firewall.
```

## Step 6: Verify IPv6 Connectivity

```bash
# Check WAN IPv6 address
ip -6 addr show vlan2  # or eth0 depending on router model

# Check LAN IPv6 address
ip -6 addr show br0

# Test outbound connectivity
ping6 2606:4700:4700::1111

# Check radvd is sending RAs
tcpdump -i br0 -v "icmp6 and ip6[40] == 134" -c 3
```

## Checking Client IPv6 Addresses

From a client device on the LAN:
```bash
# Linux
ip -6 addr show scope global

# Windows
ipconfig /all | findstr IPv6

# Test connectivity
ping -6 2606:4700:4700::1111

# Test DNS
nslookup -type=AAAA google.com
```

## DD-WRT Build Requirements

Not all DD-WRT builds include full IPv6 support. Ensure you have:
- A build compiled with IPv6 and `radvd` support
- For DHCPv6-PD support, ensure the DHCPv6 client (`dhcp6c`) is included
- Check the DD-WRT wiki for your router model's IPv6 support status

## Conclusion

DD-WRT provides IPv6 support through a combination of the web interface for basic configuration and SSH or NVRAM for advanced inspection and automation. The auto-generated radvd configuration handles most cases, but DD-WRT's built-in custom radvd configuration provides the flexibility needed for RDNSS, multiple prefixes, or specific timing requirements. Always verify that your DD-WRT build includes the necessary IPv6 components before planning a deployment.
