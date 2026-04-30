# How to Log Dropped Packets in iptables for Security Auditing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Linux, Security, Logging, Firewall, Auditing

Description: Configure iptables LOG target to record dropped packets to syslog for security auditing, intrusion detection, and traffic analysis.

Logging dropped packets gives you visibility into what your firewall is blocking. Without logs, you're flying blind - you can't detect attacks, debug rules, or prove compliance.

## How iptables Logging Works

The `LOG` target writes packet metadata to the kernel log (viewable via `dmesg` or `/var/log/syslog`). Unlike `DROP`, `LOG` is non-terminating - the packet continues through the chain, so you must follow it with `DROP`.

```bash
# Basic pattern: LOG before DROP

sudo iptables -A INPUT -p tcp --dport 23 -j LOG --log-prefix "TELNET-ATTEMPT: "
sudo iptables -A INPUT -p tcp --dport 23 -j DROP
```

## Logging All Dropped Input Traffic

Add a LOG rule at the end of your INPUT chain before the final DROP/REJECT:

```bash
# First, set default policy to ACCEPT (rules will drop)
sudo iptables -P INPUT ACCEPT

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Log everything else before dropping
sudo iptables -A INPUT -j LOG \
  --log-prefix "IPT-DROP-INPUT: " \
  --log-level 4

# Then drop it
sudo iptables -A INPUT -j DROP
```

## Using Log Levels

iptables supports kernel log levels 0-7 (emergency to debug):

```bash
# Log level 4 = WARNING (common for security events)
sudo iptables -A INPUT -j LOG --log-level 4 --log-prefix "WARN-DROP: "

# Log level 6 = INFO (less urgent)
sudo iptables -A INPUT -j LOG --log-level 6 --log-prefix "INFO-DROP: "

# Levels:
# 0 = emerg, 1 = alert, 2 = crit, 3 = err
# 4 = warning, 5 = notice, 6 = info, 7 = debug
```

## Limiting Log Rate

Without rate limiting, a flood attack can fill your disk with logs:

```bash
# Log at most 5 packets per minute to prevent log flooding
sudo iptables -A INPUT -m limit --limit 5/min --limit-burst 10 \
  -j LOG --log-prefix "RATE-LIMITED-DROP: " --log-level 4
sudo iptables -A INPUT -j DROP
```

## Logging Specific Threats

Insert targeted logging rules before broader ACCEPT/DROP rules so they can match first:

```bash
# Track repeated TCP SYN probes from the same source, then log once they cross the threshold
sudo iptables -I INPUT 1 -p tcp --syn \
  -m recent --name portscan --set
sudo iptables -I INPUT 2 -p tcp --syn \
  -m recent --rcheck --seconds 60 --hitcount 10 --name portscan \
  -j LOG --log-prefix "PORT-SCAN: " --log-level 4

# Track repeated new SSH connections, then log once they cross the threshold
sudo iptables -I INPUT 3 -p tcp --dport 22 -m state --state NEW \
  -m recent --name sshbf --set
sudo iptables -I INPUT 4 -p tcp --dport 22 -m state --state NEW \
  -m recent --rcheck --seconds 60 --hitcount 5 --name sshbf \
  -j LOG --log-prefix "SSH-BRUTE: " --log-level 4

# Sample TCP SYN traffic at a limited rate to avoid log flooding
sudo iptables -I INPUT 5 -p tcp --syn \
  -m limit --limit 10/s --limit-burst 20 \
  -j LOG --log-prefix "SYN-TRAFFIC: "
```

## Reading iptables Logs

Log entries appear in `/var/log/syslog` or `/var/log/kern.log`:

```bash
# View live iptables log entries
sudo tail -f /var/log/syslog | grep "IPT-DROP"

# Filter by prefix
sudo grep "SSH-BRUTE" /var/log/syslog

# Count drops by source IP
sudo grep "IPT-DROP-INPUT" /var/log/syslog \
  | grep -oP 'SRC=\S+' | sort | uniq -c | sort -rn | head -20

# Example log entry:
# Mar 19 10:32:01 host kernel: IPT-DROP-INPUT: IN=eth0 OUT=
#   MAC=... SRC=1.2.3.4 DST=10.0.0.1 LEN=44 TOS=0x00
#   PREC=0x00 TTL=52 ID=0 PROTO=TCP SPT=54321 DPT=22 SYN
```

## Sending Logs to a Separate File

Configure rsyslog to write iptables logs to a dedicated file:

```bash
sudo tee /etc/rsyslog.d/iptables.conf > /dev/null <<'EOF'
if $msg contains "IPT-" then {
  action(type="omfile" file="/var/log/iptables.log")
  stop
}
EOF

sudo systemctl restart rsyslog

# Now iptables logs go to /var/log/iptables.log
sudo tail -f /var/log/iptables.log
```

## Log with NFLOG for Userspace Processing

For more advanced processing (sending to SIEM), replace the `LOG` rule in the earlier examples with the non-terminating `NFLOG` target and keep the separate `DROP` rule:

```bash
# Replace your LOG rule with NFLOG before the matching DROP rule
sudo iptables -A INPUT -j NFLOG --nflog-group 1 --nflog-prefix "DROP: "

# Install and configure ulogd2 to forward logs to a database or syslog
sudo apt install ulogd2
```

Packet logging transforms your firewall from a silent barrier into a security sensor, enabling you to detect intrusion attempts and continuously improve your ruleset.
