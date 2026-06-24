# How to Understand the Encapsulating Security Payload (ESP) in IPv6 (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, ESP, Security, Encryption

Description: Understand the Encapsulating Security Payload (ESP) extension header in IPv6, how it provides confidentiality and authentication for IPv6 traffic, and how to configure it with Linux IPsec.

## Introduction

The Encapsulating Security Payload (ESP, Next Header = 50) is the workhorse of IPsec security for IPv6. It can provide confidentiality (encryption), data origin authentication, connectionless integrity, anti-replay protection, and limited traffic flow confidentiality, depending on the SA and algorithms in use. ESP is more widely used than AH because it can provide both encryption and integrity in one protocol, and it is compatible with NAT traversal (unlike AH).

## ESP Packet Structure

```text
ESP wraps the payload with header and trailer:

[IPv6 Header][ESP Header][Payload Data][ESP Trailer][ESP Auth Data / ICV]

ESP Header (8 bytes):
  - Security Parameters Index (SPI): 4 bytes
  - Sequence Number: 4 bytes

ESP Payload Data:
  - Original upper-layer data (TCP/UDP/etc.), or an entire inner IP packet in tunnel mode
  - May also include an explicit IV/nonce, depending on the cipher

ESP Trailer:
  - Padding (0-255 bytes to align to cipher block boundary)
  - Pad Length: 1 byte
  - Next Header: 1 byte (protocol of encrypted payload, e.g., 6=TCP)

ESP Auth Data / ICV (optional, variable):
  - Present when integrity protection is used
  - Covers SPI + Sequence + Payload Data + Trailer for separate integrity algorithms
  - With AEAD ciphers such as AES-GCM, an authentication tag is used instead of a separate HMAC
```

## Transport vs Tunnel Mode

```text
Transport Mode (end-to-end between two hosts):
  [IPv6][ESP Header][Encrypted: TCP + Data][ESP Trailer][ICV]
  The IPv6 header is visible; only payload is encrypted

Tunnel Mode (VPN between two gateways):
  [New IPv6][ESP Header][Encrypted: Old IPv6 + TCP + Data][ESP Trailer][ICV]
  The entire original packet (including IP header) is encrypted
  Used for site-to-site VPNs
```

## Configuring ESP with Linux Kernel IPsec

```bash
# Configure ESP between two hosts using ip xfrm

# On Host A (2001:db8::1), add the outbound SA used for traffic to Host B:

# Add Security Association (outbound to Host B)
sudo ip xfrm state add \
    src 2001:db8::1 dst 2001:db8::2 \
    proto esp spi 0xABCD1234 \
    mode transport \
    enc "cbc(aes)" 0x000102030405060708090a0b0c0d0e0f \
    auth-trunc "hmac(sha256)" \
    0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20 \
    128

# Add outbound policy
sudo ip xfrm policy add \
    src 2001:db8::1 dst 2001:db8::2 \
    dir out \
    tmpl src 2001:db8::1 dst 2001:db8::2 \
    proto esp mode transport

# Mirror the matching inbound SA/policy on Host B, and configure the reverse
# direction on both hosts so return traffic is protected too.

# Verify ESP is applied
ping -6 -c 3 2001:db8::2
sudo tcpdump -i eth0 "ip6[6] == 50"  # ESP packets
```

## strongSwan Configuration (Modern IPsec)

```text
# /etc/swanctl/swanctl.conf - strongSwan site-to-site VPN over IPv6
# Mirror this on the peer with local/remote values swapped.

connections {
    ipv6-tunnel {
        version = 2
        local_addrs = 2001:db8::1
        remote_addrs = 2001:db8::2
        proposals = aes256-sha256-modp2048

        local {
            auth = psk
            id = 2001:db8::1
        }
        remote {
            auth = psk
            id = 2001:db8::2
        }
        children {
            net-net {
                local_ts = 2001:db8:1::/48
                remote_ts = 2001:db8:2::/48
                esp_proposals = aes256gcm16
                start_action = start
            }
        }
    }
}

secrets {
    ike-site {
        id-host-a = 2001:db8::1
        id-host-b = 2001:db8::2
        secret = "replace-with-a-long-random-psk"
    }
}
```

## ESP Cipher Suites Commonly Used

```bash
# Modern ESP proposal keywords commonly used:
# Combined mode (encryption + authentication in one):
#   aes128gcm16   - AES-GCM 128-bit
#   aes256gcm16   - AES-GCM 256-bit

# Separate encryption + auth:
#   aes128-sha256  - AES-128-CBC + HMAC-SHA-256
#   aes256-sha256  - AES-256-CBC + HMAC-SHA-256

# Inspect configured xfrm states and available kernel crypto primitives
sudo ip xfrm state list
grep -A 2 "^name.*gcm" /proc/crypto
```

## NAT Traversal (NAT-T) with ESP

Unlike AH, ESP is compatible with NAT using NAT-T (UDP port 4500 encapsulation):

```bash
# NAT-T wraps ESP in UDP for NAT compatibility
# IKE: UDP 500 (initial) → UDP 4500 (after NAT detected)
# ESP after NAT-T: [UDP 4500][ESP][Encrypted Payload]

# Verify NAT-T is being used
sudo tcpdump -i eth0 "udp port 4500"
```

## ESP vs AH Summary

| Feature | ESP | AH |
|---|---|---|
| Encryption | Yes | No |
| Integrity | Yes (ESP header, payload, and trailer; not the outer IP header) | Yes (authenticated except for mutable IP fields) |
| NAT compatible | Yes (with NAT-T) | No |
| Header size | Variable (8-byte header + trailer + optional auth/tag) | 12 bytes + auth |
| Common use | Yes (preferred) | Rare |
| Tunnel mode | Yes | Yes |

## Conclusion

ESP is the standard choice for IPv6 IPsec deployments, typically providing encryption, integrity, and anti-replay protection in transport or tunnel mode. Combined mode ciphers like AES-GCM provide both encryption and authentication efficiently in a single pass. ESP's compatibility with NAT traversal makes it practical in mixed environments, unlike AH which breaks when source or destination addresses are translated. For most VPN and secure communication needs, ESP with AES-GCM is a recommended modern configuration.
