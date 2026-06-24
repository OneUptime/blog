# How to Configure Remote Desktop over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RDP, IPv6, Remote Desktop, Window, Linux, Networking

Description: Configure Windows Remote Desktop Protocol and xrdp on Linux to accept and establish connections over IPv6 addresses.

## Introduction

Remote Desktop Protocol (RDP) is the standard for graphical remote access to Windows systems. By default, RDP listens on all interfaces including IPv6. However, firewalls, clients, and server configurations often need explicit adjustments to work correctly with IPv6 addresses.

## Windows Server: Verifying IPv6 RDP Listening

On Windows, check that RDP is accepting IPv6 connections:

```powershell
# Check which addresses RDP (port 3389) is listening on

netstat -an | findstr :3389

# Expected output includes:
#   TCP    [::]:3389    [::]:0    LISTENING
# The [::] means it's listening on all IPv6 interfaces
```

## Windows Firewall: Allow RDP over IPv6

The built-in Remote Desktop firewall rules normally apply to both IPv4 and IPv6. If they are disabled or their remote address scope was narrowed previously, enable them and reset the scope:

```powershell
# Ensure the built-in Remote Desktop firewall rules are enabled
Get-NetFirewallRule -DisplayGroup "Remote Desktop" | Set-NetFirewallRule -Enabled True

# If the rule scope was previously narrowed, allow any remote address
Get-NetFirewallRule -DisplayGroup "Remote Desktop" | Set-NetFirewallRule -RemoteAddress Any
```

## Connecting from Windows Client to IPv6 Host

Use the Windows built-in Remote Desktop client (`mstsc.exe`). When you specify an IPv6 literal with a port, wrap it in square brackets:

```powershell
mstsc /v:[2001:db8::10]:3389

# For a custom port:
mstsc /v:[2001:db8::10]:3390
```

## Connecting from Linux Using xfreerdp

The `xfreerdp` client supports IPv6 natively:

```bash
# Connect to a Windows host using its IPv6 address
xfreerdp /v:[2001:db8::10] /u:Administrator /p:YourPassword /size:1920x1080

# Disable certificate warnings for lab environments
xfreerdp /v:[2001:db8::10] /u:Administrator /p:YourPassword /cert:ignore
```

## Configuring xrdp on Linux for IPv6

Install and configure xrdp to listen on IPv6:

```bash
# Install xrdp on Ubuntu
sudo apt install -y xrdp

# Edit xrdp configuration to listen on IPv6
sudo nano /etc/xrdp/xrdp.ini
```

Add or confirm the following in `/etc/xrdp/xrdp.ini`:

```ini
# Listen on all interfaces; on IPv6-capable systems xrdp can bind on ::
port=3389
```

Restart and verify:

```bash
sudo systemctl restart xrdp

# Verify listening on IPv6
ss -tlnp | grep 3389
# On IPv6-capable systems this commonly shows [::]:3389 or :::3389
```

## Firewall Configuration on Linux

Open port 3389 for IPv6 using UFW or ip6tables:

```bash
# Using UFW (IPv6 must be enabled in /etc/default/ufw)
sudo ufw allow proto tcp from any to any port 3389 comment "xrdp IPv6"

# Using ip6tables directly on Ubuntu/Debian
sudo ip6tables -A INPUT -p tcp --dport 3389 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

## Troubleshooting

**Connection refused on IPv6 but works on IPv4**: Check if xrdp/RDP is actually listening on an IPv6 socket and not only on `0.0.0.0`.

**Certificate errors**: RDP over IPv6 uses the same certificate mechanism as IPv4. Ensure the certificate matches the hostname or IP literal you're connecting to.

**Firewall blocking**: Cloud providers (AWS, Azure) often have separate security group rules - add an inbound rule for port 3389/TCP with an IPv6 CIDR source.

## Conclusion

Configuring RDP over IPv6 is straightforward once firewalls are updated and the client connection syntax handles IPv6 literals correctly. Both Windows native RDP and Linux xrdp support IPv6 with minimal configuration changes.
