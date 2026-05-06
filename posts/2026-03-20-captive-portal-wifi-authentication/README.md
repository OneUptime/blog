# How to Set Up Captive Portal Authentication on a WiFi Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Captive Portal, WiFi, Authentication, Nodogsplash, OpenWrt, IPv4, Guest Network

Description: Learn how to set up a captive portal on a WiFi network using nodogsplash or pfSense to require users to authenticate before gaining internet access.

---

A captive portal intercepts HTTP traffic from unauthenticated clients and redirects them to a login page before granting internet access. This is standard for guest WiFi networks.

## Architecture Overview

```text
WiFi Client → DHCP → HTTP request → Captive Portal (redirect) → Login page
                                                                     ↓ (authenticated)
                                                              Internet access
```

## Setting Up nodogsplash on OpenWrt

```bash
# Install nodogsplash

opkg update && opkg install nodogsplash

# Enable and start
/etc/init.d/nodogsplash enable
/etc/init.d/nodogsplash start
```

## Basic nodogsplash Configuration

```bash
# /etc/config/nodogsplash
config nodogsplash
  option enabled '1'
  option gatewayinterface 'guest'    # OpenWrt guest network
  option gatewayport '2050'

  # Click-through with a custom splash page is the default behavior

  # Timeout for authenticated clients (minutes)
  option authidletimeout '120'
```

## Custom Splash Page

```html
<!-- /etc/nodogsplash/htdocs/splash.html -->
<!DOCTYPE html>
<html>
<head><title>Guest WiFi</title></head>
<body>
  <h2>Welcome to Guest WiFi</h2>
  <p>By connecting, you agree to our Terms of Service.</p>
  <form method="get" action="$authaction">
    <input type="hidden" name="tok" value="$tok">
    <input type="hidden" name="redir" value="$redir">
    <button type="submit">Connect</button>
  </form>
</body>
</html>
```

## pfSense Captive Portal

```text
Services → Captive Portal → Add
  Interface: GUESTNET
  Maximum concurrent connections: 100
  Idle timeout: 30 minutes
  Hard timeout: 480 minutes
  Authentication Method: None, don't authenticate users (click-through)
  Logout popup window: ✓
  After authentication Redirection URL: https://www.example.com
```

## DHCP for Captive Portal Network

```bash
# Isolated DHCP pool for guest network
# /etc/config/dhcp
config dhcp 'guest'
  option interface 'guest'
  option start '50'
  option limit '151'
  option leasetime '1h'
  list dhcp_option '3,192.168.100.1'
  list dhcp_option '6,192.168.100.1'
```

## Testing the Portal

```bash
# Connect to guest WiFi and verify redirect
curl -v http://example.com    # Should redirect to captive portal IP

# Check nodogsplash status
ndsctl status
ndsctl clients    # List authenticated clients
```

## Key Takeaways

- nodogsplash is a lightweight captive portal for OpenWrt; pfSense has a built-in captive portal for enterprise use.
- Always isolate the captive portal network with a separate VLAN and DHCP pool to prevent guest-to-LAN access.
- Use session timeouts and separate traffic shaping (for example, SQM) to prevent resource abuse on guest networks.
- For password-protected portals on pfSense, use RADIUS or Local User Manager authentication instead of click-through.
