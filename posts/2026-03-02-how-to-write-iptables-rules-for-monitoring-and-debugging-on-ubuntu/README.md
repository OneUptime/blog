# How to Write iptables Rules for Monitoring and Debugging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, iptables, Networking, Security, Firewall

Description: Learn how to write iptables rules specifically for monitoring and debugging network traffic on Ubuntu, including logging, packet counting, and traffic analysis techniques.

---

iptables is more than a firewall tool - it is also a powerful instrument for understanding what is happening on your network interfaces. When you are tracking down a connection issue or trying to figure out where traffic is being dropped, iptables rules can give you the visibility you need without installing heavyweight monitoring software. This guide walks through writing rules specifically for monitoring and debugging purposes.

## Understanding iptables Chains for Monitoring

Before writing rules, it is worth understanding which chains are useful for monitoring versus enforcement. The main chains are INPUT, OUTPUT, and FORWARD. For most debugging scenarios, you will work in all three.

The key insight is that iptables rules are processed in order, and a rule does not have to take an action like ACCEPT or DROP - it can simply LOG and then continue to the next rule. This is the foundation of monitoring with iptables.

```bash
# Check your current rules before making changes
sudo iptables -L -n -v --line-numbers

# Check for any existing logging rules
sudo iptables -L -n -v | grep LOG
```

## Setting Up Packet Counting Rules

The simplest form of monitoring is just counting packets. You can insert rules that do nothing except count matching traffic.

```bash
# Count all incoming TCP connections on port 80
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT

# Count outgoing connections to a specific subnet
sudo iptables -I OUTPUT -d 10.0.0.0/8 -j ACCEPT

# View the counters - they increment as traffic flows
sudo iptables -L -n -v
```

The `-v` flag shows packet and byte counts. To reset counters without deleting rules:

```bash
# Reset all counters
sudo iptables -Z

# Reset counters for a specific chain
sudo iptables -Z INPUT

# Reset a specific rule (by chain and rule number)
sudo iptables -Z INPUT 3
```

To watch counters in real time:

```bash
# Watch iptables stats every 2 seconds
watch -n 2 'iptables -L -n -v'
```

## Logging Specific Traffic

Logging is the most powerful debugging technique. The LOG target writes to the kernel log (visible via `dmesg` or `journalctl`), which you can then grep and analyze.

```bash
# Log all dropped packets
sudo iptables -A INPUT -j LOG --log-prefix "IPTABLES-DROP: " --log-level 4

# Log traffic from a specific IP
sudo iptables -I INPUT -s 192.168.1.100 -j LOG --log-prefix "SUSPECT-HOST: " --log-level 4

# Log new TCP connections (not established ones, to avoid noise)
sudo iptables -A INPUT -p tcp --syn -j LOG --log-prefix "NEW-TCP: " --log-level 6

# Log UDP traffic on a specific port
sudo iptables -A INPUT -p udp --dport 53 -j LOG --log-prefix "DNS-QUERY: " --log-level 4
```

Read the log output:

```bash
# View iptables log entries in real time
sudo journalctl -f | grep IPTABLES

# Or use dmesg
sudo dmesg | grep "IPTABLES-DROP"

# Filter by prefix you defined
sudo journalctl -k | grep "NEW-TCP"
```

## Creating a Custom Debugging Chain

Rather than cluttering your main chains with temporary rules, create a dedicated debugging chain. This makes cleanup much easier.

```bash
# Create a new chain called DEBUG
sudo iptables -N DEBUG

# Add logging to the DEBUG chain
sudo iptables -A DEBUG -j LOG --log-prefix "DEBUG: " --log-level 6
sudo iptables -A DEBUG -j RETURN

# Jump to DEBUG chain for traffic you want to inspect
# This logs the traffic and then returns to continue normal processing
sudo iptables -I INPUT -s 10.0.0.0/8 -j DEBUG
sudo iptables -I OUTPUT -d 10.0.0.0/8 -j DEBUG
```

When you are done debugging:

