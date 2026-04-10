# How to Configure CHAP Authentication for Ceph iSCSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, iSCSI, CHAP, Security

Description: Learn how to configure one-way and mutual CHAP authentication on Ceph iSCSI gateways to secure initiator access to storage targets.

---

## What is CHAP Authentication?

CHAP (Challenge-Handshake Authentication Protocol) is the standard authentication mechanism for iSCSI. It prevents unauthorized initiators from connecting to your storage targets. Ceph iSCSI supports both one-way CHAP (target authenticates the initiator) and mutual CHAP (both sides authenticate each other).

## One-Way CHAP Configuration

In one-way CHAP, the target challenges the initiator and the initiator must provide the correct username and password.

Configure CHAP credentials for a specific initiator using `gwcli`:

```bash
gwcli
```

```text
/> cd /iscsi-targets/iqn.2024-01.com.example:storage/hosts
/hosts> create iqn.1993-08.org.debian:client01
/hosts/iqn.1993-08.org.debian:client01/> auth chap=client01/SecurePass123
```

Password requirements:
- Minimum 12 characters
- Maximum 16 characters (applies to both CHAP and mutual CHAP)
- Alphanumeric and special characters allowed

## Mutual CHAP Configuration

Mutual CHAP adds a second layer where the initiator also challenges the target. Configure both directions:

```bash
gwcli
```

```text
/hosts/iqn.1993-08.org.debian:client01/> auth chap=client01/ClientPass123 mutual_chap=target_user/TargetPass123
```

## Configuring CHAP on the Linux Initiator

Edit the initiator's authentication settings in `/etc/iscsi/iscsid.conf`:

```bash
# One-way CHAP
node.session.auth.authmethod = CHAP
node.session.auth.username = client01
node.session.auth.password = SecurePass123
```

For mutual CHAP, also add the target credentials:

```bash
node.session.auth.username_in = target_user
node.session.auth.password_in = TargetPass123
```

Reload the iSCSI configuration:

```bash
systemctl restart iscsid
```

## Per-Node CHAP Configuration

Set CHAP credentials for a specific target node record without modifying the global config:

```bash
iscsiadm -m node \
  -T iqn.2024-01.com.example:storage \
  -p 10.0.1.10:3260 \
  --op update -n node.session.auth.authmethod -v CHAP

iscsiadm -m node \
  -T iqn.2024-01.com.example:storage \
  -p 10.0.1.10:3260 \
  --op update -n node.session.auth.username -v client01

iscsiadm -m node \
  -T iqn.2024-01.com.example:storage \
  -p 10.0.1.10:3260 \
  --op update -n node.session.auth.password -v SecurePass123
```

## CHAP for Windows Initiators

In PowerShell, set CHAP credentials when connecting:

```powershell
Connect-IscsiTarget `
  -NodeAddress "iqn.2024-01.com.example:storage" `
  -TargetPortalAddress "10.0.1.10" `
  -AuthenticationType ONEWAYCHAP `
  -ChapUsername "client01" `
  -ChapSecret "SecurePass123" `
  -IsPersistent $true
```

## Verifying CHAP Authentication

Test CHAP authentication with a login attempt:

```bash
iscsiadm -m node \
  -T iqn.2024-01.com.example:storage \
  -p 10.0.1.10:3260 \
  --login
```

Check authentication events in the kernel log:

```bash
dmesg | grep -i "chap\|auth" | tail -10
```

On the gateway, check for auth failures:

```bash
journalctl -u rbd-target-gw | grep -i "auth\|chap" | tail -20
```

## Summary

CHAP authentication for Ceph iSCSI prevents unauthorized access by requiring initiators to prove their identity before connecting to targets. One-way CHAP is sufficient for most environments, while mutual CHAP adds protection against rogue targets. Configuring CHAP through `gwcli` on the gateway and matching credentials in the initiator's `iscsid.conf` completes the authentication setup.
