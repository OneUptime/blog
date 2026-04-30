# How to Use fping for Parallel Ping Sweeps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fping, Networking, ICMP, Linux, Network Discovery, Monitoring

Description: Use fping to perform fast parallel ping sweeps of entire subnets, check host availability lists, and integrate network reachability checks into scripts.

## Introduction

fping is a ping utility that sends ICMP Echo Requests to multiple hosts simultaneously in a round-robin fashion rather than waiting for each host to respond before moving to the next. This makes it dramatically faster than sequential pinging - checking 254 hosts in a /24 subnet takes seconds instead of minutes.

## Installation and Basic Usage

```bash
# Install fping

apt install fping     # Debian/Ubuntu
yum install fping     # RHEL/CentOS

# Ping a single host (like standard ping)
fping 8.8.8.8

# Ping multiple hosts simultaneously
fping 192.168.1.1 192.168.1.2 192.168.1.3
# Each host gets simultaneous probes; results show alive/unreachable

# Ping all hosts in a subnet
fping -g 192.168.1.0/24

# Show only reachable hosts
fping -g -a 192.168.1.0/24 2>/dev/null
```

## Subnet Discovery

```bash
# Find all alive hosts in 192.168.1.0/24
fping -g -a 192.168.1.0/24 2>/dev/null

# Find all alive hosts and show response times
fping -g -a -e 192.168.1.0/24 2>/dev/null

# Scan multiple subnets
fping -g 192.168.1.0/24
fping -g 10.0.0.0/24

# Show alive AND unreachable hosts
fping -g 192.168.1.0/24
# 192.168.1.1 is alive
# ICMP Host Unreachable from 192.168.1.5 for ICMP Echo sent to 192.168.1.100
# 192.168.1.100 is unreachable
```

## Statistics and Timing

```bash
# Run multiple probes per host and show statistics
fping -g -c 5 -q 192.168.1.0/24

# Output format: host : xmt/rcv/%loss, min/avg/max
# 192.168.1.1 : 5/5/0%, 0.85/1.12/1.43 ms
# 192.168.1.10 : 5/5/0%, 2.11/2.34/2.67 ms

# Set initial timeout per target (milliseconds)
fping -t 500 -g 192.168.1.0/24   # 500ms initial timeout

# Set interval between probes in count mode (milliseconds)
fping -g -c 5 -p 100 -q 192.168.1.0/24   # 100ms between probes to each host
```

## Reading Hosts from a File

```bash
# Create a host list
cat > /tmp/hosts.txt << EOF
192.168.1.1
10.0.0.1
8.8.8.8
1.1.1.1
EOF

# Ping all hosts from file
fping < /tmp/hosts.txt

# Show only alive hosts from file
fping -a < /tmp/hosts.txt 2>/dev/null
```

## Integration in Monitoring Scripts

```bash
#!/bin/bash
# Check which servers in a list are down
HOSTS_FILE="/etc/monitoring/servers.txt"
ALERT_EMAIL="ops@example.com"

DOWN_HOSTS=$(fping -a < "$HOSTS_FILE" 2>/dev/null | sort | comm -23 <(sort "$HOSTS_FILE") -)

if [ -n "$DOWN_HOSTS" ]; then
    printf "DOWN HOSTS at %s\n%s\n" "$(date)" "$DOWN_HOSTS" | \
        mail -s "Host Availability Alert" "$ALERT_EMAIL"
fi
```

## fping vs nmap for Discovery

```bash
# fping: fast ICMP-only discovery
fping -g -a 192.168.1.0/24 2>/dev/null

# nmap: slower, but can often detect hosts even when ICMP echo is blocked
# Uses TCP SYN/ACK and ARP/ND probes by default, depending on context
nmap -sn 192.168.1.0/24

# For a fast first pass, save fping responders for follow-up scanning
fping -g -a 192.168.1.0/24 2>/dev/null > /tmp/alive.txt
```

## Conclusion

fping's parallel probe model makes it the right tool for subnet discovery and availability checks across large IP ranges. Use `-g` for subnet sweeps, `-a` for alive-only output, and stdin redirection for file-based host lists. Its output format integrates naturally into shell scripts for monitoring automation. For environments where ICMP is filtered, combine fping with nmap TCP probes.
