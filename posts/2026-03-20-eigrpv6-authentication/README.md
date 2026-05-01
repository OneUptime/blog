# How to Configure EIGRPv6 Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, Cisco, IPv6, Authentication, Security

Description: Learn how to configure MD5 and SHA-256 authentication for EIGRPv6 on Cisco IOS to protect routing protocol messages from unauthorized injection.

## Overview

EIGRPv6 supports authentication to prevent rogue routers from injecting false routing information. Classic EIGRPv6 supports MD5; Named EIGRP additionally supports SHA-256 (HMAC-SHA-256).

## Classic EIGRPv6 MD5 Authentication

```text
! Step 1: Create a key chain with keys
Router(config)# key chain EIGRP_AUTH
Router(config-keychain)# key 1
Router(config-keychain-key)#  key-string MySecretKey
Router(config-keychain-key)#  accept-lifetime 00:00:00 Jan 1 2026 infinite
Router(config-keychain-key)#  send-lifetime 00:00:00 Jan 1 2026 infinite

! Step 2: Apply MD5 authentication on each EIGRPv6-enabled interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 authentication mode eigrp 1 md5
Router(config-if)# ipv6 authentication key-chain eigrp 1 EIGRP_AUTH
```

Both neighbors must use matching valid keys; the key strings and send/accept lifetimes must align on both sides.

## Named EIGRPv6 SHA-256 Authentication

Named EIGRP supports the stronger HMAC-SHA-256 algorithm:

```text
Router(config)# router eigrp MY_NETWORK
Router(config-router)# address-family ipv6 unicast autonomous-system 1
Router(config-router-af)# af-interface GigabitEthernet0/0
Router(config-router-af-interface)#  authentication mode hmac-sha-256 0 MySecretKey
Router(config-router-af-interface)#  exit-af-interface
Router(config-router-af)# exit-address-family
```

The key is specified directly - no separate key chain is needed for SHA-256 in Named mode.

## Applying to Multiple Interfaces

```text
! Named EIGRP: apply to default interface (all interfaces inherit)
Router(config)# router eigrp MY_NETWORK
Router(config-router)# address-family ipv6 unicast autonomous-system 1
Router(config-router-af)# af-interface default
Router(config-router-af-interface)#  authentication mode hmac-sha-256 0 SharedPassword
Router(config-router-af-interface)#  exit-af-interface

! Specific interface override (no authentication on Loopback)
Router(config-router-af)# af-interface Loopback0
Router(config-router-af-interface)#  no authentication mode
Router(config-router-af-interface)#  exit-af-interface
```

## Verifying Authentication

```text
! Verify authentication is configured on an interface
Router# show ipv6 eigrp interfaces detail | include Auth
  Authentication mode is md5, key-chain is "EIGRP_AUTH"

! Verify neighbors still form with authentication
Router# show ipv6 eigrp neighbors
! Neighbors should remain in the table - if they disappear, check for key or lifetime mismatch

! Check for authentication failures in logs
Router# show logging | include EIGRP | include auth
```

## Key Rotation Without Session Drop

Using key chains with overlapping accept/send lifetimes allows seamless key rotation:

```text
! Add a new key before the old one expires
Router(config)# key chain EIGRP_AUTH
Router(config-keychain)# key 1
Router(config-keychain-key)#  key-string OldKey
Router(config-keychain-key)#  send-lifetime 00:00:00 Jan 1 2026 23:59:59 Dec 31 2026
Router(config-keychain-key)#  accept-lifetime 00:00:00 Jan 1 2026 23:59:59 Jan 31 2027

Router(config-keychain)# key 2
Router(config-keychain-key)#  key-string NewKey
Router(config-keychain-key)#  send-lifetime 00:00:00 Jan 1 2027 infinite
Router(config-keychain-key)#  accept-lifetime 00:00:00 Dec 1 2026 infinite
```

The overlap period allows both keys to be valid simultaneously, so neighbors can transition without session resets.

## Summary

EIGRPv6 authentication prevents rogue router injection. Use MD5 with key chains for Classic EIGRPv6 and HMAC-SHA-256 in Named EIGRP for stronger security. Apply authentication per-interface with `ipv6 authentication mode eigrp` (classic) or `af-interface` blocks (named). Plan key rotation with overlapping accept lifetimes to avoid session disruption.
