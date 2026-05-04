# How to Correlate TCP Errors with Application Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Application, Debugging, Error, Linux, Correlation

Description: Map TCP-level errors such as resets, timeouts, and retransmissions to application-level failures by correlating kernel statistics with application logs and traces.

## Introduction

Application failures often manifest as TCP errors underneath. A "connection refused" in your app log corresponds to a TCP RST. A "request timeout" corresponds to TCP retransmits followed by an RTO timeout. Understanding the mapping between TCP errors and application behavior speeds up diagnosis dramatically - instead of guessing, you read what the kernel recorded.

## Common Mappings

| Application Error | TCP Cause | What to Check |
|---|---|---|
| Connection refused | RST from peer | Service not running, firewall |
| Connection timed out | SYN not answered | Host unreachable, firewall dropping |
| Connection reset by peer | RST mid-stream | App crash, proxy timeout, firewall |
| Request timeout | Retransmit → RTO | Packet loss, congestion |
| Slow responses | High RTT or CWND reduction | Network congestion, buffer issues |
| Partial responses | Window full / buffer | Receiver too slow, misconfigured buffers |

## Step 1: Capture the Application Error

```bash
# Application logs: find the error and timestamp

journalctl -u myservice --since "10 minutes ago" | grep -E "refused|timeout|reset|error"

# Or directly from app (example: curl)
curl -v --connect-timeout 5 http://10.20.0.5:8080/health 2>&1 | grep -E "connect|fail|reset"

# Note the exact error and timestamp for correlation
```

## Step 2: Check Kernel TCP Error Counters

```bash
# Snapshot before/after reproducing the error
nstat -a > /tmp/before.txt
# reproduce the error
nstat -a > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt | grep "^>"

# Key counters and their meanings:
# TcpAttemptFails       → SYN sent, got RST or ICMP unreachable (connection refused)
# TcpEstabResets        → RST received on ESTABLISHED connection (reset by peer)
# TcpRetransSegs        → Retransmissions (loss/congestion)
# TcpExtTCPTimeouts     → RTO expired (serious: connection likely failed)
# TcpExtTCPSynRetrans   → SYN retransmits (remote not responding)
```

## Step 3: Use ss to Find the Connection State

```bash
# Look for connections to the failing service
ss -tnp state all dst 10.20.0.5

# States that indicate problems:
# SYN-SENT with no SYN-RECV: remote not responding (firewall or down)
# CLOSE-WAIT: remote closed, local app hasn't called close() (app bug)
# FIN-WAIT-2: local sent FIN, waiting for remote FIN (stalled close)

# For retransmit details on active connections:
ss -tin state established dst 10.20.0.5 | grep -E "retrans|rtt"
```

## Step 4: Correlate with Packet Capture

```bash
# Capture traffic to the failing service at the time of failure
tcpdump -i eth0 -w /tmp/failure.pcap host 10.20.0.5 and port 8080

# Reproduce the error, then analyze:
tcpdump -r /tmp/failure.pcap -n

# Look for:
# RST flag set: "Flags [R]" or "Flags [R.]"
# Retransmissions: same sequence number appearing twice
# Window size 0: receiver buffer full
# No response to SYN: connection timeout

# Filter RST packets:
tcpdump -r /tmp/failure.pcap 'tcp[tcpflags] & tcp-rst != 0'
```

## Step 5: Application-Specific Correlation

```bash
# For HTTP applications: correlate HTTP errors with TCP state
# HTTP 502: upstream TCP connection failed
# HTTP 504: upstream TCP timed out
# HTTP 503: connection pool exhausted (too many CLOSE_WAIT/TIME_WAIT)

# Check TIME_WAIT count for connection exhaustion
ss -tn state time-wait | wc -l
# High count > 10000: consider SO_REUSEADDR or shorter TIME_WAIT

# Check CLOSE_WAIT count for app-side socket leak
ss -tn state close-wait | wc -l
# Should be near 0; high count = application not closing sockets

# For database connections: check for reset due to idle timeout
# If app gets "connection reset" on first query after idle:
# → Database killed idle connection; enable connection pool keepalives
```

## Automated Correlation Script

```bash
#!/bin/bash
# Monitor TCP errors and log with timestamp for later correlation

while true; do
    TS=$(date '+%Y-%m-%dT%H:%M:%S')
    RESETS=$(nstat -z 2>/dev/null | awk '/TcpEstabResets/{print $2+0}')
    RETRANS=$(nstat -z 2>/dev/null | awk '/TcpRetransSegs/{print $2+0}')
    TIMEOUTS=$(nstat -z 2>/dev/null | awk '/TcpExtTCPTimeouts/{print $2+0}')
    SYNRETRANS=$(nstat -z 2>/dev/null | awk '/TcpExtTCPSynRetrans/{print $2+0}')
    echo "$TS resets=$RESETS retrans=$RETRANS timeouts=$TIMEOUTS syn_retrans=$SYNRETRANS"
    sleep 10
done >> /var/log/tcp-errors.log
```

Cross-reference this log with application error timestamps to find the exact TCP event behind each failure.

## Conclusion

TCP errors and application failures follow predictable mappings. Connection refused always means RST. Request timeouts mean retransmit exhaustion. Reset by peer means RST mid-stream. Use `nstat` for counters, `ss` for connection state, and `tcpdump` for packet-level evidence. The combination of kernel counters timestamped with application logs eliminates guessing.
