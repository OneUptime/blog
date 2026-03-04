# How to Troubleshoot DHCP Server Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Troubleshooting, Networking, SysAdmin

Description: Diagnose and fix common DHCP server problems on Ubuntu including clients not getting addresses, exhausted pools, relay issues, and service startup failures.

---

DHCP problems have a way of causing widespread outages - when clients can't get addresses, they can't connect to anything. The troubleshooting approach depends on whether the issue is with the DHCP server itself, the network path between client and server, or a configuration problem with the lease pool.

This guide covers systematic DHCP troubleshooting for Ubuntu servers running ISC DHCP or ISC Kea.

## Identifying the Problem Type

Start by answering a few questions to narrow down the cause:

- Can the DHCP server process bind to the network interface?
- Are clients on the same subnet as the server, or going through a relay?
- Are clients getting no address at all, or getting a wrong/unexpected address?
- Is the problem affecting all clients or specific ones?
- Did this used to work? What changed?

## Checking Service Status

The first check is always whether the DHCP service is actually running:

```bash
# For ISC DHCP
sudo systemctl status isc-dhcp-server

# For ISC Kea
sudo systemctl status kea-dhcp4-server

# Check if the service failed to start
sudo journalctl -u isc-dhcp-server --since "1 hour ago"
sudo journalctl -u kea-dhcp4-server --since "1 hour ago"
```

Common failure messages and their meanings:

```text
No subnet declaration for eth0 (192.168.2.50)
```

This means DHCP is running on an interface, but there's no subnet in the configuration that includes that interface's IP address. Either add a subnet declaration or restrict which interfaces DHCP listens on.

```text
Can't create PID file /var/run/dhcp-server/dhcpd.pid: Permission denied.
```

A permissions problem on the PID file directory. Fix with:

```bash
sudo chown dhcpd:dhcpd /var/run/dhcp-server/
```

```text
Not configured to listen on any interfaces!
```

The `INTERFACES` variable in `/etc/default/isc-dhcp-server` is empty or pointing to interfaces that don't exist.

## Verifying Configuration Syntax

Always validate configuration before digging further:

```bash
# Test ISC DHCP configuration
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf

# Test Kea configuration
sudo kea-dhcp4 -t /etc/kea/kea-dhcp4.conf

# Kea JSON validation (catch JSON syntax errors)
python3 -m json.tool /etc/kea/kea-dhcp4.conf > /dev/null && echo "Valid JSON"
```

## Problem: Clients Not Receiving Any Address

### Step 1: Capture DHCP Traffic

Use `tcpdump` to see if the server is receiving client requests:

```bash
# Watch for DHCP traffic on the server's primary interface
sudo tcpdump -n -i eth0 port 67 or port 68 -v
```

Filter output for relevant messages:

- `DHCPDISCOVER`: Client is looking for a server
- `DHCPOFFER`: Server is offering an address
- `DHCPREQUEST`: Client is requesting the offered address
- `DHCPACK`: Server confirming the assignment
- `DHCPNAK`: Server rejecting the request
- `DHCPRELEASE`: Client releasing its lease

If you see DISCOVER but no OFFER, the server is receiving requests but not responding. If you don't see DISCOVER at all, the packets aren't reaching the server (firewall or relay issue).

### Step 2: Check the Listening Interface

Confirm DHCP is listening on the correct interface:

```bash
# Check what ports dhcpd is listening on
sudo ss -ulnp | grep dhcpd

# Check the interface configuration in ISC DHCP
grep -i interface /etc/default/isc-dhcp-server

# Verify the interface exists and is up
ip link show eth0
ip addr show eth0
```

### Step 3: Check the Subnet Configuration

The DHCP server only serves addresses to clients on subnets it knows about. The client's source subnet (or the giaddr from a relay) must match a configured subnet:

```bash
# Review subnet declarations
grep -A 10 "subnet" /etc/dhcp/dhcpd.conf

# For Kea
python3 -c "
import json
with open('/etc/kea/kea-dhcp4.conf') as f:
    config = json.load(f)
for subnet in config['Dhcp4']['subnet4']:
    print(f\"Subnet: {subnet['subnet']}\")
    for pool in subnet.get('pools', []):
        print(f\"  Pool: {pool['pool']}\")
"
```

### Step 4: Pool Exhaustion

If the pool is full, clients will get a DHCPNAK or simply no response:

```bash
# Count active leases in ISC DHCP
grep -c "binding state active" /var/lib/dhcp/dhcpd.leases

# Find expired leases that haven't been cleaned up
grep "binding state expired" /var/lib/dhcp/dhcpd.leases | wc -l

# See the oldest active leases (potentially stale)
awk '
/^lease / { ip = $2 }
/starts / { starts = $3 " " $4; sub(/;/, "", starts) }
/binding state active/ { print starts, ip }
' /var/lib/dhcp/dhcpd.leases | sort | head -20
```

