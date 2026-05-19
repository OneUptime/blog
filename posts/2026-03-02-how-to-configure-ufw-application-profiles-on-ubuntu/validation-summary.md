# Validation Summary: How to Configure UFW Application Profiles on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- UFW / Uncomplicated Firewall
- UFW application profiles
- Linux firewall rule management
- INI-style configuration files
- Ansible file deployment example

## Sources Consulted
- Ubuntu Server documentation: Firewall - https://ubuntu.com/server/docs/how-to/security/firewalls/
- Ubuntu manpage: ufw(8) - https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Local UFW 0.36.2 man page: `man ufw`
- Local UFW profile parser source: `/usr/lib/python3/dist-packages/ufw/applications.py`
- Local installed profile examples: `/etc/ufw/applications.d/openssh-server`, `/etc/ufw/applications.d/cups`
- Local UFW CLI help: `ufw app --help`

## Issues Found
- The interface-restricted profile command used `sudo ufw allow in on eth1 app Redis`, which UFW rejects because extended syntax with `app` requires a `from` or `to` clause. Changed it to `sudo ufw allow in on eth1 to any app Redis`, matching the documented full rule syntax.
- The conclusion said changing a service's ports can be handled by "updating the profile and reloading." The documented mechanism for refreshing profile-backed firewall rules is `ufw app update <name>`. Changed the wording to reference `ufw app update`.

## Review Notes
- The profile file format, `ports=` syntax, pipe-separated port/protocol combinations, comma-separated port lists, `ufw app list`, `ufw app info`, `ufw app update`, and source-restricted `to any app <name>` examples match the UFW documentation.
- The sample custom profile snippets were checked with UFW's installed application profile parser and loaded successfully.
