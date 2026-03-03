# How to Set Up a Tor Relay on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Tor, Privacy, Network, Security

Description: Step-by-step guide to setting up a Tor relay on Ubuntu, including configuration, bandwidth limits, and monitoring relay health.

---

Running a Tor relay contributes bandwidth to the Tor network, helping users around the world access the internet privately. There are three types of relays: guard/middle relays (which carry traffic between nodes), exit relays (which send traffic to the final destination), and bridges (which help censored users connect to Tor). This guide covers setting up a middle relay, which is the easiest starting point and carries no legal risk associated with exit traffic.

## Prerequisites

- Ubuntu 22.04 or newer server
- A static IP address or stable hostname
- At least 10 Mbps of bandwidth available for Tor
- Root or sudo access

Running a relay requires you to open certain ports in your firewall and ideally have a server with reliable uptime. A cloud VPS works well for this purpose.

## Installing Tor

Ubuntu's default repositories often contain older Tor versions. The Tor Project maintains their own repository with current releases.

```bash
# Install required packages
sudo apt install -y apt-transport-https gnupg

# Add the Tor Project's signing key
wget -qO- https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc \
  | gpg --dearmor \
  | sudo tee /usr/share/keyrings/tor-archive-keyring.gpg > /dev/null

# Add the Tor repository
echo "deb [signed-by=/usr/share/keyrings/tor-archive-keyring.gpg] \
  https://deb.torproject.org/torproject.org $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/tor.list

# Update and install Tor
sudo apt update
sudo apt install -y tor deb.torproject.org-keyring
```

## Configuring the Relay

The main Tor configuration file is `/etc/tor/torrc`. Back it up before editing:

```bash
sudo cp /etc/tor/torrc /etc/tor/torrc.backup
sudo nano /etc/tor/torrc
```

Replace the contents with a relay configuration:

```text
# Basic relay settings
Nickname MyRelayName          # Choose a unique name for your relay
ContactInfo admin@example.com # Provide a real contact email
ORPort 9001                   # Port other relays use to connect to you
ExitRelay 0                   # Set to 0 for a middle relay (not exit)

# Bandwidth settings
# These limit how much bandwidth the relay uses
RelayBandwidthRate 10 MB      # Sustained rate (per second)
RelayBandwidthBurst 20 MB     # Peak rate (per second)

# Directory settings - helps the network by mirroring directory info
DirPort 9030                  # Optional: serve directory info on this port

# Log configuration
Log notice file /var/log/tor/notices.log

# Accounting (optional) - limits total monthly bandwidth
# AccountingMax 100 GB
# AccountingStart month 1 00:00
```

Reload Tor after saving:

```bash
sudo systemctl reload tor
sudo systemctl status tor
```

## Opening Firewall Ports

Allow incoming connections on the ORPort (and DirPort if configured):

```bash
# Allow the OR port for relay connections
sudo ufw allow 9001/tcp comment "Tor ORPort"

# Allow directory port (optional)
sudo ufw allow 9030/tcp comment "Tor DirPort"

# Reload firewall rules
sudo ufw reload
sudo ufw status
```

## Verifying Your Relay is Working

After starting Tor, it takes about an hour for the relay to appear in the network consensus and a few days to accumulate guard probability. Check relay status:

```bash
# Check Tor logs for bootstrap status
sudo tail -f /var/log/tor/notices.log

# Look for a line like:
# [notice] Self-testing indicates your ORPort is reachable from the outside. Excellent.
# [notice] Bootstrapped 100% (done): Done
```

### Checking Relay Status Online

Once the relay has been running for a few hours, look it up on Tor metrics:

```bash
# Find your relay fingerprint
sudo cat /var/lib/tor/fingerprint

# Search for your relay on:
# https://metrics.torproject.org/rs.html
# Use your fingerprint or nickname
```

## Monitoring Relay Performance

The `nyx` tool provides a real-time terminal interface for monitoring Tor relays:

```bash
# Install nyx
sudo apt install -y nyx

# Grant your user access to the Tor control socket
sudo usermod -aG debian-tor $USER

# Enable the control port in torrc
echo "ControlSocket /var/run/tor/control" | sudo tee -a /etc/tor/torrc
echo "CookieAuthentication 1" | sudo tee -a /etc/tor/torrc
sudo systemctl reload tor

# Launch nyx (may need to re-login for group membership)
nyx
```

Nyx shows bandwidth usage, connection counts, log messages, and relay configuration in a real-time display.

## Configuring Bandwidth Accounting

If you have a monthly bandwidth cap, Tor's accounting feature prevents you from exceeding it:

```bash
# Edit torrc to add accounting
sudo nano /etc/tor/torrc
```

Add these lines:

```text
# Stop accepting traffic after 150 GB per calendar month
AccountingMax 150 GB
AccountingStart month 1 00:00  # Reset on the 1st of each month
```

When the limit is reached, Tor hibernates until the next accounting period starts. You can check the current accounting status:

```bash
# Check accounting status via Tor control port
sudo -u debian-tor tor --verify-config
echo "getinfo accounting/bytes" | sudo nc -q 1 /var/run/tor/control
```

## Keeping the Relay Updated

Keep Tor updated to ensure you have the latest security patches and protocol improvements:

```bash
# Enable unattended upgrades for security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Manually update Tor
sudo apt update && sudo apt upgrade -y tor
```

## Troubleshooting Common Issues

### ORPort Not Reachable

If the Tor logs show the ORPort is not reachable from the outside:

```bash
# Verify Tor is listening on the correct port
ss -tlnp | grep 9001

# Test from a different machine
nc -zv <YOUR_SERVER_IP> 9001

# Check if a NAT or upstream firewall is blocking the port
# Contact your hosting provider if ports are blocked at the router level
```

### Relay Not Appearing in Network Consensus

New relays take 3-4 hours to appear in the consensus. If it takes longer:

```bash
# Check that the relay fingerprint is listed in the running Tor instance
sudo cat /var/lib/tor/fingerprint

# Check the logs for any guard or consensus warnings
sudo grep -i "warn\|error" /var/log/tor/notices.log
```

### High CPU Usage

If Tor is consuming excessive CPU:

```bash
# Check if descriptor building is happening frequently
sudo grep -i "descriptor" /var/log/tor/notices.log | tail -20

# Reduce the number of file descriptors if needed
# Add to torrc:
# MaxOpenFiles 8192
```

Running a middle relay is one of the most impactful ways to support the Tor network. The more relays available, the faster and more resilient the network becomes for users who depend on it.
