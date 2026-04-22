# How to Save iptables Rules Permanently on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Ubuntu, Linux, Firewall, Persistence, Security

Description: Save iptables rules on Ubuntu so they survive reboots using iptables-persistent, netfilter-persistent, or systemd service methods.

iptables rules are stored in memory - they disappear on reboot unless explicitly saved. Ubuntu provides several methods to persist rules, with iptables-persistent being the standard approach.

## Method 1: iptables-persistent (Recommended)

```bash
# Install iptables-persistent

sudo apt install iptables-persistent -y

# During installation, a dialog asks:
# "Save current IPv4 rules?" → Yes
# "Save current IPv6 rules?" → Yes/No

# Rules are saved to:
# /etc/iptables/rules.v4 (IPv4)
# /etc/iptables/rules.v6 (IPv6)

# After install, view saved rules
sudo cat /etc/iptables/rules.v4
```

## Save Rules After Making Changes

When you add new rules later, save them again:

```bash
# Save current rules
sudo iptables-save -f /etc/iptables/rules.v4
sudo ip6tables-save -f /etc/iptables/rules.v6

# Or use the netfilter-persistent service
sudo netfilter-persistent save

# Verify the saved file was updated
ls -la /etc/iptables/rules.v4
sudo cat /etc/iptables/rules.v4
```

## Method 2: Systemd Service

Create a systemd service that restores rules at boot:

```bash
# Save current rules
sudo mkdir -p /etc/iptables
sudo iptables-save -f /etc/iptables/rules.v4

# Create systemd service
sudo tee /etc/systemd/system/iptables-restore.service << 'EOF'
[Unit]
Description=Restore iptables rules
Before=network-pre.target
Wants=network-pre.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/iptables-restore /etc/iptables/rules.v4
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable iptables-restore
sudo systemctl start iptables-restore
```

## Method 3: /etc/rc.local (Legacy)

```bash
# Create rc.local
sudo tee /etc/rc.local > /dev/null << 'EOF'
#!/bin/sh -e
# Restore iptables rules
/usr/sbin/iptables-restore /etc/iptables/rules.v4
exit 0
EOF

# Make rc.local executable so systemd-rc-local-generator picks it up
sudo chmod +x /etc/rc.local
sudo systemctl daemon-reload
```

## Verify Rules Load on Boot

```bash
# Test by simulating a reboot restore
sudo iptables -F  # Flush current rules
sudo iptables-restore /etc/iptables/rules.v4

# Verify rules are back
sudo iptables -L -n -v
```

## What the Saved File Looks Like

```bash
sudo cat /etc/iptables/rules.v4

*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]
-A INPUT -i lo -j ACCEPT
-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 443 -j ACCEPT
COMMIT
*nat
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]
-A POSTROUTING -s 192.168.1.0/24 -o eth0 -j MASQUERADE
COMMIT
```

## Update Workflow

```bash
# Make rule changes
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT

# Test the changes (verify nothing is broken)
# ...

# When satisfied, save permanently
sudo iptables-save -f /etc/iptables/rules.v4
sudo netfilter-persistent reload
```

Saving rules should be a reflex after every change - rules in memory disappear at the next reboot, potentially exposing your server until someone notices the firewall is gone.
