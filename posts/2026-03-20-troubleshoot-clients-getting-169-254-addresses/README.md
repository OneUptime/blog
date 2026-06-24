# How to Troubleshoot Clients Getting 169.254.x.x Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, APIPA, Troubleshooting, Networking, 169.254, Network Diagnostics

Description: When a client shows a 169.254.x.x address, it failed to obtain a DHCP lease and fell back to Automatic Private IP Addressing (APIPA), indicating a DHCP communication problem that requires...

## Why 169.254.x.x Appears

1. DHCP server is down or unreachable.
2. DHCP pool is exhausted (no free addresses).
3. Network cable unplugged or switch port issue.
4. VLAN misconfiguration (client on wrong VLAN).
5. Firewall blocking UDP ports 67/68.
6. DHCP relay agent not relaying client requests.

## Diagnostic Steps

### Step 1: Verify Physical/Layer-2 Connectivity

```bash
ip link show eth0
# Should show "state UP"

sudo ip link set eth0 up

ip -s link show eth0
# Look for TX/RX errors

```

### Step 2: Attempt a Manual DHCP Request

```bash
# Verbose output - shows DHCP exchange details
sudo dhclient -v eth0

# Capture to verify traffic is sent
sudo tcpdump -i eth0 'port 67 or port 68' -n
```

### Step 3: Check VLAN Assignment

```bash
# Verify the switch port VLAN (requires switch access)
# From client, confirm what you can see:
sudo tcpdump -i eth0 -e 'port 67' | head -5
```

### Step 4: Test DHCP Server Directly

```bash
# Send a DHCP discover manually
sudo nmap --script broadcast-dhcp-discover -e eth0

# If server responds from the server's VLAN but not the client's,
# the problem is VLAN or relay agent configuration
```

### Step 5: Check DHCP Pool Exhaustion

```bash
# On an ISC DHCP server - count current active leases
awk '
  /^lease / { ip=$2; state="" }
  /^[[:space:]]*binding state / { state=$3; sub(/;$/, "", state) }
  /^}/ && ip { leases[ip]=state; ip="" }
  END { for (ip in leases) if (leases[ip]=="active") active++; print active+0 }
' /var/lib/dhcp/dhcpd.leases
# Compare current active leases to pool size; if equal, pool is exhausted
```

### Step 6: Verify Firewall Rules

```bash
# On DHCP server
sudo iptables -L INPUT -n | grep -E "67|68"

# Allow DHCP requests to the server if blocked
sudo iptables -A INPUT -p udp --dport 67 -j ACCEPT

# On a DHCP client firewall, replies arrive on UDP destination port 68
sudo iptables -A INPUT -p udp --dport 68 -j ACCEPT
```

## Quick Fix Checklist

- [ ] Is the cable plugged in and link up?
- [ ] Is the switch port on the correct VLAN?
- [ ] Is the DHCP service running (`systemctl status isc-dhcp-server` or your DHCP daemon)?
- [ ] Is the DHCP pool exhausted?
- [ ] Is the firewall blocking UDP 67/68?
- [ ] Is the relay agent working (if multi-VLAN)?

## Key Takeaways

- 169.254.x.x usually means IPv4 link-local/APIPA after DHCP failed. Local-only connectivity, no internet access.
- `dhclient -v eth0` is a useful first diagnostic when ISC dhclient is installed - it shows DHCP exchange details.
- Check for pool exhaustion before assuming the server is down.
- VLAN misconfigurations are a common root cause in enterprise environments.
