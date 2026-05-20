# Validation Summary: How to Allow and Deny Specific Ports with UFW on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- UFW / Uncomplicated Firewall
- Linux netfilter firewalling
- TCP, UDP, and ICMP traffic filtering
- `/etc/services`
- `/etc/ufw/*.rules` configuration files

## Sources Consulted
- Ubuntu `ufw(8)` man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu Server documentation, "Firewall": https://ubuntu.com/server/docs/how-to/security/firewalls/
- Ubuntu Security documentation, "Firewall": https://documentation.ubuntu.com/security/security-features/network/firewall/
- Local `ufw --help` output
- Local `man ufw` output

## Issues Found
- The practical server profile used invalid interface-specific deny syntax: `sudo ufw deny in on eth0 port 3306/tcp` and equivalent examples for PostgreSQL and Redis. UFW full syntax requires a `from` or `to` clause when using `port` with an interface. Changed these commands to `sudo ufw deny in on eth0 to any port <port> proto tcp`, matching the official `ufw(8)` syntax and Ubuntu's documented interface-specific examples.

## Review Notes
- The remaining UFW commands and explanations were consistent with the official UFW man page and Ubuntu Server documentation.
- Local dry-run validation of valid commands could not be completed without root privileges in this environment, but the invalid profile command was confirmed by UFW's parser before privilege escalation with `ERROR: Need 'from' or 'to' with 'port'`.
