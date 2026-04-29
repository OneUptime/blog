# How to Understand Mobile IPv6 Security with IPsec - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mobile IPv6, IPsec, Security, IKEv2, MIPv6, RFC 4877

Description: Understand how IPsec protects Mobile IPv6 Binding Update messages between Mobile Nodes and Home Agents, and configure IKEv2-based security associations.

## Introduction

RFC 6275 mandates IPsec for protecting Mobility Header messages (Binding Updates and Binding Acknowledgements) between the Mobile Node and Home Agent. RFC 4877 specifies how to use IKEv2 to establish these security associations dynamically.

## What IPsec Protects in MIPv6

| Traffic | IPsec Required | Protection |
|---|---|---|
| BU/BA between MN and HA | Yes (RFC 6275) | Authentication + Replay protection |
| Data tunnel MN↔HA | Recommended | Confidentiality (if needed) |
| BU to Correspondent Node | No (uses Return Routability) | Token-based auth |
| DHAAD messages | Optional | |

## IPsec Policies Required

Four IPsec policies are needed for each MN-HA pair:

```text
1. MN → HA: Outbound BUs (Mobility Header, proto 135) - ESP/AH
2. HA → MN: Inbound BAs (Mobility Header, proto 135) - ESP/AH
3. MN → HA: Outbound tunneled data - optional ESP
4. HA → MN: Inbound tunneled data - optional ESP
```

## Manual IPsec Configuration (Testing Only)

```bash
# ---- On the Mobile Node ----

# SA for MN→HA BUs (outbound)

ip xfrm state add \
  src 2001:db8:foreign::50 \
  dst 2001:db8:home::1 \
  proto esp spi 0x1001 \
  mode transport \
  auth hmac\(sha256\) 0xAABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899 \
  enc aes 0x00112233445566778899AABBCCDDEEFF

# Policy: protect outbound MH traffic to HA
ip xfrm policy add \
  src 2001:db8:foreign::50/128 \
  dst 2001:db8:home::1/128 \
  proto 135 dir out \
  tmpl src 2001:db8:foreign::50 dst 2001:db8:home::1 \
  proto esp mode transport reqid 1

# ---- On the Home Agent ----

# SA for HA→MN BAs (outbound from HA perspective)
ip xfrm state add \
  src 2001:db8:home::1 \
  dst 2001:db8:foreign::50 \
  proto esp spi 0x2001 \
  mode transport \
  auth hmac\(sha256\) 0x... \
  enc aes 0x...
```

## IKEv2 Configuration with strongSwan (Production)

strongSwan is the recommended IKEv2 implementation for MIPv6.

```text
# /etc/swanctl/swanctl.conf - MIPv6 Home Agent configuration

connections {
    mipv6-ha {
        version = 2
        local_addrs = 2001:db8:home::1
        remote_addrs = %any6  # Accept any Mobile Node

        local {
            auth = pubkey
            certs = ha-cert.pem
            id = ha.example.com
        }

        remote {
            auth = pubkey
            id = %any
        }

        children {
            mipv6-binding {
                # Protect Mobility Header messages (proto 135)
                local_ts  = 2001:db8:home::1/128[135]
                remote_ts = ::/0[135]
                esp_proposals = aes256gcm128-prfsha256-ecp384
                mode = transport
            }
        }
    }
}
```

```text
# /etc/swanctl/swanctl.conf - Mobile Node configuration

connections {
    mipv6-mn {
        version = 2
        local_addrs = %any6
        remote_addrs = 2001:db8:home::1

        local {
            auth = pubkey
            certs = mn-cert.pem
            id = mn1.example.com
        }

        remote {
            auth = pubkey
            id = ha.example.com
            certs = ha-cert.pem
        }

        children {
            mipv6-binding {
                local_ts  = ::/0[135]
                remote_ts = 2001:db8:home::1/128[135]
                esp_proposals = aes256gcm128-prfsha256-ecp384
                mode = transport
                start_action = trap  # Initiate on first BU
            }
        }
    }
}
```

## Starting and Verifying

```bash
# Start strongSwan
sudo systemctl start strongswan

# Check IKE SAs
sudo swanctl --list-sas

# Verify IPsec policies are installed
sudo ip xfrm policy show | grep 135

# Test: send a BU and verify it's encrypted
sudo tcpdump -i eth0 -n 'ip6 and esp'
# Should see ESP-encrypted traffic between MN and HA
```

## IPsec Considerations for Mobile Nodes

```bash
# Mobile Nodes change IP addresses during handover
# The IPsec SA must be updated when CoA changes

# With IKEv2, strongSwan handles this via MOBIKE (RFC 4555)
# MOBIKE allows the IKE SA to follow the MN's CoA changes

# Enable MOBIKE in strongSwan
connections {
    mipv6-mn {
        # MOBIKE enabled by default in strongSwan
        mobike = yes
    }
}
```

## Conclusion

IPsec with IKEv2 provides strong authentication and replay protection for MIPv6 Binding Updates. strongSwan's MOBIKE support enables IKE SAs to follow Mobile Node CoA changes without re-establishment. Monitor IKE SA health and Binding Update success rates with OneUptime to detect security policy failures before they impact connectivity.
