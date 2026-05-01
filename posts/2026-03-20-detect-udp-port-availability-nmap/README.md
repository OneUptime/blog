# How to Detect UDP Port Availability with nmap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, nmap, Port Scanning, Security, Networking, Linux

Description: Use nmap's UDP scanning capabilities to determine which UDP ports are open, filtered, or closed on a target host.

## Introduction

UDP port scanning is fundamentally different from TCP scanning. There is no connection handshake, so determining whether a UDP port is "open" usually requires either an application-level response or careful interpretation of missing or returned ICMP errors. `nmap` handles this complexity with its `-sU` flag, using protocol-specific payloads for known services and ICMP analysis for the rest.

## Basic UDP Scan

```bash
# UDP scan (requires root/sudo)

sudo nmap -sU 10.20.0.5
# Scans top 1000 UDP ports
# Slow: many hosts rate-limit ICMP port unreachable responses

# Scan specific UDP ports:
sudo nmap -sU -p 53,67,123,161,500 10.20.0.5

# Scan a range:
sudo nmap -sU -p 5000-5100 10.20.0.5

# Scan all UDP ports (takes a very long time):
sudo nmap -sU -p- 10.20.0.5
```

## Interpreting Results

```text
UDP port states:
- open         : Got an application response
- open|filtered: No response received (could be open OR filtered by firewall)
- closed       : Received ICMP port unreachable
- filtered     : Received ICMP admin prohibited or other ICMP unreachable error

Most UDP ports appear as "open|filtered" because:
  - Firewalls often silently drop UDP to unknown ports
  - Open services may not respond to unknown payloads
  - No response is ambiguous: could mean open (ignoring) or filtered (dropped)
```

## Speeding Up UDP Scans

```bash
# UDP scans are slow by default to avoid triggering ICMP rate limits
# Speed up for known ports with version detection:
sudo nmap -sU -sV -p 53,67,123,161 10.20.0.5
# -sV: version detection sends service-specific probes

# Use --min-rate to increase scan rate (be careful with firewalls):
sudo nmap -sU --min-rate 1000 -p 1-1000 10.20.0.5
# Sends at least 1000 packets/sec

# Combine UDP and TCP scan:
sudo nmap -sU -sS -p U:53,T:80,443 10.20.0.5
# U: prefix for UDP ports, T: for TCP ports

# Fast scan with timing template:
sudo nmap -sU -T4 -p 53,123,161,500,4500 10.20.0.5
```

## Verifying Specific UDP Services

```bash
# DNS (UDP 53) - verify with dig:
dig @10.20.0.5 google.com
# Any DNS reply = port 53 UDP is open

# NTP (UDP 123) - verify with sntp:
sntp 10.20.0.5
# A time reply = port 123 UDP is open

# SNMP (UDP 161) - verify with snmpwalk:
snmpwalk -v2c -c public 10.20.0.5 sysDescr
# Response = SNMP is open and community string is correct

# DHCP (UDP 67) - nmap has DHCP probe:
sudo nmap -sU -p 67 --script dhcp-discover 10.20.0.5

# Syslog (UDP 514) - send a test message:
logger --udp -n 10.20.0.5 -P 514 "test message"
# Confirm the message arrives on the server
```

## Using nmap Scripts for UDP Services

```bash
# DNS NSID and version.bind (if the server exposes them):
sudo nmap -sU -p 53 --script dns-nsid 10.20.0.5

# SNMP engine information:
sudo nmap -sU -p 161 --script snmp-info 10.20.0.5

# NTP time and configuration variables:
sudo nmap -sU -p 123 --script ntp-info 10.20.0.5

# TFTP enumeration:
sudo nmap -sU -p 69 --script tftp-enum 10.20.0.5

# List script filenames containing "udp":
ls /usr/share/nmap/scripts/ | grep -i udp
```

## Firewall Effects on UDP Scanning

```bash
# Firewall DROP: nmap sees "open|filtered" (no ICMP reply)
# Firewall REJECT: nmap sees "closed" or "filtered" depending on the ICMP code returned

# Check if firewall is affecting results by scanning from different location:
# From inside: sudo nmap -sU -p 53 localhost
# From outside: sudo nmap -sU -p 53 <your-public-ip>
# Different results = firewall filtering

# Check local firewall rules:
iptables -L -n | grep -E "DROP|REJECT"
nft list ruleset | grep -E "drop|reject"
```

## Conclusion

`nmap -sU` is the standard tool for UDP port discovery, but it typically requires root privileges on Linux and is slow by default because many hosts rate-limit ICMP unreachable responses. Use targeted scans of specific well-known ports rather than full range scans. An "open|filtered" result means the port might be open but isn't definitively confirmed - follow up with service-specific tools like `dig` for DNS or `snmpwalk` for SNMP to confirm open services. Version detection (`-sV`) provides the most reliable results by sending application-specific probes.
