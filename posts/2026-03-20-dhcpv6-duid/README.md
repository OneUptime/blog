# Understanding DHCPv6 DUID (DHCP Unique Identifier)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, DUID, Networking, Identity, IAID

Description: Learn what a DHCPv6 DUID is, the different DUID types (DUID-LLT, DUID-EN, DUID-LL, DUID-UUID), how they are generated, and how to manage them on Linux and Windows clients.

---

A DUID (DHCP Unique Identifier) is the identifier DHCPv6 uses for client and server identity. It is used by the server to track leases and enforce host-specific configuration. Unlike identifying a host only by an interface MAC address, a DUID is intended to be stable and reused across restarts.

---

## DUID Types

DHCPv6 defines four DUID types, each with a different format:

### DUID-LLT (Type 1) - Link-Layer Address Plus Time

A common type. Generated from a hardware address and the time the DUID was first created.

```text
Format: 2-byte type | 2-byte hardware type | 4-byte timestamp | N-byte link-layer address
Example: 00:01:00:01:28:4f:a1:b2:00:11:22:33:44:55
```

### DUID-EN (Type 2) - Vendor-Based Enterprise Number

Used by vendors and appliances. Based on the IANA Private Enterprise Number.

```text
Format: 2-byte type | 4-byte enterprise number | variable identifier
Example: 00:02:00:00:09:bf:...
```

### DUID-LL (Type 3) - Link-Layer Address Only

Similar to DUID-LLT but without the timestamp. Used when the device has a permanently attached link-layer address and wants a DUID without a time field.

```text
Format: 2-byte type | 2-byte hardware type | N-byte link-layer address
Example: 00:03:00:01:00:11:22:33:44:55
```

### DUID-UUID (Type 4) - UUID-Based

Based on the system's UUID (RFC 6355). Useful when the platform exposes a stable UUID.

```text
Format: 2-byte type | 16-byte UUID
Example: 00:04:00:01:02:03:04:05:06:07:08:09:0a:0b:0c:0d:0e:0f
```

---

## Viewing Your DUID on Linux

```bash
# wide-dhcpv6 DUID file

cat /var/lib/dhcpv6/dhcp6c_duid

# dhclient stores the DUID in the lease file
grep -i default-duid /var/lib/dhcp/dhclient6.leases 2>/dev/null

# systemd-networkd
networkctl status eth0

# Hex dump the wide-dhcpv6 DUID file
xxd /var/lib/dhcpv6/dhcp6c_duid
```

### Using ip Command to Find MAC (basis for DUID-LL / DUID-LLT)

```bash
ip link show eth0 | grep "link/ether"
# link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
```

---

## Viewing Your DUID on Windows

```powershell
# Show the DHCPv6 Client DUID and IAID
ipconfig /all | Select-String "DUID|IAID"
```

---

## Configuring Static DUID on Linux (systemd-networkd)

You can choose the DUID type, and if needed pin an exact value, in `systemd-networkd` to ensure consistent lease assignment:

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv6

[DHCPv6]
DUIDType=link-layer-time
# Or: DUIDType=link-layer
# Or: DUIDType=uuid
# Or: DUIDType=vendor
# To pin the example DUID shown earlier, also set:
# DUIDRawData=00:01:28:4f:a1:b2:00:11:22:33:44:55
```

### Choosing DUID Type with dhclient

```bash
# Stateful DHCPv6 defaults to DUID-LLT; stateless (-S) defaults to DUID-LL.
# Override the DUID type explicitly if needed:
dhclient -6 -D LL eth0
# Or:
dhclient -6 -D LLT eth0
```

---

## Using DUID for Host Reservations on the Server

### ISC DHCP (dhcpd)

```text
# /etc/dhcp/dhcpd6.conf
host webserver01 {
    host-identifier option dhcp6.client-id 00:01:00:01:28:4f:a1:b2:00:11:22:33:44:55;
    fixed-address6 2001:db8::10;
}
```

### Kea DHCPv6

```json
{
  "Dhcp6": {
    "subnet6": [
      {
        "subnet": "2001:db8::/64",
        "id": 1,
        "reservations": [
          {
            "duid": "00:01:00:01:28:4f:a1:b2:00:11:22:33:44:55",
            "ip-addresses": ["2001:db8::10"],
            "hostname": "webserver01.corp.example.com"
          }
        ]
      }
    ]
  }
}
```

---

## DUID vs IAID

| Concept | Purpose | Scope | Stability |
|---------|---------|-------|-----------|
| DUID | Identifies the DHCPv6 client/server | Device-wide | Persistent across reboots |
| IAID | Identifies a specific identity association on an interface | Per-interface | Chosen by the client and should remain stable for that IA |

The DHCPv6 Client Identifier option is the DUID. For actual address or prefix bindings, servers commonly distinguish leases using the tuple DUID + IAID + IA type.

---

## Best Practices

1. **Avoid changing a DUID** on production systems unless you plan for lease re-assignment
2. **Be deliberate about DUIDs on cloned virtual machines** to avoid duplicate client identities
3. **Record DUIDs in your IPAM** for all servers with reserved addresses
4. **Test reservations** in staging before production deployment
5. **Use DUID-UUID** on systems with a valid persistent product UUID when a UUID-based identifier fits your environment

---

## Conclusion

DUIDs are the cornerstone of DHCPv6 client identity. Understanding the four DUID types and how to view, pin, and use them for reservations is essential for managing IPv6 address assignments at scale.

---

*Manage and monitor your IPv6 network with [OneUptime](https://oneuptime.com) - full-stack observability with IPv6 support.*
