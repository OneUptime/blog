# How to Configure Proxy Settings System-Wide on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Proxy, Configuration, Sysadmin

Description: Learn how to configure HTTP, HTTPS, and SOCKS proxy settings system-wide on Ubuntu, covering environment variables, APT proxy config, and per-user settings.

---

Working behind a corporate proxy or routing traffic through a specific gateway is a common requirement in enterprise environments. Ubuntu doesn't have a single central proxy configuration file - settings are scattered across environment variables, desktop settings, and application-specific configs. This tutorial covers all the relevant locations so your proxy configuration actually works for every tool and service.

## Understanding How Ubuntu Handles Proxies

Most command-line tools on Linux respect environment variables like `http_proxy`, `https_proxy`, and `no_proxy`. However, some system services (like APT and systemd services) have their own configuration mechanisms. To get full system-wide proxy coverage, you need to configure multiple locations.

The main configuration layers are:
- System-wide environment variables (`/etc/environment`)
- Shell profile files (`/etc/profile.d/`)
- APT-specific proxy settings
- systemd service proxy settings
- Desktop environment proxy settings (GNOME)

## Setting System-Wide Environment Variables

The `/etc/environment` file is the right place for system-wide environment variables that apply to all users and all sessions. It's not a shell script - just key=value pairs.

```bash
# Edit the system environment file
sudo nano /etc/environment
```

Add the proxy settings:

```bash
# HTTP proxy for plain HTTP traffic
http_proxy="http://proxy.example.com:3128/"
HTTP_PROXY="http://proxy.example.com:3128/"

# HTTPS proxy (usually the same server)
https_proxy="http://proxy.example.com:3128/"
HTTPS_PROXY="http://proxy.example.com:3128/"

# FTP proxy if needed
ftp_proxy="http://proxy.example.com:3128/"
FTP_PROXY="http://proxy.example.com:3128/"

# Addresses that should bypass the proxy
no_proxy="localhost,127.0.0.1,::1,10.0.0.0/8,192.168.0.0/16,.example.com"
NO_PROXY="localhost,127.0.0.1,::1,10.0.0.0/8,192.168.0.0/16,.example.com"
```

Note that both lowercase and uppercase versions are included. Different tools check different cases, so setting both ensures maximum compatibility.

If your proxy requires authentication, include credentials in the URL:

```bash
http_proxy="http://username:password@proxy.example.com:3128/"
```

Be cautious with credentials in this file - it's readable by all users by default. Consider using `chmod 600 /etc/environment` or use a separate authentication mechanism.

## Using /etc/profile.d/ for Shell Sessions

For interactive shell sessions and scripts, creating a file in `/etc/profile.d/` gives you more control. These files are sourced by `/etc/profile` for bash sessions.

```bash
# Create a proxy configuration script
sudo nano /etc/profile.d/proxy.sh
```

```bash
#!/bin/bash
# System-wide proxy settings
# Sourced automatically for interactive login shells

export http_proxy="http://proxy.example.com:3128/"
export HTTP_PROXY="http://proxy.example.com:3128/"
export https_proxy="http://proxy.example.com:3128/"
export HTTPS_PROXY="http://proxy.example.com:3128/"
export no_proxy="localhost,127.0.0.1,::1,.internal.example.com"
export NO_PROXY="localhost,127.0.0.1,::1,.internal.example.com"
```

```bash
# Make it executable
sudo chmod +x /etc/profile.d/proxy.sh

# Test by sourcing manually or starting a new shell
source /etc/profile.d/proxy.sh
echo $http_proxy
```

## Configuring APT to Use a Proxy

APT doesn't automatically read the `http_proxy` environment variable in all situations, especially when running under sudo. The reliable way to configure it is through APT's own config system.

```bash
# Create an APT proxy configuration file
sudo nano /etc/apt/apt.conf.d/95proxy
```

```text
# APT proxy configuration
Acquire::http::Proxy "http://proxy.example.com:3128/";
Acquire::https::Proxy "http://proxy.example.com:3128/";
Acquire::ftp::Proxy "http://proxy.example.com:3128/";

# Direct connections for specific hosts (no proxy)
Acquire::http::Proxy::ppa.launchpad.net "DIRECT";
Acquire::http::Proxy::security.ubuntu.com "DIRECT";
```

Test the APT proxy:

```bash
sudo apt update
```

