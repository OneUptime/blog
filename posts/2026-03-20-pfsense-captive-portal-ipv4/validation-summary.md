# Validation Summary: How to Configure Captive Portal for IPv4 on pfSense

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- pfSense (Captive Portal service)
- IPv4 networking, VLAN/guest interfaces
- DHCP
- HTML form authentication
- RADIUS authentication (port 1812)
- pf packet filter (used by Captive Portal in pfSense 2.7.0+ / Plus 22.05+)

## Sources Consulted
- [pfSense Captive Portal — Zone Configuration Options](https://docs.netgate.com/pfsense/en/latest/captiveportal/configuration.html)
- [pfSense Captive Portal — Troubleshooting](https://docs.netgate.com/pfsense/en/latest/troubleshooting/captiveportal.html)
- [pfSense Captive Portal — Status](https://docs.netgate.com/pfsense/en/latest/monitoring/status/captiveportal.html)
- [pfSense GitHub source: services_captiveportal.php](https://github.com/pfsense/pfsense/blob/master/src/usr/local/www/services_captiveportal.php)
- [pfSense docs source: captive-portal-redirection.rst](https://github.com/pfsense/docs/blob/master/source/captiveportal/captive-portal-redirection.rst)
- [Netgate Forum: How to list authenticated users from shell](https://forum.netgate.com/topic/142351/how-to-list-authenticated-users-from-shell)

## Issues Found

1. **Custom HTML login form was missing required pfSense fields.** pfSense Captive Portal documentation requires the form to POST to `$PORTAL_ACTION$`, include a hidden `redirurl` field set to `$PORTAL_REDIRURL$`, and use a submit button named `accept`. The original example only had `auth_user`, `auth_pass`, and a generic submit input — that form would not authenticate against pfSense. Added the `action` attribute, the hidden `redirurl` input, and the `name="accept"` attribute on the submit button.

2. **`pfctl -t captiveportal -T show` is not a documented pfSense command.** While pfSense Captive Portal does use pf in version 2.7.0 (CE) / 22.05 (Plus) and later for L2 ether processing, the documented anchors are zone-scoped (`cpzoneid_<id>_<purpose>`), not a flat table named `captiveportal`. Replaced with the documented `captiveportal_gather_stats.php` PHP-CGI invocation (per a Netgate developer response on the official forum) and the `pfSsh.php playback pfanchordrill` script referenced in the official troubleshooting docs.

## Review Notes
- The RADIUS shared secret `RadiusSecret` and the example user password `Guest@2025` are clearly placeholders; readers should obviously substitute real credentials. Worth flagging only because they appear inline; no change needed.
- The post's claim that the portal "blocks all traffic from unauthenticated clients except DNS and HTTP" is broadly correct in spirit (DNS is allowed by default for portal detection, HTTP/HTTPS is intercepted and redirected), but readers should know HTTPS interception requires a configured SSL certificate on the portal — not strictly a technical error in the post, just a nuance.
- Hard timeout of 240 minutes and idle timeout of 30 minutes are reasonable defaults; these are configurable per zone and the values match the documented field semantics.
- The `pfctl` table behavior may differ across pfSense releases; the replacement commands (`captiveportal_gather_stats.php` and `pfSsh.php playback pfanchordrill`) are aligned with current Netgate documentation.
