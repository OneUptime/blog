# Validation Summary: How to Configure UFW to Allow Specific IP Addresses on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- UFW
- Linux firewall rules
- CIDR notation
- Bash scripting
- cron
- DNS lookup with dig

## Sources Consulted
- Ubuntu Server documentation: Firewall / UFW: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Ubuntu manpage for ufw(8): https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu Community Help Wiki: UFW: https://help.ubuntu.com/community/UFW
- Local UFW CLI help and manpage output from ufw 0.36.2

## Issues Found
- The rule-order SSH example used `sudo ufw insert 1 deny from 203.0.113.50 to any port 22` and `sudo ufw allow from 192.168.1.0/24 to any port 22` without `proto tcp`, while the shown status output listed `22/tcp`. UFW enables both TCP and UDP when no protocol is specified for a port rule, so the commands were made consistent with the SSH-specific TCP example by adding `proto tcp`.
- The destination-IP section said that matching a specific destination IP is useful for rules that only apply to traffic coming in on a specific interface. UFW supports interface matching with `in on <interface>`; specifying `to <address>` matches the local destination address. The explanation was corrected to distinguish destination-IP matching from interface matching.
- The DDNS script used `dig +short "$HOSTNAME" | head -1`, which can return a CNAME rather than an IP address. It was changed to `dig +short A "$HOSTNAME" | tail -n1` so the UFW rule receives an IPv4 address.

## Review Notes
The remaining UFW command forms, numbered rule management, default incoming deny behavior, CIDR examples, and status commands match the documented UFW syntax. The scripts are illustrative and should still be adapted before production use, especially where they delete or replace existing firewall rules.
