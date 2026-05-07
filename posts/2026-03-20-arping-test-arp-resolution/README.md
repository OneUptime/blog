# How to Use arping to Test ARP Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Linux, Troubleshooting

Description: Learn how to use the arping utility to test ARP resolution, detect duplicate IPs, and send gratuitous ARPs on Linux.

## What Is arping?

`arping` is a command-line utility that sends ARP requests to a target IP address and reports whether a reply is received. Unlike `ping` (which uses ICMP at layer 3), `arping` operates at layer 2 and tests ARP directly.

## Installing arping

```bash
# Ubuntu/Debian

sudo apt install iputils-arping

# RHEL/CentOS
sudo yum install iputils

# macOS
# Homebrew installs a different arping implementation.
# The examples below are for Linux iputils arping.
brew install arping
```

## Basic Usage: Test ARP Resolution

```bash
# Send 4 ARP requests to 192.168.1.1 on eth0
arping -I eth0 -c 4 192.168.1.1
```

Sample output:

```text
ARPING 192.168.1.1 from 192.168.1.10 eth0
Unicast reply from 192.168.1.1 [aa:bb:cc:dd:ee:ff]  1.23ms
Unicast reply from 192.168.1.1 [aa:bb:cc:dd:ee:ff]  1.18ms
Unicast reply from 192.168.1.1 [aa:bb:cc:dd:ee:ff]  1.21ms
Unicast reply from 192.168.1.1 [aa:bb:cc:dd:ee:ff]  1.19ms
Sent 4 probes (1 broadcast(s))
Received 4 response(s)
```

## Detect Duplicate IP Addresses

```bash
# -D flag: exit with error code 1 if a reply is received (indicates duplicate)
arping -D -I eth0 -c 2 192.168.1.50
echo "Exit code: $?"
# Exit code 0 = No duplicate (safe to use)
# Exit code 1 = Duplicate found
```

This is commonly used in scripts before assigning a static IP:

```bash
#!/bin/bash
TARGET_IP="192.168.1.50"
IFACE="eth0"

if arping -D -I "$IFACE" -c 2 -q "$TARGET_IP"; then
    echo "IP $TARGET_IP is available"
else
    echo "WARNING: IP $TARGET_IP already in use!"
fi
```

## Send Gratuitous ARP

```bash
# -A: Send gratuitous ARP reply (announce our own IP-MAC binding)
arping -A -c 1 -I eth0 192.168.1.10

# -U: Send unsolicited ARP request (gratuitous request form)
arping -U -c 1 -I eth0 192.168.1.10
```

Use this after a NIC replacement or IP reassignment to update neighbors' ARP caches.

## Continuous Monitoring

```bash
# Keep sending (Ctrl+C to stop)
arping -I eth0 192.168.1.1

# With timestamps
arping -I eth0 192.168.1.1 | while read line; do
    echo "$(date +%H:%M:%S) $line"
done
```

## arping Options Summary

| Option | Description |
|--------|-------------|
| `-I iface` | Use this network interface |
| `-c count` | Send this many packets |
| `-D` | Duplicate address detection mode |
| `-A` | ARP reply mode (gratuitous ARP reply) |
| `-U` | Unsolicited ARP mode (gratuitous ARP request) |
| `-q` | Quiet mode (no output) |
| `-s src_ip` | Set source IP address |
| `-w deadline` | Exit after this many seconds |

## Script: Sweep ARP Across a Subnet

```bash
#!/bin/bash
# ARP sweep a /24 subnet
SUBNET="192.168.1"
IFACE="eth0"

echo "ARP sweep of $SUBNET.0/24..."
for i in $(seq 1 254); do
    arping -I "$IFACE" -c 1 -q -D "$SUBNET.$i" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "Host found: $SUBNET.$i"
    fi
done
```

## Key Takeaways

- `arping -I eth0 -c 4 IP` tests ARP resolution at layer 2.
- `-D` mode detects duplicate IPs (exits 1 if a reply is received).
- `-A` and `-U` modes send gratuitous ARP to update neighbor caches.
- arping is essential for L2 troubleshooting when ICMP ping fails.

**Related Reading:**

- [How to Understand Gratuitous ARP and Its Uses](https://oneuptime.com/blog/post/2026-03-20-gratuitous-arp-uses/view)
- [How to Detect Duplicate IP Addresses Using ARP](https://oneuptime.com/blog/post/2026-03-20-detect-duplicate-ip-arp/view)
- [How to Troubleshoot ARP Resolution Failures](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-arp-resolution/view)
