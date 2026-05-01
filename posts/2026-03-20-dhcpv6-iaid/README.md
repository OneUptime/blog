# Understanding DHCPv6 IAID (Identity Association Identifier)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, IAID, Networking, IA_NA, IA_PD, Identity Association

Description: Learn what a DHCPv6 IAID is, how it differs from a DUID, and how Identity Associations (IA_NA, IA_TA, IA_PD) work to assign IPv6 addresses and prefixes to clients.

---

In DHCPv6, an IAID (Identity Association Identifier) is a 32-bit number that identifies a specific Identity Association (IA) on a DHCPv6 client. While the DUID identifies the client device, the IAID identifies a particular IA that carries addresses or delegated prefixes on that device.

---

## What is an Identity Association (IA)?

An Identity Association (IA) is the construct through which a DHCPv6 client and server identify, group, and manage a set of related IPv6 addresses or delegated prefixes. There are three IA types:

| IA Type | Name | Purpose |
|---------|------|---------|
| IA_NA | Identity Association for Non-temporary Addresses | Standard IPv6 address assignment |
| IA_TA | Identity Association for Temporary Addresses | Short-lived privacy addresses |
| IA_PD | Identity Association for Prefix Delegation | Delegating a prefix to a client router |

---

## DUID vs IAID

| Concept | Scope | Stability | Purpose |
|---------|-------|-----------|---------|
| DUID | Entire device | Persistent | Identifies the client/server |
| IAID | Per IA type on a client | Client-defined | Identifies an IA |

A client with two interfaces (eth0, eth1) often uses one DUID plus distinct IAIDs for the IAs associated with those interfaces.

---

## How IAIDs Are Generated

RFC 8415 leaves IAID selection to the client implementation, as long as the IAID is unique among IAs of the same type on that client.

### Linux (systemd-networkd)

systemd-networkd chooses the IAID internally unless you set `IAID=` explicitly in the `[DHCPv6]` section.

### Linux (wide-dhcpv6-client / dhcp6c)

`dhcp6c` uses the numeric IDs from `send ia-na ID;` and `send ia-pd ID;` as the IAIDs for those IAs, with matching `id-assoc` blocks.

### Windows

Windows generates IAIDs automatically. View them via:

```powershell
# View DHCPv6-managed IPv6 addresses on an interface
netsh interface ipv6 show addresses
# Standard netsh output does not display the IAID itself
```

---

## Configuring IAID in systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv6

[DHCPv6]
# Pin the IAID value for this interface
IAID=1
```

### Why Pin the IAID?

If the IAID changes, the server sees it as a different IA and may issue a different address or delegated prefix. Pinning the IAID helps keep server-side lease tracking and reservations stable.

---

## Configuring IAID in wide-dhcpv6-client (dhcp6c)

```text
# /etc/wide-dhcpv6/dhcp6c.conf
interface eth0 {
    # IA_NA with IAID 1
    send ia-na 1;
    # IA_PD with IAID 2 (for prefix delegation)
    send ia-pd 2;
}

id-assoc na 1 {
};

id-assoc pd 2 {
    prefix-interface eth1 {
        sla-id 1;
        sla-len 8;
    };
};
```

---

## IA_NA Example - Non-Temporary Address

```text
# DHCPv6 message containing IA_NA
IA_NA:
  IAID: 0x00000001
  T1: 3600 seconds (renewal timer)
  T2: 5400 seconds (rebind timer)
  IA Address:
    Address: 2001:db8::10
    Preferred lifetime: 7200
    Valid lifetime: 14400
```

---

## IA_PD Example - Prefix Delegation

An IA_PD allows a client (e.g., a CPE router) to receive an entire prefix:

```text
IA_PD:
  IAID: 0x00000002
  T1: 3600
  T2: 5400
  IA Prefix:
    Prefix: 2001:db8:1::/48
    Preferred lifetime: 7200
    Valid lifetime: 14400
```

---

## Server-Side IAID Handling in Kea

Kea DHCPv6 automatically tracks IAID per client:

```json
{
  "Dhcp6": {
    "subnet6": [
      {
        "subnet": "2001:db8::/32",
        "pools": [
          { "pool": "2001:db8::100-2001:db8::200" }
        ],
        "pd-pools": [
          {
            "prefix": "2001:db8:1::",
            "prefix-len": 48,
            "delegated-len": 56
          }
        ]
      }
    ]
  }
}
```

---

## Troubleshooting IAID Issues

```bash
# Capture DHCPv6 traffic and inspect IAID values
sudo tcpdump -i eth0 -vv udp port 546 or udp port 547

# In Wireshark, filter:
# dhcpv6.iaid

# Check systemd-networkd IAID
journalctl -u systemd-networkd | grep -i iaid

# After changing IAID=, reload the .network file and reconfigure the link
sudo networkctl reload
sudo networkctl reconfigure eth0
```

---

## Best Practices

1. **Pin IAIDs in production** to ensure stable address assignments after reboots or hardware changes
2. **Use distinct IAIDs** for different IAs of the same type on multi-homed systems
3. **Use IA_PD** only on gateway/CPE devices that need prefix delegation
4. **Document DUID + IA type + IAID tuples** in your IPAM for server-side reservation management
5. **Test IAID persistence** by rebooting a client and verifying it receives the same address

---

## Conclusion

IAIDs are the client-chosen identifiers for DHCPv6 Identity Associations. Paired with the DUID and IA type, they let servers track address and prefix leases over time. Understanding IAIDs is essential when configuring prefix delegation, multi-interface hosts, or stable address reservations.

---

*Monitor your IPv6 address assignments and infrastructure with [OneUptime](https://oneuptime.com).*