If you want APT to pick up the environment variable instead, you can use:

```bash
# Tell APT to use environment variable (less reliable)
echo 'Acquire::http::Proxy "DIRECT";' | sudo tee /etc/apt/apt.conf.d/00no-proxy
```

## Configuring Proxy for systemd Services

Services running under systemd don't inherit user environment variables. To set proxy settings for a specific service:

```bash
# Create a systemd override directory for a service (e.g., docker)
sudo mkdir -p /etc/systemd/system/docker.service.d/

# Create the override file
sudo nano /etc/systemd/system/docker.service.d/http-proxy.conf
```

```ini
[Service]
# Proxy environment variables for this service
Environment="HTTP_PROXY=http://proxy.example.com:3128/"
Environment="HTTPS_PROXY=http://proxy.example.com:3128/"
Environment="NO_PROXY=localhost,127.0.0.1,.internal.example.com"
```

```bash
# Reload systemd and restart the service
sudo systemctl daemon-reload
sudo systemctl restart docker
```

For a global approach affecting all services, you can set `DefaultEnvironment` in `/etc/systemd/system.conf`:

```bash
sudo nano /etc/systemd/system.conf
```

```ini
[Manager]
DefaultEnvironment="HTTP_PROXY=http://proxy.example.com:3128/" "HTTPS_PROXY=http://proxy.example.com:3128/"
```

## GNOME Desktop Proxy Settings

If users are on the GNOME desktop, applications may use the GNOME proxy settings rather than environment variables. Configure them via the GUI under Settings - Network - Proxy, or use `gsettings`:

```bash
# Set manual proxy mode
gsettings set org.gnome.system.proxy mode 'manual'

# Set HTTP proxy
gsettings set org.gnome.system.proxy.http host 'proxy.example.com'
gsettings set org.gnome.system.proxy.http port 3128

# Set HTTPS proxy
gsettings set org.gnome.system.proxy.https host 'proxy.example.com'
gsettings set org.gnome.system.proxy.https port 3128

# Set no-proxy list
gsettings set org.gnome.system.proxy ignore-hosts "['localhost', '127.0.0.0/8', '10.0.0.0/8', '192.168.0.0/16', '.example.com']"
```

## SOCKS Proxy Configuration

For SOCKS proxies (commonly used with SSH tunnels):

```bash
# SOCKS5 proxy through SSH tunnel
# First, create the tunnel
ssh -D 1080 -N user@remote-server &

# Then set the SOCKS proxy environment
export all_proxy="socks5://127.0.0.1:1080"
export ALL_PROXY="socks5://127.0.0.1:1080"
```

For curl specifically:

```bash
# Test with curl using SOCKS5
curl --socks5 127.0.0.1:1080 https://example.com
```

## Verifying Proxy Configuration

After setting up, verify that tools are using the proxy:

```bash
# Check environment variables are set
env | grep -i proxy

# Test HTTP traffic through the proxy
curl -v http://example.com 2>&1 | grep "Connected to"

# Check if wget picks up the proxy
wget --debug http://example.com 2>&1 | grep proxy

# For apt, check what proxy it's using
apt-config dump | grep -i proxy
```

## Per-User Proxy Overrides

Individual users can override the system proxy by setting variables in `~/.bashrc` or `~/.profile`:

```bash
# Add to ~/.bashrc for interactive shells
export http_proxy="http://different-proxy.example.com:8080/"
export no_proxy="$no_proxy,.mylocaldomain"
```

This is useful when different users need different proxy settings, or a developer needs to bypass the proxy for local testing.

## Common Issues

Tools like `sudo` strip environment variables by default for security. If you need proxy settings to persist through sudo:

```bash
# Check sudo's env_keep setting
sudo visudo
```

Add this line to preserve proxy variables:

```text
Defaults env_keep += "http_proxy https_proxy no_proxy HTTP_PROXY HTTPS_PROXY NO_PROXY"
```

Another common issue is certificate verification failing through a transparent SSL inspection proxy. In that case, you'll need to install the corporate CA certificate:

```bash
# Install corporate CA certificate
sudo cp corporate-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

Configuring proxy settings across Ubuntu requires touching several different configuration files depending on what type of traffic and what tools are involved. The combination of `/etc/environment`, APT config, and systemd overrides covers the vast majority of use cases in a server environment.
