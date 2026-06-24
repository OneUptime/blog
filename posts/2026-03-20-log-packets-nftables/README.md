# How to Log Packets with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Logging, Security, Networking, Monitoring

Description: Configure nftables packet logging to capture firewall events in the kernel log and syslog for security auditing and troubleshooting.

## Introduction

Packet logging is essential for security auditing, debugging firewall rules, and detecting attacks. nftables provides a `log` statement that writes packet information to the kernel log, which you can read via `dmesg` or collect with journald or syslog. You can log before accepting, dropping, or rejecting packets.

## Prerequisites

- nftables installed
- Root access
- Optional: `syslog` or `journald` for persistent log viewing

These examples assume you already have an `inet filter` table with an `input` chain; the full configuration example below creates them from scratch.

## Basic Logging Before Drop

The `log` statement is placed before the terminal action (drop, accept, reject). It does not stop rule processing - it is a non-terminal action.

```bash
# Log all dropped packets with a prefix for easy grepping

nft add rule inet filter input log prefix "INPUT DROP: " level warn drop
```

## Log Specific Traffic

Log only relevant traffic to reduce noise. This example logs new SSH connection attempts:

```bash
# Log new SSH connections before accepting them
nft add rule inet filter input tcp dport 22 ct state new \
    log prefix "SSH new connection: " level info accept
```

## Log Flags for Additional Information

The `log` statement supports flags to include extra packet details:

```bash
# Log with TCP options and IP options included
nft add rule inet filter input ct state invalid \
    log prefix "INVALID packet: " flags tcp options flags ip options drop
```

Available flags: `tcp sequence`, `tcp options`, `ip options`, `skuid`, `ether`, `all`

## Full Configuration with Logging

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept

        # Log and drop invalid packets
        ct state invalid log prefix "INVALID: " level warn drop

        # Log and accept SSH
        tcp dport 22 ct state new log prefix "SSH: " level info accept

        # Allow web traffic (no logging to reduce volume)
        tcp dport { 80, 443 } accept

        # Log everything else that reaches the end (default drop)
        log prefix "INPUT DROP: " level warn
    }

    chain forward {
        type filter hook forward priority 0; policy drop;

        log prefix "FORWARD DROP: " level warn
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## View Logs

```bash
# View nftables log messages in the kernel ring buffer
dmesg | grep "INPUT DROP"

# View via journalctl (if using systemd)
journalctl -k | grep "INPUT DROP"

# View syslog (Debian/Ubuntu)
grep "INPUT DROP" /var/log/syslog

# Real-time log monitoring
journalctl -kf | grep -E "SSH|DROP"
```

## Route Logs to a Specific Syslog File

Use a distinct log prefix so syslog can route firewall messages to a dedicated log file:

```bash
# Use a unique prefix, then configure rsyslog to write matching messages to a file
nft add rule inet filter input log prefix "FW: " level warn drop
```

Then in `/etc/rsyslog.d/nftables.conf`:

```text
:msg, startswith, "FW: " /var/log/nftables.log
& stop
```

## Conclusion

nftables logging provides visibility into what your firewall is accepting and dropping. Use descriptive prefixes to make log filtering easy, log only what matters to keep log volume manageable, and combine with journald or syslog for persistent storage. Logging is invaluable during troubleshooting and security audits.
