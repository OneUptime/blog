# How to Understand the 255.255.255.255 Limited Broadcast Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Broadcast, IPv4, DHCP, Network Fundamentals

Description: Understand why 255.255.255.255 is called the limited broadcast address, how it differs from subnet-specific directed broadcasts, and which protocols depend on it.

## Introduction

`255.255.255.255` is the **limited broadcast address** in IPv4 - a special destination that means "send to every host on the directly-connected network segment." The word "limited" refers to the fact that routers never forward it. It is the safest kind of broadcast because its scope is always constrained to one link.

## Why It Exists

IPv4 addresses include a subnet component. When a host has no IP configuration yet (e.g., during boot), it cannot compute the subnet's directed broadcast address because it does not know its subnet mask. The solution is `255.255.255.255` - a broadcast that works without any IP context.

## Who Uses 255.255.255.255?

| Protocol | Why It Uses Limited Broadcast |
|---|---|
| DHCP Discover | Client has no IP yet; must broadcast to find a server |
| DHCP Request | Client has a proposed IP but has not confirmed it |
| BOOTP | Legacy network boot protocol |
| WoL (Wake-on-LAN) | Often sent to 255.255.255.255 on port 9 |
| NetBIOS Name Query | Windows name resolution on segments without WINS |

## Router Behavior

Every IP router discards packets with destination `255.255.255.255`. This behavior is defined by RFC 919 and cannot be overridden through normal configuration. No routing table lookup occurs - the packet is simply dropped on ingress.

```bash
# Confirm: a packet to 255.255.255.255 does not appear on a different subnet

# On Router eth0 (192.168.1.0/24 side) - send a broadcast
echo "test" | socat - UDP-DATAGRAM:255.255.255.255:9999,broadcast

# On Router eth1 (192.168.2.0/24 side) - should receive nothing
sudo tcpdump -i eth1 -n "dst 255.255.255.255"
# 0 packets captured
```

## Capturing Limited Broadcasts

```bash
# Watch all limited broadcast traffic on the local segment
sudo tcpdump -i eth0 -n "dst 255.255.255.255"
```

Typical traffic visible:
- `0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP Discover`
- UDP packets to port 9 (WoL)
- Occasionally NetBIOS or legacy application broadcasts

## Responding to 255.255.255.255

A server receiving a packet to `255.255.255.255` cannot always determine which interface it arrived on without using `IP_PKTINFO`. In DHCP, the server examines the source IP (still `0.0.0.0` for new clients) and uses the `giaddr` field from a relay agent to identify the subnet.

For ISC DHCP, the daemon is pinned to specific interfaces by passing them on the command line (`dhcpd eth1`) or via the service file - on Debian/Ubuntu, set `INTERFACESv4="eth1"` in `/etc/default/isc-dhcp-server`. Inside `/etc/dhcp/dhcpd.conf`, every directly-attached subnet must still be declared (an empty declaration is allowed for subnets you do not wish to serve):

```text
# Declared but not served
subnet 192.168.1.0 netmask 255.255.255.0 {
}

subnet 192.168.2.0 netmask 255.255.255.0 {
  range 192.168.2.100 192.168.2.200;
  option routers 192.168.2.1;
}
```

## Difference from Directed Broadcast

| Feature | 255.255.255.255 | 192.168.1.255 (Directed) |
|---|---|---|
| Name | Limited broadcast | Directed broadcast |
| Router forwarded? | Never | Optional (usually disabled) |
| Requires IP config? | No | Yes |
| Used by DHCP? | Yes | No |

## Conclusion

`255.255.255.255` is a link-scoped broadcast that enables services like DHCP to work before a host has an IP address. Its non-routability is a security feature, not a limitation. Understanding it helps clarify why DHCP relay agents exist and how they bridge the gap between subnets.
