# How to Detect Rogue DHCP Servers on Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Rogue Server, Network Security, Monitoring, Sysadmin

Description: Rogue DHCP servers can redirect client traffic by providing malicious gateway or DNS addresses, and can be detected using network scanning tools, dhcp-probe, and DHCP server logs.

## Why Rogue DHCP Servers Are Dangerous

A rogue DHCP server can:
- Assign itself as the default gateway (man-in-the-middle)
- Point clients to a malicious DNS server
- Assign incorrect subnet masks, causing routing failures
- Disrupt legitimate DHCP service

## Detection Method 1: nmap DHCP Discover Script

```bash
# Broadcast DHCP discover and collect all responses

# Run from a host on the local broadcast domain you want to test
sudo nmap --script broadcast-dhcp-discover -e eth0

# If you see more than one DHCP server IP in the output, there's a rogue
# Expected: only your legitimate server responds
# Suspicious: multiple "Server Identifier" entries
```

## Detection Method 2: dhcp-probe

`dhcp-probe` sends DHCP requests and alerts when unexpected servers respond:

```bash
sudo apt install dhcp-probe

# Configuration: /etc/dhcp_probe.cf
# Specify each authorized DHCP server with a legal_server entry
# legal_server 10.0.0.53
# dhcp-probe will alert if any other server responds

# Run
sudo dhcp_probe -c /etc/dhcp_probe.cf eth0

# Alert via email when rogue detected
# In /etc/dhcp_probe.cf:
# alert_program_name /usr/local/bin/dhcp-alert.sh
```

## Detection Method 3: tcpdump Passive Monitoring

```bash
# Capture DHCP replies from servers (offers, ACKs, and NAKs come from UDP 67)
sudo tcpdump -i eth0 -n -vv 'udp and src port 67 and dst port 68'

# Or with tshark, show only DHCPOFFER packets
sudo tshark -i eth0 -Y "dhcp.option.dhcp == 2" \
    -T fields -e ip.src -e dhcp.ip.your \
    -e dhcp.option.dhcp_server_id
```

## Detection Method 4: DHCP Log Analysis

```bash
# If your DHCP client logs to the systemd journal, inspect recent DHCP-related entries
journalctl -b | grep -i dhcp

# Or run the ISC DHCP client once, verbosely, to see which server answered
dhclient -1 -v eth0 2>&1 | grep "DHCPOFFER from"
# Only your authorized server IPs should appear
```

## Python: Automated Rogue Detection

```python
import subprocess
import ipaddress

AUTHORIZED_SERVERS = {"10.0.0.53", "10.0.0.54"}

def detect_rogue_dhcp(interface: str) -> list:
    """
    Use nmap to detect DHCP servers and return unauthorized ones.
    Requires root and nmap with broadcast-dhcp-discover script.
    """
    result = subprocess.run(
        ["nmap", "--script", "broadcast-dhcp-discover", "-e", interface],
        capture_output=True, text=True, timeout=30
    )

    rogue = []
    for line in result.stdout.splitlines():
        if "Server Identifier" in line:
            ip = line.split(":")[-1].strip()
            if ip not in AUTHORIZED_SERVERS:
                rogue.append(ip)
    return rogue

rogues = detect_rogue_dhcp("eth0")
if rogues:
    print(f"WARNING: Rogue DHCP server(s) detected: {rogues}")
else:
    print("No rogue DHCP servers detected")
```

## Remediation

Once detected:
1. Identify the rogue server's IP from the DHCP offer.
2. Use ARP or switch MAC tables to find the port it's connected to.
3. Disable the port or disconnect the device.
4. Enable DHCP snooping to prevent recurrence.

## Key Takeaways

- `nmap --script broadcast-dhcp-discover` reveals all DHCP servers responding on the segment.
- `dhcp-probe` provides continuous automated monitoring for rogue servers.
- DHCP snooping on managed switches is the standard prevention mechanism.
- When a rogue is found, trace it via ARP and switch MAC address tables to find the physical port.
