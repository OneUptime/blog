# How to Configure IKEv2 for IPv6 on Linux with Libreswan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IKEv2, Libreswan, IPsec, VPN

Description: Learn how to configure IKEv2 for IPv6 VPNs on Linux using Libreswan, the successor to Openswan, with site-to-site and host-to-host configurations.

## Overview

Libreswan is an open-source IKEv1/IKEv2 implementation for Linux, commonly used in Red Hat-based distributions. It is the successor to Openswan and FreeS/WAN. For IPv6, Libreswan supports both site-to-site tunnels and host-to-host configurations using standard ipsec.conf connection definitions.

## Installation

```bash
# RHEL/CentOS/Fedora

sudo dnf install libreswan

# Debian/Ubuntu
sudo apt install libreswan

# Initialize NSS database if the package did not already create it (required for certificates)
sudo ipsec initnss

# Start service
sudo systemctl enable --now ipsec

# Verify
ipsec version
```

## Site-to-Site IPv6 Configuration (PSK)

### /etc/ipsec.conf

```text
config setup
    logfile=/var/log/pluto.log
    logappend=yes

conn %default
    ikelifetime=28800s
    salifetime=3600s
    rekeymargin=540s
    keyingtries=3
    authby=secret
    keyexchange=ikev2

conn site1-to-site2
    left=2001:db8:1::1
    leftsubnet=2001:db8:10::/48
    leftid=@gw1.example.com

    right=2001:db8:2::1
    rightsubnet=2001:db8:20::/48
    rightid=@gw2.example.com

    esp=aes_gcm256
    ike=aes256-sha2_256;dh19
    auto=start
```

### /etc/ipsec.secrets

```text
# PSK for site-to-site
@gw1.example.com @gw2.example.com : PSK "StrongSharedKey123ChangeThis!"
```

```bash
# Reload PSKs if the service is already running
ipsec rereadsecrets

# Load configuration
ipsec add site1-to-site2

# Start tunnel
ipsec up site1-to-site2

# Check status
ipsec status
ipsec trafficstatus
```

## Host-to-Host IPv6 Transport Mode

```text
conn host-a-to-b
    left=2001:db8:1::1
    right=2001:db8:1::2
    leftid=@host-a.example.com
    rightid=@host-b.example.com
    type=transport
    esp=aes_gcm256
    ike=aes256-sha2_256;dh19
    keyexchange=ikev2
    authby=secret
    auto=start
    compress=no
```

## Certificate Authentication

```bash
# Generate certificates using NSS
# Create CA
certutil -S -k rsa -n "VPN CA" -s "CN=VPN CA" -x -t "CT,C,C" -v 60 \
  -d sql:/var/lib/ipsec/nss

# Create GW1 certificate
certutil -S -k rsa -n "gw1" -s "CN=gw1.example.com" -c "VPN CA" -t "u,u,u" -v 12 \
  -d sql:/var/lib/ipsec/nss -8 gw1.example.com

# Export and share CA cert to remote side
certutil -L -n "VPN CA" -a -d sql:/var/lib/ipsec/nss > vpn-ca.pem
```

```text
# Certificate-based connection
conn cert-site1-to-site2
    left=2001:db8:1::1
    leftsubnet=2001:db8:10::/48
    leftid=@gw1.example.com
    leftcert=gw1

    right=2001:db8:2::1
    rightsubnet=2001:db8:20::/48
    rightid=@gw2.example.com
    rightrsasigkey=%cert

    authby=rsasig
    keyexchange=ikev2
    auto=start
```

## Verification and Monitoring

```bash
# Show all active tunnels
ipsec status

# Sample output:
# 006 #1: "site1-to-site2" state:ESTABLISHED; established 45s ago; IKEv2; SPI:... SPIr:...
# 004 #2: "site1-to-site2":1 ESP tunnel[1] ...

# Show traffic statistics
ipsec trafficstatus

# Show SA details
ipsec showstates

# Show kernel XFRM state
ip xfrm state list

# Ping across tunnel
ping -6 2001:db8:20::1

# tcpdump: Verify ESP traffic on gateway interface
tcpdump -i eth0 'ip6 proto 50' -n
```

## Troubleshooting

```bash
# Enable verbose debugging in config setup, then restart and inspect the log
# plutodebug=all
systemctl restart ipsec
tail -100 /var/log/pluto.log

# Common issues:
# "AUTHENTICATE: Failed to verify IKEv2 AUTH payload"
# → Wrong PSK or cert mismatch - check /etc/ipsec.secrets

# "No matching policy" → check leftsubnet/rightsubnet match

# "unable to find compatible proposals"
# → Mismatched ike= or esp= proposals - check both sides match

# Restart after configuration change
systemctl restart ipsec
ipsec status
```

## Key Differences: Libreswan vs strongSwan

| Feature | Libreswan | strongSwan |
|---------|-----------|-----------|
| Config format | ipsec.conf | swanctl.conf or legacy ipsec.conf |
| Credential storage | NSS database | Files in /etc/swanctl or plugins |
| Package availability | RHEL/Fedora default | Debian/Ubuntu common |
| Remote access VPN | Supported | Strong EAP support |
| Logging | syslog or file | journald/syslog or file |

## Summary

Libreswan uses ipsec.conf with `conn` blocks defining left/right addresses, subnets, and authentication. For IPv6, set `left`/`right` to IPv6 addresses and `leftsubnet`/`rightsubnet` to IPv6 prefixes. Use `keyexchange=ikev2` to enforce IKEv2 and `authby=secret` with PSK in `/etc/ipsec.secrets`. Load connections with `ipsec add <conn>` and bring them up with `ipsec up <conn>`, then monitor with `ipsec status` and `ipsec trafficstatus`. Libreswan is commonly shipped on RHEL/Fedora and uses an NSS database for certificates and private keys.
