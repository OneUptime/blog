# How to Troubleshoot DHCPv6 Relay Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, Relay, Troubleshooting, Diagnostic, Networking

Description: Troubleshoot common DHCPv6 relay problems including clients not getting addresses, relay dropping messages, and server not responding.

## Common DHCPv6 Relay Problems

| Symptom | Most Likely Cause |
|---|---|
| Client never gets an IA_NA address | No relay path or RA M-flag not set |
| Relay forwards but no RELAY-REPL response | Server unreachable or misconfigured |
| Wrong address from wrong pool | Wrong relay link-address or Option 18 (Interface-Id) |
| Intermittent failures | Relay dropping under load |
| Address assigned then lost | Short lease or renew/rebind path failure |

## Problem 1: Clients Not Receiving Addresses

```bash
#!/bin/bash
# diagnose-no-address.sh - Run on relay agent

echo "=== DHCPv6 Relay Diagnosis ==="

# 1. Is relay daemon running?

if systemctl is-active --quiet dhcrelay6 || systemctl is-active --quiet isc-dhcp-relay6; then
    echo "PASS: Relay daemon running"
else
    echo "FAIL: Relay daemon not running"
    echo "Fix: systemctl start dhcrelay6 (or your distro's DHCPv6 relay service)"
fi

# 2. Is relay listening on UDP 547?
if ss -6 -ulnp | grep -q ":547"; then
    echo "PASS: Listening on UDP 547"
else
    echo "FAIL: Not listening on UDP 547"
    echo "Fix: Check relay configuration and restart"
fi

# 3. Is multicast group joined?
if ip -6 maddr show eth0 | grep -q ff02::1:2; then
    echo "PASS: Multicast ff02::1:2 joined on eth0"
else
    echo "FAIL: Multicast not joined on eth0"
    echo "Fix: Bring up eth0 and restart relay"
fi

# 4. Is server reachable?
if ping6 -c 3 -W 2 2001:db8::10 &>/dev/null; then
    echo "PASS: DHCPv6 server reachable"
else
    echo "FAIL: Server 2001:db8::10 unreachable"
    echo "Fix: Check IPv6 routing to server"
fi

# 5. Router Advertisement flags on client interface
echo "INFO: Capture Router Advertisements and verify the managed address flag:"
echo "      tcpdump -i eth0 -c 5 -n -vv 'icmp6 and ip6[40] == 134'"
```

## Problem 2: Relay Receiving But Not Forwarding

```bash
# Capture to verify relay is receiving SOLICITs
tcpdump -i eth0 -c 10 -n 'udp port 547'
# Should see: IP6 fe80::client > ff02::1:2: dhcp6 solicit

# Check if relay-forw is being sent out server interface
tcpdump -i eth1 -c 10 -n 'udp port 547'
# Should see: IP6 relay-addr > dhcp-server-addr: dhcp6 relay-forw

# If receiving but not forwarding - check:
# 1. Is the server address correct?
grep -r "dhcp-server" /etc/dhcp/ /etc/wide-dhcpv6/ 2>/dev/null

# 2. Is server interface up?
ip link show eth1

# 3. Is there a route to the server?
ip -6 route get 2001:db8::10
```

## Problem 3: Wrong Address Pool Assigned

```bash
# Verify relay link-address matches server subnet configuration

# Check what link-address the relay is using
tcpdump -i eth1 -n -vv 'udp port 547' | grep "linkaddr"

# Expected: relay sends linkaddr=2001:db8:1::1 (its client-facing address)
# Server should have a subnet matching this address range

# If wrong: check relay configuration
# ISC dhcrelay: the link-address defaults to the first non-link-local
# address on the lower (client-facing) interface unless specified explicitly
# ISC Kea server: validate the config and check if subnet matches relay's link-address
kea-dhcp6 -t /etc/kea/kea-dhcp6.conf
grep -n '"subnet"[[:space:]]*:' /etc/kea/kea-dhcp6.conf
```

## Problem 4: Relay Dropping Messages

```bash
# Check relay error counters
# Cisco IOS
# show ipv6 dhcp relay statistics | include [Dd]rop

# Linux - check if relay is hitting resource limits
# Increase relay process limits
for pid in $(pgrep dhcrelay); do
    echo "dhcrelay PID ${pid}"
    grep "Max open files" /proc/${pid}/limits
done
# If too low: increase ulimit

# Check for duplicate relay configuration
# (Two relay processes on same interface = drops)
pgrep -a dhcrelay

# Check iptables isn't blocking relay
ip6tables -L -n -v | grep DROP | grep 547
```

## Problem 5: Relay Appears Working But Server Has No Bindings

```bash
# This usually means relay is sending to wrong server address
# or server is rejecting relayed messages

# On server: enable debug logging (ISC Kea)
# Set log level to DEBUG in kea-dhcp6.conf
# journalctl -u kea-dhcp6 -u isc-kea-dhcp6-server -f | grep -E "RELAY|subnet|query"

# Common cause: server doesn't have a subnet matching relay link-address
# Server needs: subnet matching the relay's link-address

# Example: relay has link-address 2001:db8:1::1
# Server kea-dhcp6.conf must have a subnet matching the link-address:
# {
#   "subnet": "2001:db8:1::/64"
# }
#
# Add "relay": {"ip-addresses": ["3000::1"]} only when the relay
# link-address does not belong to the subnet being served.

# Check Kea logs for subnet selection failures
journalctl -u kea-dhcp6 -u isc-kea-dhcp6-server | grep -E "DHCP6_SUBNET_SELECTION_FAILED|failed to select subnet|no subnet"
```

## Quick Diagnostic Script

```bash
#!/bin/bash
# quick-dhcpv6-relay-check.sh

RELAY_IFACE=${1:-eth0}
SERVER_ADDR=${2:-"2001:db8::10"}

PASS=0; FAIL=0

check() {
    local MSG=$1; local CMD=$2
    if eval "${CMD}" &>/dev/null; then
        echo "  PASS: ${MSG}"; ((PASS++))
    else
        echo "  FAIL: ${MSG}"; ((FAIL++))
    fi
}

check "Relay listening UDP 547" "ss -6 -ulnp | grep ':547'"
check "Interface ${RELAY_IFACE} up" "ip link show ${RELAY_IFACE} | grep -q UP"
check "Multicast ff02::1:2 joined" "ip -6 maddr show ${RELAY_IFACE} | grep ff02::1:2"
check "Server ${SERVER_ADDR} reachable" "ping6 -c 2 -W 3 ${SERVER_ADDR}"
check "IPv6 forwarding enabled if relay is also the router" "[ \$(sysctl -n net.ipv6.conf.all.forwarding) -eq 1 ]"

echo ""
echo "Result: ${PASS} passed, ${FAIL} failed"
```

## Conclusion

DHCPv6 relay troubleshooting proceeds from client to relay to server. Verify each link in the chain with `tcpdump`: client SOLICIT → relay RELAY-FORW → server RELAY-REPL → client ADVERTISE/REPLY. The most common issues are: relay daemon not running, server unreachable due to missing IPv6 route, incorrect server subnet configuration (server doesn't have a subnet matching the relay's link-address), and firewall blocking UDP 547. The quick diagnostic script automates the most common checks.
