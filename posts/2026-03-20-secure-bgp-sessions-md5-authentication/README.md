# How to Secure BGP Sessions with MD5 Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, MD5, Authentication, Security, Cisco IOS, TCP-AO

Description: Learn how to configure MD5 authentication on BGP sessions to protect against session hijacking and spoofed TCP RST attacks.

## Why BGP Authentication Matters

BGP runs over TCP port 179. Without authentication, an attacker on the network path can inject spoofed TCP RST packets to tear down BGP sessions, or inject forged BGP UPDATE messages. MD5 authentication (RFC 2385) adds a cryptographic signature to each TCP segment, making these attacks infeasible.

## Step 1: Configure MD5 Authentication on Cisco IOS

Both peers must use the same password. The password is case-sensitive:

```text
! On Router A (AS 65001)
router bgp 65001
 neighbor 203.0.113.2 remote-as 65002
 ! Add MD5 password - must match Router B exactly
 neighbor 203.0.113.2 password SecureBGP@2026!

! On Router B (AS 65002)
router bgp 65002
 neighbor 203.0.113.1 remote-as 65001
 ! Same password as Router A
 neighbor 203.0.113.1 password SecureBGP@2026!
```

If passwords don't match, the TCP connection cannot be made and the session typically stays in Active state. Platforms such as Cisco IOS log TCP MD5 authentication failures when logging or debugging is enabled.

## Step 2: Verify MD5 Is Active

```text
Router# show ip bgp neighbors 203.0.113.2 | include BGP state
  BGP state = Established, up for 00:08:26

Router# show running-config | section router bgp
router bgp 65001
 neighbor 203.0.113.2 remote-as 65002
 neighbor 203.0.113.2 password SecureBGP@2026!
```

RFC 2385 does not negotiate TCP MD5. The configured password line confirms local MD5 configuration; an Established BGP state confirms that the peer accepted the same key.

## Step 3: Use Encrypted Password Storage

Store passwords in encrypted form in the configuration to prevent cleartext exposure in `show running-config`:

```text
! Use type 7 encryption (weak, Cisco reversible) - minimum protection
Router(config)# service password-encryption

! After enabling service password-encryption, the password appears as:
! neighbor 203.0.113.2 password 7 082E4A4D0B2F1B3D

! For stronger reversible storage on supported IOS XE platforms, use type 6 encryption (AES)
Router(config)# key config-key password-encrypt
! Enter the master key at the prompt, then:
Router(config)# password encryption aes
```

Note: Type 7 encryption is easily reversed. Type 6 is much stronger.

## Step 4: MD5 Authentication on FRRouting (Linux)

```text
! In FRR vtysh or /etc/frr/bgpd.conf

router bgp 65001
 neighbor 203.0.113.2 remote-as 65002
 neighbor 203.0.113.2 password SecureBGP@2026!
```

## Step 5: Harden with TTL Security (GTSM)

Generalized TTL Security Mechanism (GTSM, RFC 5082) complements MD5 by sending BGP packets with TTL 255 and accepting only incoming packets whose TTL is within the configured range. Spoofed packets from farther away arrive with a lower TTL and are silently discarded:

```text
! Configure TTL security - expect packets with TTL >= 254 (1 hop away)
router bgp 65001
 neighbor 203.0.113.2 ttl-security hops 1
```

For multihop eBGP sessions, adjust the hop count accordingly.

## Step 6: Consider TCP Authentication Option (TCP-AO)

TCP-AO (RFC 5925) is the successor to MD5 authentication. It supports multiple keys and stronger algorithms. Cisco IOS XE supports TCP-AO on supported releases and platforms:

```text
! Define a TCP-AO key chain
key chain BGP_AO_KEYS tcp
 key 1
  send-id 1
  recv-id 1
  cryptographic-algorithm hmac-sha-256
  key-string AO_Secure_Key_2026!

! Apply to BGP neighbor
router bgp 65001
 neighbor 203.0.113.2 ao BGP_AO_KEYS
```

TCP-AO is preferred over MD5 for new deployments where supported.

## Troubleshooting Authentication Failures

If the session stays in Active state after adding authentication:

```text
! Check for auth failure messages in logs
Router# show logging | include BADAUTH

! Common causes:
! - Password mismatch (typos, case sensitivity)
! - One side has authentication, the other doesn't
! - TTL-security hop mismatch
! - ACL blocking TCP 179

! Test basic TCP reachability before enabling MD5.
! After MD5 is enabled, plain telnet does not include the TCP MD5 option.
Router# telnet 203.0.113.2 179
```

## Conclusion

MD5 authentication on BGP sessions is a baseline security requirement for all production BGP peerings. Configure matching passwords on both sides, verify with `show ip bgp neighbors`, and combine with GTSM TTL security for defense in depth. Consider migrating to TCP-AO for new deployments where your platform supports it.
