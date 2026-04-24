# How to Configure radvd for IPv6 Router Advertisements on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Radvd, Router Advertisement, Linux, SLAAC, Networking

Description: Install and configure radvd on Linux to send IPv6 Router Advertisements, enabling SLAAC-based address autoconfiguration for all devices on your network segment.

## Introduction

`radvd` (Router Advertisement Daemon) is a common tool on Linux for sending IPv6 Router Advertisement (RA) messages as defined in RFC 4861. These messages allow IPv6 clients on the local network to automatically configure their addresses without requiring a DHCPv6 server. `radvd` only sends the advertisements; IPv6 forwarding and routing still need to be configured separately on the router.

## Installing radvd

```bash
# Debian/Ubuntu

sudo apt-get install radvd

# RHEL/CentOS/Fedora
sudo dnf install radvd

# Arch Linux
sudo pacman -S radvd
```

## Basic radvd Configuration

The main configuration file is `/etc/radvd.conf`. Here is a minimal working example:

```text
# /etc/radvd.conf
# Basic Router Advertisement configuration for interface eth1

interface eth1 {
    # Enable sending Router Advertisements
    AdvSendAdvert on;

    # M flag: advertise DHCPv6-managed address configuration
    AdvManagedFlag off;

    # O flag: advertise other non-address DHCPv6 configuration such as DNS
    AdvOtherConfigFlag off;

    # RA interval bounds in seconds (between 30s and 100s)
    MinRtrAdvInterval 30;
    MaxRtrAdvInterval 100;

    # Router lifetime: how long this router remains a default router (in seconds)
    AdvDefaultLifetime 1800;

    # Prefix to advertise for SLAAC
    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;         # Prefix is directly reachable on this link
        AdvAutonomous on;     # Clients may form their own address from this prefix
        AdvRouterAddr off;    # Mobile IPv6 option; leave off for standard SLAAC
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };
};
```

## Enabling and Starting radvd

```bash
# Enable radvd to start at boot and start it immediately
sudo systemctl enable --now radvd

# Check the status
sudo systemctl status radvd

# Check for errors in the log
sudo journalctl -u radvd -n 50
```

## Verifying Router Advertisements Are Being Sent

On the router, use `tcpdump` to confirm RA packets are being transmitted:

```bash
# Capture ICMPv6 Router Advertisement packets (type 134) on eth1
sudo tcpdump -i eth1 -v "icmp6 and ip6[40] == 134"
```

On a client on the same segment, check that it received the RA and configured an address:

```bash
# On the client: show global IPv6 addresses (assigned via SLAAC from RA)
ip -6 addr show scope global

# Check the default route was set from the RA
ip -6 route show default
# Expected: default via fe80::<router-link-local> dev eth0 proto ra
```

## Testing with rdisc6

On a client on the same segment, the `rdisc6` tool sends a Router Solicitation and captures the RA response:

```bash
# Install rdisc6 (part of ndisc6 package)
sudo apt-get install ndisc6

# Send a Router Solicitation on the client interface and display the RA response
sudo rdisc6 eth0
```

Example output:

```text
Soliciting ff02::2 (ff02::2) on eth0...

Hop limit                 :           64 (      0x40)
Stateful address conf.    :           No
Stateful other conf.      :           No
Mobile home agent         :           No
Router preference         :       medium
Neighbor discovery proxy  :           No
Router lifetime           :         1800 (0x00000708) seconds
Reachable time            :  unspecified (0x00000000)
Retransmit time           :  unspecified (0x00000000)
 Prefix                   : 2001:db8:1:1::/64
  Valid time              :        86400 (0x00015180) seconds
  Pref. time              :        14400 (0x00003840) seconds
```

## Reloading radvd After Configuration Changes

```bash
# Reload the configuration
sudo systemctl reload radvd

# Or send SIGHUP directly if using the default upstream PID file
sudo kill -HUP "$(cat /var/run/radvd.pid)"
```

## Conclusion

`radvd` is a common daemon for IPv6 Router Advertisements on Linux. A basic configuration with one prefix block is sufficient to advertise a single `/64` on a subnet, but `radvd` does not configure IPv6 forwarding or routing for you. The M and O flags control whether clients should also use DHCPv6, and the prefix lifetime values control how long SLAAC-derived addresses remain preferred or valid. Once running, verify operation with `tcpdump` or `rdisc6` to confirm clients are receiving and acting on the advertisements.