If the pool is exhausted, you have a few options:
1. Expand the pool range (if IPs are available)
2. Reduce the lease time to free addresses faster
3. Find and remove stale leases

```bash
# Force the ISC DHCP server to clean up expired leases
sudo systemctl stop isc-dhcp-server

# The lease file can be cleaned by stopping the service
# and removing the backup file (dhcpd.leases~)
sudo rm /var/lib/dhcp/dhcpd.leases~

sudo systemctl start isc-dhcp-server
```

## Problem: Relay Agent Not Forwarding

When clients are on a different subnet and using a relay:

```bash
# On the relay agent - check if it's running
sudo systemctl status isc-dhcp-relay

# Check what the relay is listening on
sudo ss -ulnp | grep dhcrelay

# Capture traffic on the client-facing interface
sudo tcpdump -n -i eth1 port 67 or port 68

# Capture traffic on the server-facing interface
sudo tcpdump -n -i eth0 port 67 host 192.168.1.10
```

If you see broadcasts on eth1 but nothing on eth0, the relay isn't forwarding. Check:

```bash
# IP forwarding must be enabled
sysctl net.ipv4.ip_forward
# Should return 1

# Check the relay configuration
cat /etc/default/isc-dhcp-relay
```

On the DHCP server, check that a subnet exists for the remote subnet:

```bash
# Look for subnet matching the relay's giaddr
grep "subnet 192.168.20" /etc/dhcp/dhcpd.conf
```

## Problem: Wrong Address Assigned

If clients are getting addresses from the wrong pool, check:

```bash
# Look for conflicting subnet declarations
grep "subnet" /etc/dhcp/dhcpd.conf

# Check if there's a reservation with the wrong IP
grep -A 5 "hardware ethernet aa:bb:cc:dd:ee:01" /etc/dhcp/dhcpd.conf
```

If a client had a previous lease for a different IP, it will try to renew that IP. The server will send a DHCPNAK if the old IP isn't available in the current subnet:

```bash
# Find client's current lease entry
grep -A 8 "aa:bb:cc:dd:ee:01" /var/lib/dhcp/dhcpd.leases
```

## Problem: DHCP Service Fails After Configuration Change

After modifying the configuration:

```bash
# Validate before restarting
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf

# If valid, restart and check status
sudo systemctl restart isc-dhcp-server
sudo systemctl status isc-dhcp-server

# If it fails, check the full error output
sudo journalctl -u isc-dhcp-server -n 50 --no-pager
```

## Checking for Rogue DHCP Servers

If clients are getting unexpected addresses, there may be a rogue DHCP server on the network:

```bash
# Install dhcpdump
sudo apt install -y dhcpdump

# Look for DHCPOFFER packets - multiple different sources indicate a rogue server
sudo tcpdump -n port 67 or port 68

# A more targeted approach - send a DHCP discover and watch for all offers
sudo dhcping -s 255.255.255.255 -c 192.168.1.1 -h aa:bb:cc:dd:ee:ff 2>&1
```

## Kea-Specific Troubleshooting

For Kea DHCP servers:

```bash
# Check Kea logs
sudo tail -f /var/log/kea/kea-dhcp4.log

# Increase log verbosity temporarily
# Edit /etc/kea/kea-dhcp4.conf and change severity to DEBUG

# Use the API to check server status
curl -s -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "config-get", "service": ["dhcp4"]}' \
  | python3 -m json.tool

# List all leases for a specific MAC
curl -s -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{
    "command": "lease4-get-by-hw-address",
    "service": ["dhcp4"],
    "arguments": {"hwaddr": "aa:bb:cc:dd:ee:01"}
  }' | python3 -m json.tool

# Delete a stale lease
curl -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{
    "command": "lease4-del",
    "service": ["dhcp4"],
    "arguments": {"ip-address": "192.168.1.105"}
  }'
```

## Firewall-Related DHCP Issues

DHCP uses broadcast packets on UDP ports 67 and 68. Firewall rules can silently block these:

```bash
# Check UFW rules
sudo ufw status verbose | grep -i dhcp

# Allow DHCP traffic
sudo ufw allow 67/udp
sudo ufw allow 68/udp

# Check iptables directly
sudo iptables -L INPUT -n -v | grep -E "67|68"
```

## Client-Side Verification

Sometimes the problem is on the client, not the server:

```bash
# On the client - force a new DHCP request
sudo dhclient -v -r eth0  # Release current lease
sudo dhclient -v eth0     # Request new lease

# Check the client's DHCP lease file
cat /var/lib/dhcp/dhclient.leases

# Send a manual DHCP discover using nmap
sudo apt install -y nmap
sudo nmap --script broadcast-dhcp-discover
```

The broadcast-dhcp-discover script shows any DHCP server responding on the network, which helps confirm the server is reachable and responding.

Systematic DHCP troubleshooting starts with confirming the service is running, then checking that packets are flowing (tcpdump), then verifying the configuration matches the network topology. Most issues fall into one of these categories and are straightforward to fix once you can see where in the process things break down.
