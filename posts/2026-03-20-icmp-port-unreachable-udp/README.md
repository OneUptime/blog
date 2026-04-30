# How to Interpret ICMP Port Unreachable for UDP Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, UDP, Networking, Troubleshooting, Port Unreachable, IPv4

Description: Understand ICMP Port Unreachable (Type 3 Code 3) messages generated when UDP packets reach a host but no service is listening on the target port.

## Introduction

ICMP Port Unreachable (Type 3 Code 3) is generated in the normal unicast case by a destination host when a UDP packet arrives but no application is listening on the target port. A firewall configured to reject the packet can also return the same ICMP code. Unlike TCP, which uses RST packets to signal a closed port, UDP uses ICMP to report the error. This message is crucial for diagnosing UDP service failures.

## When Port Unreachable is Generated

```text
Client sends UDP to 10.20.0.5:514
10.20.0.5 has no syslog daemon running on port 514
10.20.0.5 generates: ICMP Type 3 Code 3 back to client

Key point: In the common closed-port case, Port Unreachable
           comes from the destination host because the packet arrived
           but nothing was listening. A REJECTing firewall can also
           generate the same ICMP code.
```

## Capturing Port Unreachable Messages

```bash
# Listen for IPv4 ICMP Port Unreachable

tcpdump -i eth0 -n -v 'icmp[0]=3 and icmp[1]=3'

# Example output:
# 10.20.0.5 > 192.168.1.10: ICMP 10.20.0.5 udp port 514 unreachable, length 36
# -> Nothing listening on UDP 514 at 10.20.0.5
```

## Testing UDP Port Availability

```bash
# Method 1: netcat - attempt UDP connection and check for ICMP error
nc -u -z -v -w 2 10.20.0.5 514 2>&1
# If it reports "Connection refused", the local stack received ICMP Port Unreachable
# No output/timeout does NOT prove the port is open; it may be open, filtered,
# or the ICMP error may be rate-limited or not surfaced by the tool

# Method 2: nmap UDP scan
nmap -sU -p 514 10.20.0.5
# "closed" = ICMP Port Unreachable received
# "open" = response received
# "open|filtered" = no response (could be open, silently filtered, or rate-limited)

# Method 3: trigger the error manually with netcat
echo "test" | nc -u -w 1 10.20.0.5 12345
# Use tcpdump to confirm whether an ICMP Port Unreachable comes back
# If you see one: the port is closed or a firewall is rejecting the packet
# If you do not: the port may be open, silently filtered, or rate-limited
```

## Diagnosing Syslog and DNS UDP Failures

```bash
# Check if syslog is receiving UDP messages (port 514)
# From the syslog server, watch for UDP traffic
tcpdump -i eth0 -n 'udp port 514'

# If you see the UDP packets arriving but get Port Unreachable back:
ss -ulnp | grep ":514"   # Check if the syslog service is listening on UDP 514
# If nothing: the syslog service is not bound to UDP 514, restart the service configured on that host
systemctl restart rsyslog

# For DNS (port 53), check if the expected DNS service is listening
ss -ulnp | grep ":53"
# If nothing: the DNS service for that host is not listening on UDP 53
# Restart the DNS daemon configured on that host (for example named, unbound, or dnsmasq)
```

## Port Unreachable vs Firewall Drop

```bash
# Port Unreachable: you GET an ICMP error back (closed port or REJECTing firewall)
# Firewall DROP: no response at all (iptables -j DROP)
# Firewall REJECT with ICMP: you get ICMP back (iptables -j REJECT --reject-with icmp-port-unreachable)

# Distinguish:
# Closed port on reachable host: usually an immediate ICMP error
# Firewall DROP: timeout (no response)
# Firewall REJECT: immediate ICMP error from the host or filtering device

# Test:
time nc -u -z -w 2 10.20.0.5 514
# Immediate failure often means an ICMP error was received
# 2-second timeout suggests the traffic was silently dropped, or no ICMP error was surfaced
```

## Conclusion

ICMP Port Unreachable for UDP usually means the packet reached the destination stack but no service was listening on the target port. It's roughly the UDP equivalent of a TCP RST. A firewall configured to REJECT can return the same ICMP code, so interpret it in context. When you see this message from the destination host, the fix is usually to start the expected service on the destination, not to fix routing. When you DON'T see it (timeout instead), investigate whether a firewall is silently dropping the UDP traffic or whether ICMP errors are being rate-limited.
