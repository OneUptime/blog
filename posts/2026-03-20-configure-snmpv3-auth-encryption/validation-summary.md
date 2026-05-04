# Validation Summary: How to Configure SNMPv3 with Authentication and Encryption

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- SNMPv3 protocol (RFC 3414, RFC 3826)
- Cisco IOS SNMP server commands
- SHA authentication, AES encryption (privacy)
- MIB views and groups
- Net-SNMP CLI tools (`snmpget`, `snmpwalk`)
- Cisco IOS standard ACLs

## Sources Consulted
- Cisco IOS SNMP Configuration Guide — `snmp-server group`, `snmp-server user`, `snmp-server view`, `snmp-server host` command references
- Cisco IOS `snmp-server enable traps` command reference (notification-type / notification-option syntax)
- RFC 3414 (User-based Security Model for SNMPv3)
- RFC 3826 (AES Cipher Algorithm in the SNMP USM)
- Net-SNMP `snmpcmd(1)` and `snmpget(1)` man pages for v3 flag syntax (`-l`, `-u`, `-a`, `-A`, `-x`, `-X`)

## Issues Found

1. **Read-only group included `write iso`** — Step 1 had:
   `snmp-server group NetOpsRO v3 priv read iso write iso`
   labeled as a "read-only group", which is a contradiction since `write iso` grants full write access. Fixed by removing `write iso` so the group is genuinely read-only.

2. **Incorrect `snmp-server enable traps` syntax for linkup/linkdown** — Step 4 had:
   ```
   snmp-server enable traps linkdown
   snmp-server enable traps linkup
   ```
   In Cisco IOS, `linkdown` and `linkup` are notification *options* under the `snmp` notification-type, not standalone trap types. The valid syntax is `snmp-server enable traps snmp linkdown linkup`. Fixed accordingly. (`snmp-server enable traps bgp` is correct as `bgp` is a top-level notification type.)

## Review Notes
- The Cisco config snippets use shell-style backslash line continuation for readability. Cisco IOS itself does not support `\` line continuation — each command must be entered on a single line. Left as-is since it's a common documentation convention and the logical commands are correct.
- "Message integrity: Prevents replay attacks" conflates two distinct USM features: message integrity (HMAC) protects against tampering, while anti-replay is provided separately by the timeliness check using `msgAuthoritativeEngineBoots`/`msgAuthoritativeEngineTime`. SNMPv3 does provide both, so the practical claim is accurate; left as-is.
- DES and 3DES are listed as privacy options, which is historically accurate for Cisco IOS, but DES is cryptographically broken and 3DES is deprecated. AES-128 (as recommended in the post) is the right modern choice; some newer platforms also support AES-192/AES-256 via the Cisco extension RFC 3826 implementations.
- The example Engine ID `80000009030000000000000000` is a plausible Cisco-format engine ID (enterprise prefix `800000090` for Cisco, format byte `03` for MAC-based) but the trailing zeros indicate a placeholder; real devices will show their MAC. This is acceptable for an illustrative example.
