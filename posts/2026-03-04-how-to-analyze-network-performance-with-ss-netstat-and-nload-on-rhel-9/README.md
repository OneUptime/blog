# How to Analyze Network Performance with ss, netstat, and nload on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking, Performance

Description: Step-by-step guide on analyze network performance with ss, netstat, and nload on rhel 9 with practical examples and commands.

---

Diagnosing network performance issues on RHEL 9 requires the right tools. This guide covers using ss, netstat, and nload for network analysis.

## Using ss (Socket Statistics)

ss is the modern replacement for netstat on RHEL 9.

### View All Connections

```bash
# All TCP connections
ss -t

# All TCP connections with details
ss -tnp

# All listening sockets
ss -tlnp

# All UDP sockets
ss -ulnp
```

### Filter Connections

```bash
# Connections to a specific port
ss -tn 'dport = :443'

# Connections from a specific IP
ss -tn 'src 192.168.1.100'

# Connections in ESTABLISHED state
ss -tn state established

# Connections in TIME-WAIT state
ss -tn state time-wait
```

### View Socket Statistics

```bash
# Summary statistics
ss -s

# Extended socket information
ss -tnei
```

### Monitor Connection Counts

```bash
# Count connections per state
ss -tn state established | wc -l
ss -tn state time-wait | wc -l
ss -tn state close-wait | wc -l
```

## Using netstat (Legacy)

netstat is still available for backward compatibility:

```bash
sudo dnf install -y net-tools

# Active connections
netstat -tnp

# Listening ports
netstat -tlnp

# All connections with statistics
netstat -s

# Interface statistics
netstat -i
```

## Using nload for Bandwidth Monitoring

Install nload:

```bash
sudo dnf install -y epel-release
sudo dnf install -y nload
```

### Monitor Interface Bandwidth

```bash
# Monitor default interface
nload

# Monitor a specific interface
nload eth0

# Monitor multiple interfaces
nload eth0 eth1
```

### nload Display Options

```bash
# Set refresh interval (milliseconds)
nload -t 500

# Set traffic unit
nload -u M  # Megabytes

# Set graph height
nload -a 300
```

## Combining Tools for Analysis

```bash
# Find top connections by data transfer
ss -tnpi | sort -k5 -n -r | head -10

# Monitor connection rate
watch -n 1 'ss -s'

# Check for connection floods
ss -tn state syn-recv | wc -l
```

## Conclusion

Use ss for modern socket analysis, netstat for legacy compatibility, and nload for real-time bandwidth visualization. These tools together provide comprehensive network performance diagnostics on RHEL 9.

