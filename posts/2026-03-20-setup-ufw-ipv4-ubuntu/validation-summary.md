# Validation Summary: How to Set Up UFW (Uncomplicated Firewall) for IPv4 on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- UFW (Uncomplicated Firewall)
- Ubuntu Linux
- Linux netfilter / iptables
- IPv4 firewall rules
- UFW application profiles
- UFW logging

## Sources Consulted
- Ubuntu manpage: ufw(8) - https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu manpage: ufw-framework(8) - https://manpages.ubuntu.com/manpages/jammy/man8/ufw-framework.8.html
- Ubuntu Server documentation: Firewall - https://ubuntu.com/server/docs/how-to/security/firewalls/
- Local UFW CLI help (`ufw --help`) and local manpage (`man ufw`) for UFW 0.36.2
- Local `/etc/services` entry for `ssh` mapping to `22/tcp`

## Issues Found
- The install section incorrectly said to enable UFW before setting rules. Changed it to say UFW should be enabled after setting rules, because UFW supports adding rules before enabling and this is the documented way to avoid SSH lockout during remote administration.
- The "Allow SSH only from your office IP" command omitted `proto tcp`. Added `proto tcp` so the rule matches SSH specifically instead of relying on UFW's behavior when no protocol is specified.
- The logging comment stated that UFW logs to `/var/log/ufw.log` unconditionally. Changed the wording to say it commonly logs there via rsyslog, matching the manpage's note that syslog/rsyslog configuration determines whether that file is used.
- The testing section incorrectly claimed that UFW does not have dry-run support. Replaced that with `sudo ufw --dry-run allow http`, which is documented by both the Ubuntu manpage and Ubuntu Server firewall guide.

## Review Notes
- Current UFW status output may include a routed policy field in addition to incoming and outgoing defaults; the post's abbreviated default-policy example is still adequate for the IPv4 host-firewall workflow shown.
- Application profiles such as `Nginx Full` and `OpenSSH` depend on the relevant packages/profiles being installed on the system.
