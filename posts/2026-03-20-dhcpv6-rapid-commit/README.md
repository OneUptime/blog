# How to Enable DHCPv6 Rapid Commit for Faster Address Assignment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Networking, Rapid Commit, Performance, ISC DHCP, Kea

Description: Learn how to configure the DHCPv6 Rapid Commit option to reduce address assignment from a 4-message exchange to just 2 messages, speeding up client connectivity.

---

DHCPv6 normally requires a 4-message exchange (Solicit → Advertise → Request → Reply) to assign an address. Rapid Commit (option 14) reduces this to just 2 messages (Solicit → Reply), cutting connection setup time nearly in half. This is especially valuable in mobile networks, Wi-Fi deployments, and environments with frequent client reconnections.

---

## Standard vs. Rapid Commit Exchange

### Standard 4-Message Exchange

```text
Client                    Server
  |                          |
  |--- Solicit ------------->|
  |<-- Advertise ------------|
  |--- Request ------------->|
  |<-- Reply (address) ------|
```

### Rapid Commit 2-Message Exchange

```text
Client                    Server
  |                          |
  |--- Solicit (rapid-commit)->|
  |<-- Reply (address) -------|
```

Both server and client must support Rapid Commit. If the server does not support it, it falls back to the standard exchange.

---

## Enabling Rapid Commit on ISC DHCP Server

```text
# /etc/dhcp/dhcpd6.conf

# Enable Rapid Commit
option dhcp6.rapid-commit;

subnet6 2001:db8::/32 {
    range6 2001:db8::100 2001:db8::500;
    option dhcp6.name-servers 2001:db8::53;
}
```

### Global Enable

```text
# Apply to all subnets
default-lease-time 86400;
max-lease-time 172800;
option dhcp6.rapid-commit;
```

---

## Enabling Rapid Commit in Kea DHCPv6

```json
{
  "Dhcp6": {
    "subnet6": [
      {
        "subnet": "2001:db8::/32",
        "rapid-commit": true,
        "pools": [
          { "pool": "2001:db8::100-2001:db8::500" }
        ],
        "option-data": [
          { "name": "dns-servers", "data": "2001:db8::53" }
        ]
      }
    ]
  }
}
```

### Shared-Network Rapid Commit in Kea

```json
{
  "Dhcp6": {
    "shared-networks": [
      {
        "name": "example-v6",
        "rapid-commit": true,
        "subnet6": [
          {
            "subnet": "2001:db8::/32",
            "pools": [
              { "pool": "2001:db8::100-2001:db8::500" }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Enabling Rapid Commit on Linux Clients

### dhclient

```text
# /etc/dhcp/dhclient6.conf
interface "eth0" {
    send dhcp6.rapid-commit;
    request dhcp6.name-servers, dhcp6.domain-search;
}
```

### systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv6

[DHCPv6]
RapidCommit=yes
```

---

## Verifying Rapid Commit in Packet Captures

```bash
# Capture DHCPv6 traffic
sudo tcpdump -i eth0 -vv udp port 546 or udp port 547

# In Wireshark - filter for Rapid Commit option
# dhcpv6.option.type == 14

# Expected sequence when Rapid Commit is active:
# 1. Solicit with option 14 (Rapid Commit)
# 2. Reply (skipping Advertise and Request)
```

---

## Use Cases for Rapid Commit

| Environment | Benefit |
|-------------|---------|
| Wi-Fi networks | Faster reassociation after roaming |
| Mobile/LTE | Reduced connection latency |
| IoT devices | Faster boot-to-network time |
| VDI/Virtual Desktops | Quicker VM network ready state |
| High-churn networks | Reduced server load from 4-way handshakes |

---

## Considerations and Caveats

1. **Both sides must opt in** - if the client sends Rapid Commit but the server doesn't respond with it, the server should fall back to standard exchange
2. **Single server environments** - Rapid Commit works best when there's one server (avoids duplicate assignment race conditions)
3. **HA environments** - ensure both HA nodes are configured identically for Rapid Commit
4. **Address conflicts** - clients still perform Duplicate Address Detection and can send Decline after a Reply, but Rapid Commit commits the lease immediately on the server

---

## Best Practices

1. **Enable on all applicable scopes** in single-server deployments for maximum benefit
2. **Test with packet capture** to confirm the 2-message exchange is occurring
3. **Monitor lease database** for any duplicate address issues after enabling
4. **Prefer designs where only one server responds** to a given Solicit to reduce unused committed leases
5. **Enable on both server and client** - half-configured deployments fall back to standard exchange

---

## Conclusion

DHCPv6 Rapid Commit is a simple configuration change that cuts address assignment latency in half by eliminating the Advertise and Request messages. Enable it on both server and client, verify with packet captures, and enjoy faster client connectivity especially in high-churn or mobile environments.

---

*Monitor network connectivity and DHCP performance with [OneUptime](https://oneuptime.com) - real-time uptime monitoring with full IPv6 support.*
