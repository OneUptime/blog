# How to Use sshguard to Protect SSH from Brute Force Attacks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Firewall

Description: Learn how to install and configure sshguard on Ubuntu to automatically block IP addresses attempting brute force attacks against SSH and other services.

---

Any server running SSH on a public IP will see constant login attempts from bots scanning for weak credentials. sshguard monitors authentication logs and automatically blocks IPs that show signs of brute force behavior. It works similarly to fail2ban but is lighter weight and written in C, making it fast and resource-efficient.

## How sshguard Works

sshguard parses log output, looking for failed authentication messages. When an IP accumulates enough failures in a short period, sshguard adds a firewall rule to block that IP for a configurable time. Repeat offenders get progressively longer bans. sshguard integrates with UFW, iptables, nftables, and other firewall backends.

## Installing sshguard

```bash
# Update the package list
sudo apt update

# Install sshguard
sudo apt install sshguard

# Verify the installation
sudo systemctl status sshguard
```

sshguard starts automatically after installation and begins monitoring SSH logs immediately.

## Understanding the Default Configuration

```bash
# View the main configuration file
cat /etc/sshguard/sshguard.conf
```

Key settings in the default configuration:

```text
# Backend: which firewall to use (auto-detected based on system)
BACKEND="/usr/lib/x86_64-linux-gnu/sshguard/sshg-fw-nft-sets"

# Log threshold: number of "danger points" before blocking
# SSH failed login = 10 points by default
THRESHOLD=30

# How long (seconds) to block an IP on the first offense
BLOCK_TIME=120

# How long (seconds) sshguard remembers attacks from an IP
DETECTION_TIME=1800

# Blacklist threshold: IPs that accumulate this many blocks get permanently listed
BLACKLIST_FILE=10:/etc/sshguard/blacklist.db
```

With the defaults: an IP that fails SSH login 3 times (3 * 10 = 30 points) within 30 minutes gets blocked for 120 seconds. Each subsequent offense doubles the block time.

## Customizing the Configuration

Edit `/etc/sshguard/sshguard.conf` to tune the behavior:

```bash
sudo nano /etc/sshguard/sshguard.conf
```

More aggressive settings for a production server:

```text
# Block after 2 failed attempts (20 points, each SSH failure = 10 points)
THRESHOLD=20

# Initial block: 5 minutes
BLOCK_TIME=300

# Remember attack history for 1 hour
DETECTION_TIME=3600

# Blacklist after 5 blocks; permanently block persistent attackers
BLACKLIST_FILE=5:/etc/sshguard/blacklist.db
```

After changing the config:

```bash
# Restart sshguard to apply changes
sudo systemctl restart sshguard
```

## Checking the Firewall Backend

sshguard auto-detects which firewall to use. Check which backend is active:

```bash
# View the configured backend
sudo grep BACKEND /etc/sshguard/sshguard.conf

# Verify blocks are being added to the firewall
# For nftables:
sudo nft list table ip sshguard

# For iptables:
sudo iptables -L sshguard -n -v

# For UFW (sshguard creates its own chain):
sudo iptables -L ufw-user-input -n -v | grep DROP
```

## Whitelisting Trusted IPs

Protect your own IPs from ever being blocked. This is critical - if you accidentally trigger the threshold from your management IP, you'll lock yourself out.

```bash
# Edit the whitelist file
sudo nano /etc/sshguard/whitelist
```

Add IP addresses, ranges, or hostnames:

```text
# Whitelist format: one entry per line
# Single IP address
203.0.113.10

# CIDR range for your office network
10.0.0.0/8

# IPv6 address
2001:db8::1

# Your home IP
198.51.100.25
```

```bash
# Restart sshguard for whitelist changes to take effect
sudo systemctl restart sshguard
```

## Monitoring sshguard Activity

