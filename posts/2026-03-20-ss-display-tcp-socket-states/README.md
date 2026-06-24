# How to Display TCP Socket States Using ss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ss, TCP, Linux, Socket States, Networking, Diagnostic

Description: Use ss to filter and display TCP socket states including ESTABLISHED, TIME_WAIT, CLOSE_WAIT, and LISTEN to diagnose connection problems and resource leaks.

TCP connection states reveal the lifecycle stage of each connection. Monitoring states with `ss` helps diagnose resource exhaustion (too many TIME-WAIT), connection leaks (stuck CLOSE-WAIT), and unusual traffic patterns.

## TCP State Reference

```text
State       Description
----------  -------------------------------------------------
LISTEN      Waiting for incoming connection
SYN-SENT    Sent SYN, waiting for SYN-ACK
SYN-RECV    Received SYN, sent SYN-ACK
ESTAB       Active, bidirectional connection
FIN-WAIT-1  Sent FIN, waiting for ACK
FIN-WAIT-2  Received ACK of FIN, waiting for remote FIN
CLOSE-WAIT  Remote closed, local hasn't closed yet
CLOSING     Both sides closing simultaneously
LAST-ACK    Sent FIN after CLOSE-WAIT, waiting for ACK
TIME-WAIT   Connection ended, holding to catch late packets
CLOSED      Connection terminated
```

## Filter by Specific State

```bash
# Show established connections

ss -tn state established

# Show listening sockets
ss -tn state listening

# Show TIME-WAIT connections (normal after connection closes)
ss -tn state time-wait

# Show CLOSE-WAIT (potential connection leak in application)
ss -tn state close-wait

# Show SYN-RECV (possible SYN flood indicator if high count)
ss -tn state syn-recv
```

## Count Connections by State

```bash
# Count all states
ss -ta | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn

# Expected healthy output:
#   45 ESTAB      (established connections)
#   12 TIME-WAIT  (recently closed - normal)
#    3 LISTEN     (services)

# Concerning patterns:
#  500+ TIME-WAIT → high connection turnover (web servers under load)
#   50+ CLOSE-WAIT → application not closing connections (memory/socket leak)
#  100+ SYN-RECV  → possible SYN flood attack
```

## Diagnose High TIME-WAIT Count

```bash
# Count TIME-WAIT connections
ss -Htn state time-wait | wc -l

# If > 1000, identify the peer ports causing accumulation
ss -Htn state time-wait | awk '{n=split($4, a, ":"); print a[n]}' | sort | uniq -c | sort -rn

# Fix options:
# 1. Allow TIME-WAIT reuse (for outbound connections; use only with expert guidance)
sudo sysctl -w net.ipv4.tcp_tw_reuse=1

# 2. Increase ephemeral port range
sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"

# 3. Reduce TIME-WAIT duration (use with caution)
# Default is 2*MSL = 60 seconds; cannot easily reduce in modern kernels
```

## Diagnose CLOSE-WAIT (Application Bug)

```bash
# CLOSE-WAIT means: remote side closed, but LOCAL application hasn't called close()
# Persistent or growing CLOSE-WAIT usually indicates a bug in your application

# Find which process has CLOSE-WAIT sockets
sudo ss -tnp state close-wait

# Look for pattern: always the same application, increasing count over time
# Fix: fix the application code to properly close connections
# Temporary workaround: restart the application

# Monitor growth over time
watch -n 5 'ss -Htn state close-wait | wc -l'
```

## Watch All States in Real Time

```bash
#!/bin/bash
# tcp-states.sh - Show TCP state summary

while true; do
    echo "=== TCP States $(date '+%H:%M:%S') ==="
    ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn
    echo "---"
    sleep 5
done
```

## Find Connections in Non-ESTABLISHED States

```bash
# Find any connection that's NOT in ESTABLISHED or LISTEN state
# These are connections in transition - useful for debugging handshake issues
ss -tan | grep -v -E "^(ESTAB|LISTEN|State)" | head -20
```

Understanding TCP states directly from `ss` gives you real-time visibility into your application's network behavior - high counts of unusual states can signal bugs, overload, or attacks.