```bash
# Remove the jump rules first
sudo iptables -D INPUT -s 10.0.0.0/8 -j DEBUG
sudo iptables -D OUTPUT -d 10.0.0.0/8 -j DEBUG

# Flush the DEBUG chain
sudo iptables -F DEBUG

# Delete the chain
sudo iptables -X DEBUG
```

## Monitoring Connection States

Connection tracking gives you insight into established vs new connections. This is very useful for debugging firewall behavior.

```bash
# Log all new connections
sudo iptables -A INPUT -m state --state NEW -j LOG --log-prefix "NEW-CONN: "

# Log invalid packets (often a sign of problems)
sudo iptables -A INPUT -m state --state INVALID -j LOG --log-prefix "INVALID: "

# Log packets from unexpected states
sudo iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED \
  -j LOG --log-prefix "RELATED-EST: " --log-level 7
```

Check the connection tracking table directly:

```bash
# View all tracked connections
sudo conntrack -L

# Watch connections in real time
sudo conntrack -E

# Count connections by state
sudo conntrack -L | awk '{print $4}' | sort | uniq -c | sort -rn
```

## Port Scanning Detection

You can write rules that detect common scanning patterns:

```bash
# Log packets that are not SYN but claim to be NEW connections (suspicious)
sudo iptables -A INPUT -p tcp ! --syn -m state --state NEW \
  -j LOG --log-prefix "SCAN-DETECT: "

# Log Christmas tree packets (all flags set)
sudo iptables -A INPUT -p tcp --tcp-flags ALL ALL \
  -j LOG --log-prefix "XMAS-SCAN: "

# Log null packets (no flags)
sudo iptables -A INPUT -p tcp --tcp-flags ALL NONE \
  -j LOG --log-prefix "NULL-SCAN: "
```

## Using NFLOG for Advanced Analysis

If you want to capture actual packet content rather than just headers, NFLOG pipes packets to userspace tools like `ulogd2`.

```bash
# Install ulogd2
sudo apt install ulogd2

# Send packets to NFLOG group 0
sudo iptables -A INPUT -p tcp --dport 8080 -j NFLOG --nflog-group 0 --nflog-prefix "PORT8080"

# Configure ulogd2 to capture them
sudo nano /etc/ulogd.conf
```

## Debugging with TRACE

The TRACE target lets you see how a packet traverses every rule in every chain. It requires the nf_log_ipv4 module.

```bash
# Load the required module
sudo modprobe nf_log_ipv4

# Enable logging for the raw table (where TRACE works)
sudo sysctl net.netfilter.nf_log.2=nf_log_ipv4

# Add TRACE rules to the raw table (before any mangling)
sudo iptables -t raw -A PREROUTING -p tcp --dport 443 -j TRACE
sudo iptables -t raw -A OUTPUT -p tcp --sport 443 -j TRACE

# View the trace output
sudo dmesg | grep "TRACE:"
```

## Saving and Restoring Debug Rules

When you have a working set of debug rules, save them so you can restore after a reboot or reset.

```bash
# Save current rules to a file
sudo iptables-save > /tmp/debug-rules.txt

# Restore from file
sudo iptables-restore < /tmp/debug-rules.txt

# View saved rules
cat /tmp/debug-rules.txt
```

## Cleaning Up After Debugging

Always clean up logging and counting rules after you are done - they add overhead and fill logs.

```bash
# List rules with line numbers to identify what to remove
sudo iptables -L INPUT -n -v --line-numbers

# Delete rule by line number
sudo iptables -D INPUT 5

# Or flush an entire chain (careful - removes all rules including enforcement ones)
sudo iptables -F INPUT

# Remove all custom chains
sudo iptables -X

# Reset everything to default (no rules at all)
sudo iptables -F
sudo iptables -X
sudo iptables -Z
```

## Tips for Effective Debugging

Keep your log prefixes consistent and descriptive - you will be grateful when grepping through logs at 2am. Always test rules in a non-production environment first. Use the `-I` flag (insert) rather than `-A` (append) when adding debug rules so they fire before other rules that might DROP the packet before your LOG rule fires.

For ongoing monitoring rather than one-off debugging, consider pairing iptables with tools like fail2ban or a proper monitoring stack. But for quick triage, these iptables techniques are often the fastest path to answers.
