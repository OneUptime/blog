# How to Configure Site-to-Site IPv6 VPN with IPsec

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, VPN, Site-to-Site, strongSwan

Description: Complete guide to building an IPv6 site-to-site VPN using IPsec tunnel mode with strongSwan, including routing configuration and verification.

## Overview

A site-to-site IPv6 VPN connects two geographically separate networks over an encrypted IPsec tunnel. All traffic between Site 1 and Site 2 is encrypted as it transits the internet. This guide covers the complete configuration using strongSwan on Linux gateways.

## Topology

```text
Site 1 Network: 2001:db8:1::/48
  Gateway 1 (GW1): 2001:db8:100::1 (public IPv6), 2001:db8:1::1 (site interface)
  Internal hosts: 2001:db8:1::10, 2001:db8:1::11, ...

Site 2 Network: 2001:db8:2::/48
  Gateway 2 (GW2): 2001:db8:100::2 (public IPv6), 2001:db8:2::1 (site interface)
  Internal hosts: 2001:db8:2::10, 2001:db8:2::11, ...
```

## Prerequisites

```bash
# Both gateways: Install strongSwan and enable forwarding

apt install charon-systemd strongswan-swanctl libcharon-extra-plugins

sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.d/99-ipv6.conf

# Generate one strong PSK and paste the same value into both configurations
openssl rand -base64 32

# Enable and start strongSwan
systemctl enable --now strongswan
```

## GW1 Configuration

### /etc/swanctl/conf.d/s2s.conf

```text
connections {
    site1-to-site2 {
        version = 2
        local_addrs  = 2001:db8:100::1
        remote_addrs = 2001:db8:100::2

        local {
            auth = psk
            id = gw1.corp.example.com
        }
        remote {
            auth = psk
            id = gw2.corp.example.com
        }

        children {
            site1-site2-traffic {
                local_ts  = 2001:db8:1::/48
                remote_ts = 2001:db8:2::/48
                mode = tunnel
                esp_proposals = aes256gcm16-ecp256
                start_action = start
                dpd_action = restart
                rekey_time = 3600s
                life_time = 7200s
                replay_window = 64
            }
        }

        proposals = aes256-sha256-ecp256
        dpd_delay = 30s
    }
}

secrets {
    ike-site-s2s {
        id-1 = gw1.corp.example.com
        id-2 = gw2.corp.example.com
        secret = "REPLACE_WITH_THE_SAME_RANDOM_PSK_ON_BOTH_GATEWAYS"
    }
}
```

## GW2 Configuration

### /etc/swanctl/conf.d/s2s.conf

```text
connections {
    site2-to-site1 {
        version = 2
        local_addrs  = 2001:db8:100::2
        remote_addrs = 2001:db8:100::1

        local {
            auth = psk
            id = gw2.corp.example.com
        }
        remote {
            auth = psk
            id = gw1.corp.example.com
        }

        children {
            site2-site1-traffic {
                local_ts  = 2001:db8:2::/48
                remote_ts = 2001:db8:1::/48
                mode = tunnel
                esp_proposals = aes256gcm16-ecp256
                start_action = start
                dpd_action = restart
            }
        }

        proposals = aes256-sha256-ecp256
        dpd_delay = 30s
    }
}

secrets {
    ike-site-s2s {
        id-1 = gw2.corp.example.com
        id-2 = gw1.corp.example.com
        secret = "REPLACE_WITH_THE_SAME_RANDOM_PSK_ON_BOTH_GATEWAYS"
    }
}
```

## Routing Configuration

strongSwan installs policy routes automatically when `local_ts`/`remote_ts` are configured. By default on Linux, these routes are installed in routing table `220`. However, you should verify:

```bash
# On GW1: Route to Site 2 should exist
ip -6 route show table 220 | grep 2001:db8:2::/48
# Expected: a route for 2001:db8:2::/48 in table 220

# Verify XFRM policies were installed
ip xfrm policy list | grep -A 4 2001:db8:2::/48

# On internal hosts (Site 1), add route to Site 2 via GW1
ip -6 route add 2001:db8:2::/48 via 2001:db8:1::1

# Or set GW1 as default gateway for all traffic
ip -6 route add default via 2001:db8:1::1
```

## Load Configuration and Establish Tunnel

```bash
# On both gateways:
swanctl --load-all

# Check connections are loaded
swanctl --list-conns

# Initiate from GW1
swanctl --initiate --child site1-site2-traffic

# Check SA status
swanctl --list-sas

# Expected output:
# site1-to-site2: #1, ESTABLISHED, IKEv2, gw1.corp.example.com...gw2.corp.example.com
#   site1-site2-traffic: #1, reqid 1, INSTALLED, TUNNEL, ESP
#     local  2001:db8:1::/48
#     remote 2001:db8:2::/48
```

## Verification

```bash
# Test connectivity through tunnel
# From a host in Site 1:
ping -6 -c 3 2001:db8:2::10

# Verify traffic is encrypted (ESP) on GW1 uplink
tcpdump -i eth0 -n -c 5 'ip6 proto 50'
# Should show ESP packets between gw1 and gw2 public addresses

# Check traffic counters
swanctl --list-sas | grep bytes
# Or:
ip -s xfrm state list | grep -A 3 'bytes'
```

## Firewall Rules for Tunnel Gateway

```bash
# Allow IKEv2 and ESP from remote gateway
ip6tables -A INPUT -p udp --dport 500 -s 2001:db8:100::2 -j ACCEPT   # IKE
ip6tables -A INPUT -p udp --dport 4500 -s 2001:db8:100::2 -j ACCEPT  # NAT-T
ip6tables -A INPUT -p esp -s 2001:db8:100::2 -j ACCEPT               # ESP

# Allow forwarding of decrypted tunnel traffic
ip6tables -A FORWARD -s 2001:db8:2::/48 -d 2001:db8:1::/48 -j ACCEPT
ip6tables -A FORWARD -s 2001:db8:1::/48 -d 2001:db8:2::/48 -j ACCEPT
```

## Summary

An IPv6 site-to-site VPN with strongSwan uses swanctl `connections{}` with `local_ts`/`remote_ts` defining the site subnets and tunnel mode ESP. PSK secrets go in the `secrets{}` block. After `swanctl --load-all` and `swanctl --initiate`, policy routes are automatically installed in table `220` by default. Verify the tunnel with `swanctl --list-sas` and confirm encryption with `tcpdump -i eth0 -n -c 5 'ip6 proto 50'`. Use Dead Peer Detection (`dpd_delay`, `dpd_action = restart`) to automatically recover from gateway failures.
