# How to Configure IKEv2 for IPv6 on Linux with strongSwan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IKEv2, strongSwan, IPsec, VPN

Description: Complete guide to configuring IKEv2 for IPv6 on Linux using strongSwan, including installation, swanctl configuration, PSK and certificate authentication, and monitoring.

## Overview

strongSwan is the most widely-used open-source IKEv2 implementation on Linux. It handles IPsec SA negotiation, key exchange, and rekeying automatically. For IPv6, strongSwan supports both site-to-site tunnels and remote access VPNs using IKEv2 (RFC 7296) with IPv6 addresses as local/remote endpoints.

## Installation

```bash
# Debian/Ubuntu (swanctl/charon-systemd backend)

sudo apt install charon-systemd strongswan-swanctl

# RHEL/CentOS/Fedora
sudo dnf install strongswan

# Verify version
swanctl --version
```

## Configuration with swanctl

With the `swanctl`/`vici` backend, strongSwan uses the modern `swanctl.conf` format (instead of legacy `ipsec.conf`).

### Directory Structure

```text
/etc/swanctl/
├── conf.d/         ← Place .conf files here
├── x509/           ← End-entity certificate files
├── x509ca/         ← CA certificate files
├── private/        ← Private keys
└── swanctl.conf    ← Main file (or use conf.d/)
```

## Site-to-Site IPv6 VPN (PSK Authentication)

### GW1 (/etc/swanctl/conf.d/vpn.conf)

```text
connections {
    gw1-to-gw2 {
        version = 2
        local_addrs  = 2001:db8:0:1::1
        remote_addrs = 2001:db8:0:2::1

        local {
            auth = psk
            id = gw1.example.com
        }
        remote {
            auth = psk
            id = gw2.example.com
        }

        children {
            net1-to-net2 {
                local_ts  = 2001:db8:1::/48
                remote_ts = 2001:db8:2::/48
                mode = tunnel
                esp_proposals = aes256gcm16-ecp256
                start_action = start
                dpd_action = restart
                rekey_time = 1h
                life_time = 2h
            }
        }

        proposals = aes256-sha256-ecp256
        dpd_delay = 30s
    }
}

secrets {
    ike-gw1-gw2 {
        id-1 = gw1.example.com
        id-2 = gw2.example.com
        secret = "Use-A-Long-Random-Key-Here-128bits-min"
    }
}
```

## Site-to-Site IPv6 VPN (Certificate Authentication)

```bash
# Generate CA and certificates
# CA
openssl req -x509 -newkey rsa:4096 -keyout ca.key -out ca.crt -days 3650 -nodes \
  -subj "/CN=VPN CA"

# GW1 certificate with IPv6 SAN
openssl req -newkey rsa:2048 -keyout gw1.key -out gw1.csr -nodes \
  -subj "/CN=gw1.example.com"
openssl x509 -req -in gw1.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out gw1.crt \
  -days 365 -extfile <(echo "subjectAltName=IP:2001:db8:0:1::1,DNS:gw1.example.com")

# Copy to strongSwan directories
sudo cp ca.crt /etc/swanctl/x509ca/
sudo cp gw1.crt /etc/swanctl/x509/
sudo cp gw1.key /etc/swanctl/private/
sudo chmod 600 /etc/swanctl/private/gw1.key
```

```text
# Certificate-based configuration
connections {
    gw1-to-gw2-cert {
        version = 2
        local_addrs  = 2001:db8:0:1::1
        remote_addrs = 2001:db8:0:2::1

        local {
            auth = pubkey
            certs = gw1.crt
            id = gw1.example.com
        }
        remote {
            auth = pubkey
            id = gw2.example.com
        }

        children {
            net1-to-net2 {
                local_ts  = 2001:db8:1::/48
                remote_ts = 2001:db8:2::/48
                mode = tunnel
                esp_proposals = aes256gcm16-ecp256
                start_action = start
            }
        }

        proposals = aes256-sha256-ecp256
    }
}
```

## Remote Access VPN (Road Warrior)

```text
connections {
    remote-access {
        version = 2
        local_addrs  = 2001:db8:0:3::1
        remote_addrs = %any

        local {
            auth = pubkey
            certs = vpn-gw.crt
            id = vpn.example.com
        }
        remote {
            auth = eap-mschapv2
            eap_id = %any
        }

        pools = ipv6-pool

        children {
            road-warrior {
                local_ts  = 2001:db8:3::/48
                mode = tunnel
                esp_proposals = aes256gcm16-ecp256
                dpd_action = clear
            }
        }

        proposals = aes256-sha256-ecp256
        send_certreq = yes
    }
}

pools {
    ipv6-pool {
        addrs = 2001:db8:4::/64
        dns = 2001:db8::53
    }
}

secrets {
    eap-user1 {
        id = user1
        secret = "UserPassword123!"
    }
}
```

## Management Commands

```bash
# Load all configuration
swanctl --load-all

# Show loaded connections
swanctl --list-conns

# Show active SAs
swanctl --list-sas

# Initiate a connection
swanctl --initiate --child net1-to-net2 --ike gw1-to-gw2

# Terminate a connection
swanctl --terminate --ike gw1-to-gw2

# Show stats
swanctl --stats

# Log monitoring
journalctl -u strongswan -f
# Or check /var/log/syslog for charon entries
```

## Troubleshooting

```bash
# Enable IKE debugging
# In /etc/strongswan.d/charon.conf or /etc/strongswan.conf:
charon {
    filelog {
        /var/log/charon.log {
            default = 2
            ike = 3
            cfg = 3
        }
    }
}

# Watch negotiation
tail -f /var/log/charon.log | grep -E 'IKE|AUTH|CHILD'

# Common issues:
# "no matching proposal found" → mismatched proposals in esp_proposals/proposals
# "authentication failed" → wrong PSK or certificate mismatch
# "no route to host" → routing issue, check ip -6 route
```

## Summary

With the `swanctl`/`vici` backend, strongSwan on Linux uses `connections{}` blocks defining local/remote addresses, authentication (PSK or certificate), and `children{}` blocks for traffic selectors. For IPv6 site-to-site, set `local_addrs`/`remote_addrs` to IPv6 addresses and `local_ts`/`remote_ts` to IPv6 prefixes. Use `aes256gcm16-ecp256` as the ESP proposal and `aes256-sha256-ecp256` for IKE proposals. Manage with `swanctl --load-all` and `swanctl --list-sas`. Monitor issues with `journalctl -u strongswan -f`.