```bash
# View sshguard log messages
sudo journalctl -u sshguard -f

# View recent sshguard activity
sudo journalctl -u sshguard --since "1 hour ago"

# Check currently blocked IPs (nftables backend)
sudo nft list set ip sshguard attackers

# Check currently blocked IPs (iptables backend)
sudo iptables -L sshguard -n

# View the blacklist of permanently blocked IPs
sudo cat /etc/sshguard/blacklist.db
```

Example log output:

```text
Mar 02 10:15:30 server sshguard[1234]: Attack from "192.168.99.5" on service SSH: 1 attack(s) in 1 seconds, 10/30 danger.
Mar 02 10:15:45 server sshguard[1234]: Blocking "192.168.99.5" for 120 seconds (1 attacks in 30 seconds, 30 danger).
Mar 02 10:17:55 server sshguard[1234]: Unblocking "192.168.99.5".
```

## Protecting Multiple Services

sshguard can protect other services beyond SSH. It understands log formats for multiple services and can monitor their logs:

```bash
# View which services sshguard monitors by default
# On Ubuntu, sshguard uses systemd journal
sudo journalctl -u sshguard | grep -i "reading"
```

Configure sshguard to read from specific log files for additional services:

```bash
sudo nano /etc/sshguard/sshguard.conf
```

```text
# Monitor additional log files
# This reads from the systemd journal (default on Ubuntu)
# To add specific log files, use the -l flag in the service command

# For example, to also monitor nginx failed auth logs:
# Add to the ExecStart line in the service file
```

Edit the systemd service to add additional log sources:

```bash
sudo systemctl edit sshguard
```

```ini
[Service]
ExecStart=
ExecStart=/usr/sbin/sshguard -l /var/log/auth.log -l /var/log/nginx/error.log
```

## Managing the Blacklist

The blacklist contains IPs that have been blocked repeatedly and are now permanently banned:

```bash
# View blacklisted IPs
sudo cat /etc/sshguard/blacklist.db

# Remove an IP from the blacklist (if you need to unblock a legitimate IP)
# Edit the file and remove the line with that IP
sudo nano /etc/sshguard/blacklist.db

# Or clear the entire blacklist and start fresh
sudo truncate -s 0 /etc/sshguard/blacklist.db
sudo systemctl restart sshguard
```

## Temporarily Stopping sshguard

For maintenance or troubleshooting:

```bash
# Stop sshguard (clears all current blocks)
sudo systemctl stop sshguard

# Flush any remaining firewall rules sshguard added
# For nftables:
sudo nft flush table ip sshguard

# Restart sshguard when done
sudo systemctl start sshguard
```

## Comparing sshguard with fail2ban

Both tools accomplish similar goals with different approaches:

| Feature | sshguard | fail2ban |
|---|---|---|
| Language | C (fast, low overhead) | Python |
| Configuration | Single config file | Per-service jail configs |
| Services | SSH + several common services | Highly customizable, any service |
| Firewall backends | iptables, nftables, UFW, pf | iptables, nftables, UFW, firewalld |
| Complexity | Simple | More complex, more flexible |
| Log sources | systemd journal or files | Regex-based log parsing |

sshguard is the right choice if you want something that just works for SSH protection with minimal configuration. fail2ban is better if you need fine-grained control over many different services.

## Verifying sshguard Is Working

To test that sshguard is responding to attacks (do this from a disposable IP or VM, not your main connection):

```bash
# Watch sshguard logs in real time
sudo journalctl -u sshguard -f

# From another machine, make several failed SSH attempts
# (Use an IP you don't mind getting blocked)
for i in {1..5}; do ssh invalid_user@your-server; done

# You should see sshguard log the attacks and issue a block
```

## Summary

sshguard is a lightweight, effective tool for protecting SSH from brute force attacks. After installation, it runs automatically and requires minimal configuration. Set a whitelist with your management IPs before anything else, tune the `THRESHOLD` and `BLOCK_TIME` to match your security requirements, and monitor the journal to verify it is catching attacks. For most Ubuntu servers exposed to the internet, sshguard combined with key-only authentication eliminates the practical risk of SSH brute force attacks.
