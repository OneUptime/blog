# How to Set Up iftop for Real-Time Bandwidth Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Bandwidth Monitoring, Network Tools

Description: A practical guide to installing and using iftop on Ubuntu for real-time bandwidth monitoring, including filters, display options, and interpreting the output.

---

When a server or workstation is consuming unexpected bandwidth, you need a tool that shows what is happening right now, not averages from the last hour. iftop fills that role. It listens on a network interface and displays a live, sorted list of connections ordered by bandwidth usage. You can see which hosts are communicating, how much data is flowing in each direction, and identify the top consumers at a glance.

## Installing iftop

iftop is in the standard Ubuntu repositories:

```bash
sudo apt update
sudo apt install iftop -y
```

Running iftop requires root privileges because it needs to put the interface into promiscuous mode for packet capture:

```bash
sudo iftop
```

Without arguments, iftop tries to detect your primary interface automatically. To specify one explicitly:

```bash
# Monitor a specific interface
sudo iftop -i eth0

# On modern Ubuntu with predictable interface names
sudo iftop -i enp0s3
```

## Understanding the iftop Display

When iftop starts, you see three main areas:

### The Header Bar

At the top is a scale bar showing bandwidth increments. The scale adjusts automatically based on traffic levels.

### The Connection List

The middle section shows individual connections in this format:

```
host1.example.com    =>    remote.server.com      1.5Mb   2.3Mb   2.1Mb
                     <=                           512Kb   890Kb   780Kb
```

- The arrow direction indicates traffic flow (send vs receive)
- The three numbers are averages over **2 seconds**, **10 seconds**, and **40 seconds**
- Lines are sorted by the peak or current rate depending on your sort setting

### The Footer Summary

The bottom shows aggregate totals:

```
TX:  cumulative  15.2GB   peak  4.5Mb   rates  3.2Mb  4.1Mb  3.8Mb
RX:  cumulative  82.1GB   peak  12.3Mb  rates  8.9Mb  11.2Mb  10.5Mb
TOTAL:           97.3GB   peak  15.1Mb         12.1Mb 15.3Mb  14.3Mb
```

- **TX** - transmitted (outbound) traffic
- **RX** - received (inbound) traffic
- **Cumulative** - total since iftop started
- **Peak** - highest rate seen since start
- **Rates** - 2s/10s/40s averages

## Keyboard Shortcuts While Running

iftop is interactive. These keys change the display without restarting:

| Key | Action |
|-----|--------|
| `h` | Toggle help overlay |
| `n` | Toggle DNS name resolution (speeds up display if DNS is slow) |
| `p` | Toggle port numbers |
| `P` | Pause the display |
| `s` | Toggle display of source host |
| `d` | Toggle display of destination host |
| `t` | Cycle through display modes (two-line, sent only, received only, totals) |
| `l` | Set a filter expression |
| `L` | Toggle logarithmic scale on the bandwidth bar |
| `j` / `k` | Scroll the connection list up/down |
| `q` | Quit |

### Disabling DNS Resolution

DNS lookups can make iftop sluggish and difficult to read when many connections are active. Disable them at startup:

```bash
sudo iftop -n
```

Or press `n` while running to toggle.

### Showing Port Numbers

Port numbers help identify what services are responsible for traffic:

```bash
sudo iftop -P
```

This shows output like `192.168.1.10:443` instead of just the IP, which quickly tells you whether traffic is HTTPS, SSH, database connections, or something else.

## Filtering Traffic with BPF Expressions

iftop supports Berkeley Packet Filter (BPF) expressions, the same syntax used by tcpdump. This lets you narrow the display to specific traffic.

### Filter to a Single Host

```bash
# Only show traffic to/from 10.0.0.50
sudo iftop -f "host 10.0.0.50"
```

### Filter by Port

```bash
# Monitor only HTTP and HTTPS traffic
sudo iftop -f "port 80 or port 443"

# Monitor database traffic
sudo iftop -f "port 5432 or port 3306"
```

### Filter by Network

```bash
# Show traffic only within the 192.168.1.0/24 subnet
sudo iftop -f "net 192.168.1.0/24"
```

### Exclude Local Traffic

To focus on external traffic and ignore internal hosts:

```bash
sudo iftop -f "not net 192.168.0.0/16"
```

### Set Filters Interactively

While iftop is running, press `l` to enter a filter expression on the fly. This is useful when you spot something suspicious and want to isolate it without restarting.

## Common Use Cases

### Finding Bandwidth Hogs

Run iftop without filters on your primary interface. The connections using the most bandwidth float to the top. Look at the 40-second average column to see sustained usage rather than spikes:

```bash
sudo iftop -i eth0 -n -P
```

### Checking Specific Server Connections

If a particular server is complaining about load, check what is connecting to it:

```bash
# See all connections to port 443 on this machine
sudo iftop -f "dst port 443"
```

### Monitoring Outbound Upload Traffic

Unexpected outbound traffic is often a sign of misconfigured backup jobs, accidental data exfiltration, or malware. Check it with:

```bash
# Monitor outbound connections
sudo iftop -f "src host $(hostname -I | awk '{print $1}')"
```

## Logging iftop Output

iftop does not have built-in logging, but you can capture a snapshot by running it in text mode:

```bash
# Run for 30 seconds in text mode and save to file
sudo iftop -t -s 30 -n 2>&1 | tee /tmp/iftop-snapshot.txt
```

The `-t` flag enables text output (no ncurses), `-s 30` tells it to run for 30 seconds then exit. This is useful for scripted collection or when you want to compare traffic before and after a change.

## Running iftop Without Root Using Capabilities

Instead of running iftop as root every time, grant the binary the specific capability it needs:

```bash
# Grant cap_net_raw capability
sudo setcap cap_net_raw+eip /usr/sbin/iftop

# Now run as regular user (still need interface access)
iftop -i eth0
```

Note that this applies globally to the binary, so consider the security implications on multi-user systems.

## Comparing iftop with Similar Tools

| Tool | Focus | Interface |
|------|-------|-----------|
| iftop | Per-connection bandwidth | ncurses terminal |
| nethogs | Per-process bandwidth | ncurses terminal |
| nload | Total interface throughput | ncurses terminal |
| vnstat | Historical traffic accounting | CLI / web |
| darkstat | Historical per-host stats | Web browser |

iftop is the go-to for immediate, connection-level visibility. For per-process accounting, nethogs is a better fit since iftop does not associate connections with processes.

## Practical Workflow for Bandwidth Investigation

When you notice high network utilization, a structured approach works best:

```bash
# Step 1: Get a quick overview of top talkers
sudo iftop -n -P -t -s 10

# Step 2: Identify the busiest connection and filter to it
sudo iftop -f "host 203.0.113.42"

# Step 3: Identify the port and service
# Look at the port numbers with -P flag

# Step 4: Correlate with process using ss or lsof
sudo ss -tnp | grep 203.0.113.42
sudo lsof -i @203.0.113.42
```

## Summary

iftop gives you immediate visibility into network traffic with minimal setup. Install it from the Ubuntu repositories, run it with sudo, and within seconds you can see which connections are consuming bandwidth, filtered down to specific hosts or ports using BPF expressions. The interactive keyboard controls make it easy to adjust the view on the fly. For sustained monitoring and historical tracking, combine iftop with tools like vnstat or darkstat, using iftop for real-time investigation and the others for trend analysis.
