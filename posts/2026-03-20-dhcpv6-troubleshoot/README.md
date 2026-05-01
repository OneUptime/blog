# How to Troubleshoot DHCPv6 Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Troubleshooting, Networking, tcpdump, Wireshark, Kea

Description: A practical guide to diagnosing and fixing common DHCPv6 problems including clients not getting addresses, relay failures, DNS not delivered, and lease exhaustion.

---

DHCPv6 problems can be subtle because they often occur silently - the client falls back to SLAAC or link-local addresses without obvious errors. This guide provides systematic troubleshooting steps for the most common DHCPv6 issues.

---

## Troubleshooting Checklist

Before diving in, verify these basics:

```bash
# 1. Is IPv6 enabled on the interface?

ip -6 addr show eth0

# 2. Is there a link-local address?
ip -6 addr show eth0 | grep "fe80"

# 3. Is the on-link DHCPv6 multicast group reachable?
ping6 -c 1 ff02::1:2%eth0  # All DHCPv6 relay agents and servers

# 4. Is DHCPv6 traffic flowing?
sudo tcpdump -i eth0 'udp port 546 or udp port 547'
```

---

## Issue 1: Client Not Receiving an IPv6 Address

### Symptoms
- Only link-local address (fe80::) on interface
- No global unicast address

### Diagnosis

```bash
# Check Router Advertisements - is M flag set?
rdisc6 eth0
# Look for the RA managed/stateful address configuration flag

# Check DHCPv6 client logs
journalctl -u systemd-networkd | grep -i dhcp6
journalctl -b | grep -Ei 'dhcp6|dhcpv6'

# Manually request an address
sudo dhclient -6 -v eth0
```

### Fixes

```bash
# Fix 1: Ensure your DHCPv6-capable client is configured and running
sudo systemctl restart systemd-networkd  # if you use systemd-networkd

# Fix 2: Check RA flags on router
# Router should advertise M=1 when hosts are expected to use stateful DHCPv6

# Fix 3: Verify server is running
sudo systemctl status kea-dhcp6-server
sudo systemctl status isc-dhcp-server6
```

---

## Issue 2: DHCPv6 Relay Not Forwarding

### Symptoms
- Clients on remote subnets get no address
- Server logs show no incoming requests

### Diagnosis

```bash
# On relay host - check if dhcrelay is running
pgrep -af 'dhcrelay.*-6'

# Capture on client-facing interface
sudo tcpdump -i eth1 'udp port 546 or udp port 547'

# Capture on server-facing interface
sudo tcpdump -i eth0 'udp port 546 or udp port 547'

# Verify server has subnet matching client prefix
grep "subnet6" /etc/dhcp/dhcpd6.conf
```

### Fixes

```bash
# Fix 1: Restart relay (service name may vary by distro)
sudo systemctl restart isc-dhcp-relay6

# Fix 2: Allow DHCPv6 to the relay/server host firewall
sudo ip6tables -A INPUT -p udp --dport 547 -j ACCEPT
sudo ip6tables -A OUTPUT -p udp --sport 547 -j ACCEPT

# Fix 3: Add missing subnet to server config
# subnet6 2001:db8:2::/64 { range6 ...; }
```

---

## Issue 3: DNS Not Delivered to Clients

### Symptoms
- Client has IPv6 address
- `/etc/resolv.conf` has no IPv6 name servers

### Diagnosis

```bash
# Check server config has dns-servers option
grep "name-servers\|dns-server" /etc/dhcp/dhcpd6.conf
grep -A5 "option-data" /etc/kea/kea-dhcp6.conf

# Check client request policy (ISC dhclient requests DNS by default unless overridden)
grep "request\|also request" /etc/dhcp/dhclient.conf

# Capture Reply and check for option 23
sudo tcpdump -i eth0 -vv udp port 546 | grep -A20 -i "reply"
```

### Fixes

```bash
# Add DNS option to server
# ISC DHCP:
# option dhcp6.name-servers 2001:db8::53;

# Kea:
# { "name": "dns-servers", "data": "2001:db8::53" }

# Restart server
sudo systemctl restart kea-dhcp6-server
```

---

## Issue 4: Address Pool Exhausted

### Symptoms
- New clients can't get addresses
- Server logs: "no available addresses"

### Diagnosis

```bash
# ISC DHCP - check leases file
wc -l /var/lib/dhcp/dhcpd6.leases
grep "binding state active" /var/lib/dhcp/dhcpd6.leases | wc -l

# Kea Control Agent/API (requires the lease_cmds hook library)
curl -X POST -H "Content-Type: application/json" \
  -d '{"command":"lease6-get-all","service":["dhcp6"]}' \
  http://localhost:8000/ | python3 -m json.tool

# Check for stale leases (clients that are gone)
grep "ends" /var/lib/dhcp/dhcpd6.leases
```

### Fixes

```bash
# Expand the address pool
# subnet6 2001:db8::/64 {
#   range6 2001:db8::100 2001:db8::5000;
# }

# Reduce lease time to reclaim faster
# default-lease-time 3600;
# max-lease-time 7200;

# Remove stale leases (ISC DHCP)
sudo systemctl stop isc-dhcp-server6
# Edit /var/lib/dhcp/dhcpd6.leases and remove expired entries
sudo systemctl start isc-dhcp-server6
```

---

## Issue 5: Duplicate Address Assignment

### Symptoms
- Two clients get the same address
- Connectivity issues for both

### Diagnosis

```bash
# Check for duplicate leases
awk '/iaaddr / {print $2}' /var/lib/dhcp/dhcpd6.leases | sort | uniq -d

# Use DAD (Duplicate Address Detection)
ip -6 monitor address | grep "dadfailed"

# Watch for a neighbor entry flapping between MAC addresses
ip -6 monitor neigh
```

### Fix

```bash
# Re-enable DAD on the interface if it was disabled
sudo sysctl -w net.ipv6.conf.eth0.dad_transmits=1

# On server - clear conflicting lease
# ISC DHCP: remove the entry from dhcpd6.leases and restart
```

---

## Packet Capture Analysis

```bash
# Full DHCPv6 conversation capture
sudo tcpdump -i eth0 -w /tmp/dhcpv6.pcap 'udp port 546 or udp port 547'

# Read capture
tcpdump -r /tmp/dhcpv6.pcap -vv

# Message types in output:
# msg-type: solicit (1)
# msg-type: advertise (2)
# msg-type: request (3)
# msg-type: reply (7)
```

---

## Wireshark Filters

| Filter | Purpose |
|--------|---------|
| `dhcpv6` | All DHCPv6 traffic |
| `dhcpv6.msgtype == 1` | Solicit only |
| `dhcpv6.msgtype == 7` | Reply only |
| `dhcpv6.option.type == 23` | DNS server option |
| `dhcpv6.option.type == 14` | Rapid Commit option |

---

## Best Practices for Prevention

1. **Monitor pool utilization** - alert at 80% full
2. **Set appropriate lease times** - shorter for dynamic environments
3. **Use DHCPv6 failover/HA** to eliminate single points of failure
4. **Log all DHCPv6 events** to a centralized syslog server
5. **Test relay configuration** after any network change

---

## Conclusion

DHCPv6 troubleshooting follows a logical path from client to relay to server. Packet captures with `tcpdump` or Wireshark are the most reliable diagnostic tool. Fix issues at the right layer - client, relay, or server - and always verify with a fresh DHCP request.

---

*Monitor your network's IPv6 health with [OneUptime](https://oneuptime.com) - real-time uptime monitoring with alerting.*
