# How to Configure OSPF Authentication (Plain Text and MD5)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, Authentication, MD5, Security, Cisco IOS

Description: Learn how to configure OSPF plain text and MD5 authentication at both the interface level and area level to prevent unauthorized routers from joining your OSPF domain.

## Why OSPF Authentication?

Without authentication, any router on the network that sends OSPF Hello packets with the correct area ID can form an adjacency. A rogue router could inject false routing information, causing traffic redirection or black holes. OSPF authentication requires neighbors to prove their identity before forming an adjacency.

## Authentication Types

| Type | Security | Use Case |
|---|---|---|
| Type 0 | None | Lab/trusted networks |
| Type 1 | Plain text | Legacy (password visible in packet capture) |
| Type 2 | MD5 | Production networks (recommended) |

## Method 1: Interface-Level Plain Text Authentication

Configure per-interface for granular control:

```text
Router(config)# interface GigabitEthernet0/0
! Set the authentication password (up to 8 characters)
Router(config-if)# ip ospf authentication-key Passw0rd
! Enable plain text authentication on this interface
Router(config-if)# ip ospf authentication
```

Both routers on the link must have the same password.

## Method 2: Interface-Level MD5 Authentication

MD5 authentication is configured per interface using a key ID and key string. Multiple `message-digest-key` entries can be added on the same interface for key rotation:

```text
Router(config)# interface GigabitEthernet0/0
! Configure MD5 key (key ID must match on both sides)
Router(config-if)# ip ospf message-digest-key 1 md5 Str0ngSecret!
! Enable MD5 authentication
Router(config-if)# ip ospf authentication message-digest
```

## Method 3: Area-Level Authentication

Configure authentication for an entire area. The area-level setting sets the default; individual interfaces can override it:

```text
router ospf 1
 ! Enable MD5 authentication for all interfaces in Area 0
 area 0 authentication message-digest

 ! Enable plain text for Area 1
 area 1 authentication
```

Each interface in the area still needs its key configured:

```text
! Configure key on each interface in Area 0
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip ospf message-digest-key 1 md5 AreaZeroKey!

Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip ospf message-digest-key 1 md5 AreaZeroKey!
```

## Method 4: Authentication Key Chains (IOS XE)

Modern IOS XE supports key chains for OSPF authentication, enabling key rotation:

```text
! Define a key chain
key chain OSPF_KEYS
 key 1
  key-string OldKey!
  accept-lifetime 00:00:00 Jan 1 2025 23:59:59 Dec 31 2025
  send-lifetime 00:00:00 Jan 1 2025 23:59:59 Dec 31 2025
 key 2
  key-string NewKey@2026!
  accept-lifetime 00:00:00 Jan 1 2026 infinite
  send-lifetime 00:00:00 Jan 1 2026 infinite

! Apply key chain to OSPF interface
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip ospf authentication key-chain OSPF_KEYS
```

## Step: Verify Authentication

```text
! Check authentication settings on an interface
Router# show ip ospf interface GigabitEthernet0/0 | include auth

! Plain text output:
! Simple password authentication enabled
! Cryptographic authentication enabled (MD5 output):
! Message digest authentication enabled
! Youngest key id is 1

! Check if OSPF adjacency forms with auth
Router# show ip ospf neighbor

! If auth is wrong, neighbor will stay in INIT or not appear at all
! Check logs for authentication errors:
Router# show log | include OSPF|auth
```

## Common Authentication Errors

```text
! This log message means the authentication TYPE is mismatched
! (e.g., one side configured for MD5, the other for plain text or null)
%OSPF-4-BADAUTH: Bad authentication type. Message ignored from 10.0.0.2, GigabitEthernet0/0

! This means plain text passwords don't match
%OSPF-4-BADAUTH: Message has wrong authentication password from 10.0.0.2

! This means MD5 key ID or key string doesn't match
%OSPF-4-BADAUTH: Mismatched key id (No message digest key 1 on interface) from 10.0.0.2
```

## Conclusion

OSPF MD5 authentication is the minimum security requirement for production networks. Configure it at the interface level with `ip ospf message-digest-key` and `ip ospf authentication message-digest`, or at the area level with `area X authentication message-digest`. Use key chains with send/accept lifetimes for zero-downtime key rotation. Verify authentication is working by confirming neighbor adjacency reaches FULL state.
