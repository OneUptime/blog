# How to Understand Mobile IPv6 Security with IPsec

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Mobile IPv6, IPsec, Security, RFC 3776, ESP

Description: Understand the mandatory IPsec requirements for Mobile IPv6, including how ESP protects Binding Updates to the Home Agent and the Security Policy Database configuration.

## Introduction

RFC 6275 mandates that Binding Updates from a Mobile Node to its Home Agent MUST be protected by IPsec. RFC 3776 specifies the exact IPsec policies required. This prevents attackers from hijacking a mobile node's home address by sending fraudulent Binding Updates.

## Why IPsec Is Mandatory for MIPv6

Without IPsec, an attacker could:
1. Send a Binding Update to the HA claiming that the MN's home address is now at the attacker's address
2. All traffic destined for the MN would be tunneled to the attacker
3. This is a trivial redirection/hijacking attack

## Required IPsec Policies (RFC 3776)

```text
Policy 1: MN → HA Binding Update
  Source: MN Home Address
  Destination: HA Address
  Protocol: MH (135)
  MH Type: Binding Update (5)
  Action: ESP (integrity + optional encryption)

Policy 2: HA → MN Binding Acknowledgment
  Source: HA Address
  Destination: MN Home Address
  Protocol: MH (135)
  MH Type: Binding Acknowledgment (6)
  Action: ESP

Policy 3: MN → HA Tunnel (data traffic)
  Outer src: MN CoA
  Outer dst: HA
  Inner src: MN Home Address
  Action: ESP transport mode on tunnel
```

## Linux IPsec Configuration for MIPv6

```bash
# Using ip xfrm (kernel IPsec) to configure MIPv6 security associations

# SPI values must be agreed upon (or negotiated via IKEv2)

HA_ADDR="2001:db8:home::ha"
MN_HOME="2001:db8:home::mn"
MN_COA="fd00:foreign::mn"

# Security Association: MN → HA (BU protection)
ip xfrm state add \
  src $MN_HOME dst $HA_ADDR \
  proto esp spi 0x1000 \
  mode transport \
  auth sha256 0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899 \
  enc aes 0x00112233445566778899aabbccddeeff

# Security Policy: apply ESP to Mobility Header MN→HA
ip xfrm policy add \
  src $MN_HOME/128 dst $HA_ADDR/128 \
  proto 135 \
  dir out \
  tmpl src $MN_HOME dst $HA_ADDR \
    proto esp mode transport \
    reqid 1

# Reverse SA: HA → MN (BA protection)
ip xfrm state add \
  src $HA_ADDR dst $MN_HOME \
  proto esp spi 0x2000 \
  mode transport \
  auth sha256 0x99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa \
  enc aes 0xffeeddccbbaa99887766554433221100

ip xfrm policy add \
  src $HA_ADDR/128 dst $MN_HOME/128 \
  proto 135 \
  dir in \
  tmpl src $HA_ADDR dst $MN_HOME \
    proto esp mode transport \
    reqid 2
```

## IKEv2 with strongSwan for MIPv6

```ini
# /etc/swanctl/conf.d/mip6.conf
connections {
  mip6-ha {
    version = 2
    local_addrs = 2001:db8:home::mn  # MN home address
    remote_addrs = 2001:db8:home::ha

    local {
      auth = pubkey
      certs = mn_cert.pem
    }
    remote {
      auth = pubkey
      cacerts = ca_cert.pem
    }

    children {
      mip6-bu {
        # Protect Mobility Header traffic (proto 135)
        local_ts  = 2001:db8:home::mn/128[135]
        remote_ts = 2001:db8:home::ha/128[135]
        esp_proposals = aes256gcm128-ecp384
        mode = transport
      }
    }
  }
}
```

## Verifying IPsec on Mobility Header Traffic

```bash
# Check SA counters (byte counts increase when BU/BA are exchanged)
ip xfrm state list | grep -A5 "proto esp"

# Monitor ESP-protected MH packets
tcpdump -i eth0 -n "ip6 proto 50" -v
# proto 50 = ESP

# After decryption by kernel, see the inner MH
ip xfrm monitor
# Will show: ACQUIRE, EXPIRE events for MIPv6 SAs
```

## Conclusion

IPsec ESP is mandatory for protecting Binding Updates in Mobile IPv6. Configure transport-mode ESP SAs between the Mobile Node's home address and the Home Agent. Use IKEv2 (strongSwan) for production key management. Monitor SA lifetimes and rekeying events with OneUptime to ensure continuous protection of mobile node bindings.
