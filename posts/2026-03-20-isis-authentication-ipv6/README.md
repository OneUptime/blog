# How to Configure IS-IS Authentication for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, IPv6, Authentication, Security, Routing

Description: Learn how to configure IS-IS authentication to protect IPv6 routing updates from unauthorized injection on Cisco, Juniper, and FRRouting.

## Overview

IS-IS authentication prevents rogue routers from injecting false routing information into the network. Authentication can be applied at the interface level (Hello PDUs) or at the area/domain level (LSPs and SNPs). Modern implementations commonly support HMAC-MD5, and some platforms also support RFC 5310 generic cryptographic authentication with SHA-based algorithms.

## Authentication Scope

| Scope | Protects | TLV |
|-------|---------|-----|
| Interface (Hello) | Neighbor formation | TLV 10 |
| Area (Level-1 LSPs) | L1 routing database | TLV 10 |
| Domain (Level-2 LSPs) | L2 routing database | TLV 10 |

## Cisco IOS IS-IS Authentication

```text
! Step 1: Create a key chain for HMAC-MD5 authentication
Router(config)# key chain ISIS_AUTH
Router(config-keychain)# key 1
Router(config-keychain-key)#  key-string MySecretKey

! Step 2: Apply interface authentication (Hello PDUs)
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 router isis CORE
Router(config-if)# isis authentication mode md5
Router(config-if)# isis authentication key-chain ISIS_AUTH

! Step 3: Apply area/domain authentication (LSPs and SNPs)
Router(config)# router isis CORE
Router(config-router)# authentication mode md5 level-1    ! Area (L1) LSPs
Router(config-router)# authentication key-chain ISIS_AUTH level-1
Router(config-router)# authentication mode md5 level-2    ! Domain (L2) LSPs
Router(config-router)# authentication key-chain ISIS_AUTH level-2
```

## Juniper IS-IS Authentication

```text
# Interface-level authentication (Hello PDUs)

set protocols isis interface ge-0/0/0.0 level 2 hello-authentication-key "secretkey"
set protocols isis interface ge-0/0/0.0 level 2 hello-authentication-type md5

# Area/Domain authentication (LSPs and SNPs)
set protocols isis level 2 authentication-key "secretkey"
set protocols isis level 2 authentication-type md5
```

## FRRouting IS-IS Authentication

```bash
vtysh
configure terminal

! Interface hello authentication
interface eth0
 ipv6 router isis CORE
 isis password md5 MySecretKey

! Area and domain authentication
router isis CORE
 area-password md5 AreaPassword         ! Level-1 LSPs
 domain-password md5 DomainPassword     ! Level-2 LSPs

end
write memory
```

## HMAC-SHA-256 Authentication (Modern)

SHA-based authentication is platform-specific. For example, Cisco IOS XR supports HMAC-SHA-256 with keychains, and Junos added IS-IS HMAC-SHA2 keychain support on supported platforms in Junos OS Release 24.2R1:

```text
! Cisco IOS-XR
key chain ISIS_SHA_KEY
 key 1
  key-string clear MySecretKey1234
  cryptographic-algorithm HMAC-SHA-256
  send-lifetime 00:00:00 Jan 1 2026 infinite
  accept-lifetime 00:00:00 Jan 1 2026 infinite

router isis CORE
 lsp-password keychain ISIS_SHA_KEY level 2

 interface GigabitEthernet0/0/0/0
  hello-password keychain ISIS_SHA_KEY level 2
```

## Verifying Authentication

```text
! Cisco IOS/XE: Check that adjacency still forms
Router# show clns is-neighbors detail
! If neighbor drops after adding hello auth -> key mismatch

! View the IS-IS database
Router# show isis database detail
```

```bash
# FRRouting: Verify authentication
vtysh -c "show isis interface eth0" | grep -i auth

# Check neighbors are still up
vtysh -c "show isis neighbor"
```

## Authentication Transition (Adding Auth to Existing Network)

To add authentication without dropping adjacencies, enable send-only first for both Hello PDUs and LSP/SNP authentication, then remove send-only after all routers are updated:

```text
! Step 1: Configure authentication in "send-only" mode first

! Cisco IOS interface-level hello authentication
Router(config)# interface GigabitEthernet0/0
Router(config-if)# isis authentication send-only

! Cisco IOS router-level LSP/SNP authentication
Router(config)# router isis CORE
Router(config-router)# authentication send-only level-1
Router(config-router)# authentication send-only level-2

! Step 2: Once all routers are configured, remove "send-only"
! Now all routers both send and require authentication
Router(config)# interface GigabitEthernet0/0
Router(config-if)# no isis authentication send-only
Router(config)# router isis CORE
Router(config-router)# no authentication send-only level-1
Router(config-router)# no authentication send-only level-2
```

## Summary

IS-IS authentication protects Hello PDUs and LSPs/SNPs from unauthorized injection. Configure key chains or passwords according to platform support, apply authentication per-interface for Hello PDUs, and per-level for LSP authentication. Use SHA-based authentication where the platform supports it, and use `send-only` mode during migrations to avoid dropping adjacencies while routers are updated.
