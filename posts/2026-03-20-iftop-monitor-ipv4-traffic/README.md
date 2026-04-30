# How to Monitor IPv4 Network Traffic with iftop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Iftop, Linux, Networking, Traffic Monitoring, Bandwidth, IPv4

Description: Use iftop to display real-time bandwidth usage per connection on a Linux interface, identifying which hosts and connections are consuming the most bandwidth.

iftop shows a live, sorted list of network connections and their bandwidth usage - like top for network traffic. It immediately answers "which host is using all my bandwidth?" without complex analysis.

## Install iftop

```bash
# Debian/Ubuntu

sudo apt install iftop -y

# RHEL/CentOS (with EPEL enabled)
sudo dnf install iftop -y
```

## Basic Usage

```bash
# Monitor the auto-selected interface (usually requires root)
sudo iftop -f 'ip'

# Monitor specific interface
sudo iftop -i eth0 -f 'ip'

# Monitor with no DNS resolution (faster, clearer)
sudo iftop -i eth0 -f 'ip' -n

# Monitor with numeric port numbers visible
sudo iftop -i eth0 -f 'ip' -NP

# Combine: numeric hosts + numeric ports
sudo iftop -i eth0 -f 'ip' -nNP
```

## Reading iftop Output

```javascript
                              12.5Kb          25.0Kb          37.5Kb
┌─────────────────────────────────────────────────────────────────────┐
 192.168.1.100:54321     =>     8.8.8.8:443          1.20Mb  2.30Mb  1.90Mb
                          <=                          450Kb   890Kb   720Kb
 192.168.1.100:32100     =>     10.0.0.50:22          15Kb    12Kb    14Kb
                          <=                          8Kb      7Kb    8Kb
──────────────────────────────────────────────────────────────────────
TX:             cum:   1.50MB   peak:   2.50Mb    rates:   1.25Mb  2.20Mb  1.80Mb
RX:             cum:   820KB    peak:   1.10Mb    rates:    460Kb  895Kb   730Kb
TOTAL:          cum:   2.32MB   peak:   3.60Mb    rates:   1.71Mb  3.09Mb  2.53Mb

# =>: outbound (TX) traffic
# <=: inbound (RX) traffic
# Three rate columns: 2s avg, 10s avg, 40s avg
# TX/RX totals: cumulative, peak, current rates
```

## Interactive Controls

While iftop is running:

```text
Key    Action
-----  -----------------------------------------
n      Toggle DNS resolution
p      Toggle port display
s      Toggle source host display
d      Toggle destination host display
t      Cycle display mode
j/k    Scroll through connections
1/2/3  Sort by 2s / 10s / 40s average
</>    Sort by source / destination
?      Help
q      Quit
```

## Filter Traffic

```bash
# Monitor only traffic to/from a specific host
sudo iftop -i eth0 -F 10.0.0.50/32

# Monitor a specific subnet
sudo iftop -i eth0 -F 192.168.1.0/24

# Monitor specific host+port with BPF filter
sudo iftop -i eth0 -f 'host 8.8.8.8 and port 443'

# Monitor only external traffic (exclude local subnet)
sudo iftop -i eth0 -f 'not net 192.168.1.0/24'
```

## Identify Bandwidth Hogs

```bash
# iftop automatically sorts by current bandwidth (highest 10s average at top)
sudo iftop -i eth0 -f 'ip' -n

# The top connection = biggest current bandwidth consumer
# Use this to identify:
# - Backup jobs consuming all bandwidth
# - Video streaming eating your link
# - Unexpected data transfers (possible exfiltration)
# - DDoS traffic patterns
```

## Save a Text Report

```bash
# Wait 60 seconds, print one text snapshot, then save it
sudo iftop -i eth0 -f 'ip' -n -t -s 60 > /tmp/iftop-report.txt

# -t = text mode (no ncurses)
# -s = wait N seconds, print one report, then exit

# View the report
cat /tmp/iftop-report.txt
```

iftop provides the fastest answer to "what's consuming my bandwidth right now?" - a question that becomes urgent during network slowdowns and is frustratingly hard to answer with most other tools.
