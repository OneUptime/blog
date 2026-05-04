# How to Configure SNMPv3 with Authentication and Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, SNMPv3, Security, Cisco IOS, Authentication, Encryption

Description: Learn how to configure SNMPv3 with SHA authentication and AES encryption on Cisco IOS devices for secure network monitoring without cleartext community strings.

## Why SNMPv3?

SNMPv2c transmits community strings and data in cleartext-anyone who can capture network traffic can read your community strings and poll your devices. SNMPv3 adds:
- **Authentication:** Verifies the sender's identity (MD5 or SHA)
- **Privacy (Encryption):** Encrypts the SNMP message body (DES, 3DES, or AES)
- **Message integrity:** Prevents replay attacks

## SNMPv3 Security Levels

| Level | Authentication | Encryption |
|---|---|---|
| noAuthNoPriv | No | No |
| authNoPriv | Yes (MD5/SHA) | No |
| authPriv | Yes (MD5/SHA) | Yes (DES/AES) |

Always use `authPriv` in production.

## Step 1: Create an SNMPv3 Group

Groups define the security level and MIB views:

```text
! Create a group named 'NetOpsGroup' with authPriv security level
Router(config)# snmp-server group NetOpsGroup v3 priv

! Create a read-only group
Router(config)# snmp-server group NetOpsRO v3 priv read iso

! The 'iso' view includes the entire MIB tree
! You can restrict to specific OIDs with a custom view
```

## Step 2: Create a Custom MIB View (Optional)

Restrict what a user can read:

```text
! Create a view that only allows reading interface and system MIBs
Router(config)# snmp-server view MONITORING_VIEW interfaces included
Router(config)# snmp-server view MONITORING_VIEW system included
Router(config)# snmp-server view MONITORING_VIEW ip included

! Apply the view to the group
Router(config)# snmp-server group NetOpsGroup v3 priv read MONITORING_VIEW
```

## Step 3: Create an SNMPv3 User

Users belong to groups and have individual authentication and privacy settings:

```text
! Create user with SHA authentication and AES-128 encryption
Router(config)# snmp-server user nmsuser NetOpsGroup v3 \
  auth sha AuthPass@2026! \
  priv aes 128 PrivPass@2026!

! Create a read-only user
Router(config)# snmp-server user readonly NetOpsRO v3 \
  auth sha ReadAuth@2026! \
  priv aes 128 ReadPriv@2026!
```

Password requirements: minimum 8 characters for auth, minimum 8 for priv.

## Step 4: Configure SNMPv3 Trap Destination

```text
! Send SNMPv3 traps to NMS using the user credentials
Router(config)# snmp-server host 192.168.1.100 version 3 priv nmsuser

! Enable trap types
Router(config)# snmp-server enable traps snmp linkdown linkup
Router(config)# snmp-server enable traps bgp
```

## Step 5: Verify SNMPv3 Configuration

```text
! Show configured users
Router# show snmp user

User name: nmsuser
Engine ID: 80000009030000000000000000
Authentication Protocol: SHA
Privacy Protocol: AES128
Group-name: NetOpsGroup

! Show groups
Router# show snmp group

groupname: NetOpsGroup                        security model:v3 priv
```

## Step 6: Test SNMPv3 Polling from Linux

Use Net-SNMP tools to verify the SNMPv3 configuration:

```bash
# Test SNMPv3 GET with authentication and privacy

snmpget -v3 \
  -l authPriv \
  -u nmsuser \
  -a SHA \
  -A "AuthPass@2026!" \
  -x AES \
  -X "PrivPass@2026!" \
  192.168.1.1 \
  sysDescr.0

# Walk the interface table
snmpwalk -v3 \
  -l authPriv \
  -u nmsuser \
  -a SHA -A "AuthPass@2026!" \
  -x AES -X "PrivPass@2026!" \
  192.168.1.1 \
  ifTable
```

## Step 7: Restrict SNMPv3 Access with ACL

```text
! Create ACL to allow only the NMS server
Router(config)# ip access-list standard SNMP_NMS_ONLY
Router(config-std-nacl)# permit 192.168.1.100
Router(config-std-nacl)# deny any log

! Assign ACL to the SNMPv3 group
Router(config)# snmp-server group NetOpsGroup v3 priv \
  read MONITORING_VIEW access SNMP_NMS_ONLY
```

## Conclusion

SNMPv3 with `authPriv` provides production-grade security for network monitoring. Create a group with `priv` security level, assign users with SHA authentication and AES encryption, and restrict access with an ACL. Always use SNMPv3 for new deployments-SNMPv2c is acceptable only on isolated management networks where cleartext is not a concern.
