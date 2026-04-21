# How to Troubleshoot DHCP Discovery Broadcast Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, DHCP, Broadcast, Troubleshooting, Linux, IPv4

Description: Diagnose and fix DHCP Discovery failures where clients cannot obtain an IP address, by capturing broadcast traffic, checking relay agents, and verifying DHCP server scope configuration.

## Introduction

When a DHCP client fails to get an IP address, the root cause is often a DHCP message path problem - the Discover packet never reaching the server or relay, or the server's Offer never reaching the client. This guide provides a systematic approach to isolating the fault.

## DHCP Four-Way Handshake

```text
Client → Broadcast:  DHCP Discover  (src 0.0.0.0, dst 255.255.255.255)
Server → Client:     DHCP Offer     (unicast or broadcast)
Client → Broadcast:  DHCP Request   (broadcast with chosen server)
Server → Client:     DHCP ACK       (unicast or broadcast)
```

## Step 1: Capture on the Client Interface

```bash
# On the client - capture DHCP traffic on the client interface

sudo tcpdump -i eth0 -n -v "udp port 67 or udp port 68"

# Then trigger a DHCP request
sudo dhclient -v eth0
```

If you see a Discover but no Offer, the server is not responding or the Offer is not making it back to the client.

If you see no Discover at all, check that the interface is up:

```bash
ip link show eth0
```

## Step 2: Manually Send a DHCP Discover

```bash
# Force a DHCP request on eth0
sudo dhclient -v -r eth0   # Release
sudo dhclient -v eth0      # Request
```

Look for the full four-step exchange in the output.

## Step 3: Check If the DHCP Server Receives the Discover

On the DHCP server:

```bash
# Capture DHCP on the server's interface
sudo tcpdump -i eth0 -n "udp port 67"
```

If the server never sees a Discover or relayed request, the packet is being dropped before it reaches the server, or the relay is missing or misconfigured.

## Step 4: Check the DHCP Relay Agent

If client and server are on different subnets, verify the relay agent:

```bash
# On the relay host - confirm it is forwarding
sudo journalctl -u isc-dhcp-relay -f

# Capture to confirm relay is forwarding to the server
sudo tcpdump -i eth1 -n -l -vvv -s0 "udp port 67" | grep -E "giaddr|Gateway-IP"
```

The `giaddr` field (shown as `Gateway-IP` by some tcpdump versions) must be set to the relay's IP on the client subnet in packets forwarded to the server. If relayed packets sent to the server still show `0.0.0.0`, the relay is not setting the field correctly.

## Step 5: Check DHCP Server Scope

```bash
# On isc-dhcp-server - get a rough count of active lease records
sudo grep -c "binding state active" /var/lib/dhcp/dhcpd.leases

# Check the server's error log
sudo journalctl -u isc-dhcp-server -u dhcpd -n 50

# Verify the subnet declaration matches the client's subnet
grep -A 5 "subnet" /etc/dhcp/dhcpd.conf
```

A common error is a missing or wrong `subnet` declaration - `dhcpd` needs a matching subnet declaration and address range before it can dynamically allocate leases for that subnet. The lease file is log-structured, so treat the active-record count as a rough signal and confirm exhaustion in the server log.

## Step 6: Check iptables on Server and Router

```bash
# Ensure DHCP ports are not blocked
sudo iptables -L INPUT -n -v | grep -E "67|68"
sudo iptables -L FORWARD -n -v | grep -E "67|68"

# Allow DHCP if blocked on the server
sudo iptables -I INPUT  -p udp --dport 67 -j ACCEPT
sudo iptables -I OUTPUT -p udp --sport 67 -j ACCEPT

# On a relay/router, allow forwarded DHCP requests and replies
sudo iptables -I FORWARD -p udp --dport 67 -j ACCEPT
sudo iptables -I FORWARD -p udp --sport 67 -j ACCEPT
```

## Step 7: Verify DHCP Server Is Listening

```bash
# Confirm dhcpd has a DHCPv4 socket open
sudo ss -ulnp | grep 67
```

Expected output:
```text
UNCONN 0 0 0.0.0.0:67 0.0.0.0:* users:(("dhcpd",pid=1234,fd=7))
```

## Common Root Causes

| Symptom | Likely Cause |
|---|---|
| No Discover seen on server | Missing relay, or ACL blocking port 67 |
| Discover seen, no Offer | No matching subnet scope in dhcpd.conf |
| Offer sent, client ignores it | Offer not reaching the client, client-side filtering, or transaction/client ID mismatch |
| Pool exhausted | Too many leases, not enough range |

## Conclusion

Start at the client and capture the Discover. Then verify it reaches the relay and the server. Check scopes, iptables rules, and the server log. Common DHCP discovery failures are due to a missing relay, a misconfigured subnet scope, or a firewall blocking DHCP traffic.
