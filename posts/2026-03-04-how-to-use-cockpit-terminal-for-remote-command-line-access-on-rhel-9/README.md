# How to Use Cockpit Terminal for Remote Command-Line Access on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Cockpit

Description: Step-by-step guide on use cockpit terminal for remote command-line access on RHEL with practical examples and commands.

---

Cockpit's terminal feature provides browser-based command-line access to your RHEL servers, useful for remote administration.

## Install Cockpit

```bash
sudo dnf install -y cockpit cockpit-storaged cockpit-networkmanager
```

## Enable and Start Cockpit

```bash
sudo systemctl enable --now cockpit.socket
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload
```

## Access the Terminal

Open your browser and navigate to:

```
https://your-server-ip:9090
```

Log in with your system credentials. Click "Terminal" in the left sidebar.

## Terminal Features

The Cockpit terminal supports:

- Full terminal emulation in the browser
- Copy and paste operations
- Multiple concurrent sessions
- Automatic session reconnection

## Configure Terminal Settings

Adjust terminal appearance in the browser:

```bash
# The terminal respects your shell configuration
# Edit .bashrc for customization
vi ~/.bashrc
```

## Use Cockpit for System Administration

From the terminal, you can perform any administrative task:

```bash
# Check system status
systemctl status
journalctl -xe

# Manage packages
sudo dnf update -y

# Monitor resources
top
df -h
free -m
```

## Restrict Terminal Access

Limit which users can access Cockpit:

```bash
# Create a cockpit access group
sudo groupadd cockpit-users

# Add allowed users
sudo usermod -aG cockpit-users admin1

# Configure PAM for Cockpit
sudo vi /etc/pam.d/cockpit
# Add: auth required pam_succeed_if.so user ingroup cockpit-users
```

## Enable Session Recording

Record terminal sessions for audit purposes:

```bash
sudo dnf install -y cockpit-session-recording tlog
```

Configure tlog for specific users:

```bash
sudo usermod -s /usr/bin/tlog-rec-session auditeduser
```

## Access Multiple Servers

Cockpit can manage multiple servers from a single dashboard:

```bash
# On the dashboard server, add remote hosts
# Navigate to Dashboard and click "Add Server"
```

## Conclusion

Cockpit's terminal provides convenient browser-based access to RHEL servers without requiring SSH client software. Use session recording and access controls to maintain security and audit compliance.

