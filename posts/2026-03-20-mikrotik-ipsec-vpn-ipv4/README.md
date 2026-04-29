# How to Set Up IPsec VPN for IPv4 on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, IPsec, VPN, IPv4, Site-to-Site, Security

Description: Configure a site-to-site IPsec VPN between two MikroTik routers for IPv4, using IKEv2 with pre-shared keys to encrypt traffic between private networks.

## Introduction

MikroTik RouterOS supports IPsec natively. A site-to-site IPsec VPN requires matching Phase 1 (IKE) profiles, Phase 2 (IPsec) proposals, and peer definitions on both endpoints.

## Router A Configuration (Site A: 192.168.1.0/24)

```mikrotik
# IKE Phase 1 profile

/ip ipsec profile add \
  name=IPSEC-PROFILE \
  hash-algorithm=sha256 \
  enc-algorithm=aes-256 \
  dh-group=modp2048 \
  lifetime=1h

# IPsec Phase 2 proposal
/ip ipsec proposal add \
  name=IKE-PROPOSAL \
  auth-algorithms=sha256 \
  enc-algorithms=aes-256-cbc \
  pfs-group=modp2048

# Peer definition (Router B's public IP)
/ip ipsec peer add \
  name=SITE-B \
  address=203.0.113.2 \
  profile=IPSEC-PROFILE \
  exchange-mode=ike2

# Identity (pre-shared key)
/ip ipsec identity add \
  peer=SITE-B \
  auth-method=pre-shared-key \
  secret=IPsecSharedKey123

# Policy - what traffic to encrypt
/ip ipsec policy add \
  peer=SITE-B \
  src-address=192.168.1.0/24 \
  dst-address=192.168.2.0/24 \
  sa-src-address=203.0.113.1 \
  sa-dst-address=203.0.113.2 \
  tunnel=yes \
  action=encrypt \
  proposal=IKE-PROPOSAL

# NAT exemption (skip NAT for VPN traffic)
/ip firewall nat add \
  chain=srcnat \
  src-address=192.168.1.0/24 \
  dst-address=192.168.2.0/24 \
  action=accept \
  place-before=0 \
  comment="NAT exemption for VPN"
```

## Router B Configuration (Site B: 192.168.2.0/24)

```mikrotik
/ip ipsec profile add \
  name=IPSEC-PROFILE \
  hash-algorithm=sha256 \
  enc-algorithm=aes-256 \
  dh-group=modp2048 \
  lifetime=1h

/ip ipsec proposal add \
  name=IKE-PROPOSAL \
  auth-algorithms=sha256 \
  enc-algorithms=aes-256-cbc \
  pfs-group=modp2048

/ip ipsec peer add \
  name=SITE-A \
  address=203.0.113.1 \
  profile=IPSEC-PROFILE \
  exchange-mode=ike2

/ip ipsec identity add \
  peer=SITE-A \
  auth-method=pre-shared-key \
  secret=IPsecSharedKey123

/ip ipsec policy add \
  peer=SITE-A \
  src-address=192.168.2.0/24 \
  dst-address=192.168.1.0/24 \
  sa-src-address=203.0.113.2 \
  sa-dst-address=203.0.113.1 \
  tunnel=yes \
  action=encrypt \
  proposal=IKE-PROPOSAL

/ip firewall nat add \
  chain=srcnat \
  src-address=192.168.2.0/24 \
  dst-address=192.168.1.0/24 \
  action=accept \
  place-before=0
```

## Verify IPsec

```mikrotik
# Show active IPsec peers
/ip ipsec active-peers print

# Show SA (Security Associations)
/ip ipsec installed-sa print

# Show installed policies
/ip ipsec policy print

# Test connectivity
/ping 192.168.2.1 src-address=192.168.1.1
```

## Conclusion

MikroTik IPsec site-to-site VPN requires matching IKE proposals, IPsec profiles, peer definitions, and symmetric policies on both routers. Always add a NAT exemption rule before the masquerade rule so VPN traffic is not translated. Use IKEv2 for new deployments as it is more efficient and secure than IKEv1.
