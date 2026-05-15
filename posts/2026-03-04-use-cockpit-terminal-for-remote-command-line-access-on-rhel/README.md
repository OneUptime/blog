# How to Use Cockpit Terminal for Remote Command-Line Access on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Terminal, Remote Access, Web Console

Description: Use the Cockpit web console's built-in terminal to manage RHEL systems remotely from a browser, without needing an SSH client.

---

Cockpit is a web-based management interface included with RHEL. Its built-in terminal provides a shell in your browser, which is useful when you do not have an SSH client available or when managing systems behind firewalls with only HTTPS access.

## Install and Enable Cockpit

```bash
# Cockpit is installed by default in many RHEL 9 installation variants, but verify

sudo dnf install -y cockpit

# Enable and start the Cockpit socket
sudo systemctl enable --now cockpit.socket

# Verify it is running
sudo systemctl status cockpit.socket
```

## Open the Firewall

```bash
# Allow Cockpit through the firewall
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-services
# Should include "cockpit"
```

## Access the Terminal

Open a browser and navigate to:

```bash
https://your-server-ip:9090
```

Log in with your RHEL system credentials. Once logged in, click "Terminal" in the left navigation menu. You get a shell running in the browser.

## Using the Terminal

The Cockpit terminal supports:

```bash
# All standard commands work
hostname
cat /etc/redhat-release
df -h
systemctl status sshd

# You can use sudo as usual
sudo dnf update --security

# Tab completion works
systemctl sta[TAB]

# You can run interactive commands
top
vim /etc/hosts
```

## Restrict Cockpit Access

For security, limit which networks can access Cockpit:

```bash
# Remove the broad Cockpit firewall allowance
sudo firewall-cmd --permanent --remove-service=cockpit

# Allow Cockpit only from the management network
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" service name="cockpit" accept'
sudo firewall-cmd --reload

# Create a Cockpit configuration to set the idle timeout
sudo mkdir -p /etc/cockpit
sudo tee /etc/cockpit/cockpit.conf << 'CONF'
[Session]
# Set idle timeout to 15 minutes
IdleTimeout = 15
CONF

# Restart Cockpit to apply the timeout change to new sessions
sudo systemctl try-restart cockpit.service
```

## Install Additional Cockpit Modules

```bash
# Install storage management module
sudo dnf install -y cockpit-storaged

# Ensure system management pages, including network settings, are installed
sudo dnf install -y cockpit-system

# Install Podman container management
sudo dnf install -y cockpit-podman
```

These modules add visual management pages alongside the terminal, letting you switch between graphical tools and the command line as needed.
