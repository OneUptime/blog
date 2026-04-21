# How to Understand TCP Connection States (ESTABLISHED, TIME_WAIT, CLOSE_WAIT)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Networking, Connection States, ss, Troubleshooting

Description: Understand the complete TCP state machine and what each state means for application behavior, resource usage, and troubleshooting connection problems.

## Introduction

TCP connections progress through a well-defined state machine from creation to termination. Understanding each state helps you diagnose connection problems, identify resource leaks, and tune your server configuration. The `ss` command on Linux is the primary tool for inspecting connection states.

## Key TCP States

```bash
# View all connection states

ss -tn state all

# Count connections per state
ss -Htn state all | awk '{print $1}' | sort | uniq -c | sort -rn
```

## State Reference

| State | Who Has It | Meaning |
|---|---|---|
| LISTEN | Server | Waiting for incoming connections |
| SYN_SENT | Client | SYN sent, waiting for SYN-ACK |
| SYN_RECV | Server | SYN received, SYN-ACK sent, waiting for ACK |
| ESTABLISHED | Both | Data can flow in both directions |
| FIN_WAIT1 | Active closer | FIN sent, waiting for ACK or FIN |
| FIN_WAIT2 | Active closer | ACK received, waiting for remote FIN |
| TIME_WAIT | Active closer (or both in simultaneous close) | Both FINs exchanged, waiting 2×MSL before reuse |
| CLOSE_WAIT | Passive closer | FIN received, waiting for application to close |
| LAST_ACK | Passive closer | FIN sent, waiting for final ACK |
| CLOSING | Both | Both sent FIN simultaneously |
| CLOSED | Neither | Connection fully terminated |

## Examining Each State

```bash
# ESTABLISHED connections (healthy, active)
ss -tn state established

# TIME_WAIT connections (closing, waiting for the TIME_WAIT timer)
ss -Htn state time-wait | wc -l
# High count = many short-lived connections (normal for HTTP/1.0 servers)

# CLOSE_WAIT connections (application not closing its end)
ss -tn state close-wait
# Persistent CLOSE_WAIT = application bug (not calling close())

# SYN_RECV connections (half-open, during handshake or SYN flood)
ss -Htn state syn-recv | wc -l
# High count = potential SYN flood attack

# LISTEN sockets (services accepting connections)
ss -tlnp
```

## TIME_WAIT Explained

```bash
# TIME_WAIT lasts 2×MSL (Maximum Segment Lifetime); Linux uses about 60 seconds
# Purpose: ensures late packets for old connections don't confuse new connections

# View TIME_WAIT count
ss -Htn state time-wait | wc -l

# Check FIN_WAIT2 timeout (not TIME_WAIT timeout)
sysctl net.ipv4.tcp_fin_timeout   # Controls orphaned FIN_WAIT2 timeout only

# Enable TIME_WAIT socket reuse when protocol-safe (use with care; default may be loopback-only)
sysctl -w net.ipv4.tcp_tw_reuse=1

# View TIME_WAIT sockets with addresses
ss -tn state time-wait | head -20
```

## CLOSE_WAIT Explained

```bash
# CLOSE_WAIT: remote side closed, local app hasn't called close() yet
# Persistent CLOSE_WAIT means the application is holding connections open

# Find which process has CLOSE_WAIT sockets
ss -tnp state close-wait

# Check if socket count grows over time (memory/fd leak)
watch -n 5 "ss -Htn state close-wait | wc -l"
# If it keeps growing: application is not closing connections properly

# Application fix (Python example):
# Always use context managers or explicit close()
with socket.socket() as s:
    s.connect(...)
    # ... do work ...
# s.close() called automatically
```

## Conclusion

TCP states are a live view of your server's connection lifecycle. ESTABLISHED is normal; a large number is expected for busy services. High TIME_WAIT indicates many short connections being actively closed. Persistent CLOSE_WAIT almost always indicates an application bug where code is not closing connections after the remote end has finished. Monitoring state counts over time helps detect connection leaks and capacity issues.
