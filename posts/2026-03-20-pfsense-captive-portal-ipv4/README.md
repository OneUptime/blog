# How to Configure Captive Portal for IPv4 on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, Captive Portal, IPv4, Guest Network, Authentication, Hotspots

Description: Configure a captive portal on pfSense to require IPv4 clients on a guest network to authenticate through a login page before gaining internet access.

## Introduction

A captive portal intercepts HTTP traffic and redirects unauthenticated clients to a login page. pfSense provides a built-in captive portal that supports local user accounts, RADIUS authentication, and customizable login pages.

## Step 1: Create Guest VLAN Interface

Ensure you have a dedicated guest interface (e.g., `GUEST` / `OPT2`) with:
- IP: `172.16.1.1/24`
- DHCP enabled (range: 172.16.1.100–172.16.1.200)

## Step 2: Enable Captive Portal

Navigate to **Services > Captive Portal > Add**:

```text
Zone name:          GUEST
Interface:          GUEST (OPT2)
Enable Captive Portal: checked

Authentication:
  Authentication method: Local User Manager / Vouchers

Idle timeout:       30 minutes
Hard timeout:       240 minutes (max session length)
Concurrent user logins: 1 per user

Redirection URL:    (leave blank - redirect to original URL after login)
```

## Step 3: Custom Login Page (Optional)

Navigate to **Services > Captive Portal > [GUEST] > HTML Page Contents**:
- Upload or paste custom HTML login form
- Form must POST to `$PORTAL_ACTION$` and include `auth_user`, `auth_pass`, a hidden `redirurl` field, and a submit button named `accept`

```html
<html>
<body>
<h1>Guest Wi-Fi Login</h1>
<form method="post" action="$PORTAL_ACTION$">
  Username: <input type="text" name="auth_user"><br>
  Password: <input type="password" name="auth_pass"><br>
  <input type="hidden" name="redirurl" value="$PORTAL_REDIRURL$">
  <input type="submit" name="accept" value="Login">
</form>
</body>
</html>
```

## Step 4: Create Guest Users

Navigate to **System > User Manager > Add**:
```text
Username: guest1
Password: Guest@2025
```

Or navigate to **Services > Captive Portal > [GUEST] > Vouchers**:
- Create voucher rolls for time-limited access (e.g., 2-hour vouchers)

## Step 5: RADIUS Authentication

Navigate to **Services > Captive Portal > [GUEST]**:
```text
Authentication method: RADIUS Authentication
Primary RADIUS server:  10.1.1.50
RADIUS server port:     1812
RADIUS shared secret:   RadiusSecret
```

## Firewall Rules for Captive Portal

pfSense automatically manages the captive portal firewall rules. The portal:
1. Blocks all traffic from unauthenticated clients except DNS and HTTP
2. Redirects HTTP requests to the login page
3. Allows authenticated clients through

Navigate to **Firewall > Rules > GUEST**:
- Add: Allow DNS from GUEST net to any port 53 (ensures captive portal detection works)

## Monitor Sessions

Navigate to **Status > Captive Portal**:
- Shows authenticated users, IP, MAC, session start, traffic consumed

```bash
# pfSense CLI

# List authenticated users for a zone (replace GUEST with your zone name)
/usr/local/bin/php-cgi -q /usr/local/bin/captiveportal_gather_stats.php 'GUEST' 'loggedin'

# Inspect captive portal pf anchors and rules
pfSsh.php playback pfanchordrill
```

## Conclusion

pfSense captive portal redirects HTTP traffic from unauthenticated guest IPv4 clients to a login page. Configure the zone on the guest interface, choose local users or RADIUS authentication, set session time limits, and optionally customize the HTML login page. The captive portal engine handles all firewall rule management automatically.
