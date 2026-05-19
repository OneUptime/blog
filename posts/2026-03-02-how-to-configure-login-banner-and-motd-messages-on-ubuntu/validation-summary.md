# Validation Summary: How to Configure Login Banner and MOTD Messages on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenSSH server (`sshd_config`)
- Linux console login banners (`/etc/issue`, `/etc/issue.net`)
- PAM `pam_motd`
- Ubuntu dynamic MOTD (`/etc/update-motd.d/`)
- `run-parts`
- Bash shell scripting
- systemd service management

## Sources Consulted
- Ubuntu Server documentation: OpenSSH server - https://documentation.ubuntu.com/server/how-to/security/openssh-server/
- Ubuntu manpage: `sshd_config(5)` - https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html
- Ubuntu manpage: `update-motd(5)` - https://manpages.ubuntu.com/manpages/jammy/man5/update-motd.5.html
- Ubuntu manpage: `pam_motd(8)` - https://manpages.ubuntu.com/manpages/noble/man8/pam_motd.8.html
- Ubuntu manpage: `issue.net(5)` - https://manpages.ubuntu.com/manpages/jammy/man5/issue.net.5.html
- Ubuntu/Linux manpage: `agetty(8)` issue escape sequences - https://manpages.ubuntu.com/manpages/focal/man8/agetty.8.html
- Local system manpage: `run-parts(8)`
- Local system manpage: `issue(5)`

## Issues Found
- SSH service restart command used `sudo systemctl restart sshd`. Ubuntu Server documentation uses `ssh.service` for OpenSSH service restarts, so the command was changed to `sudo systemctl restart ssh.service`.
- The post incorrectly said SSH uses `/etc/issue.net` if no custom `Banner` path is specified. OpenSSH defaults to no banner unless the `Banner` directive is set. The text now explains that `/etc/issue.net` is used by telnet-style services and can be used by SSH only by explicitly setting `Banner /etc/issue.net`.
- The dynamic MOTD order was described as numerical order. Ubuntu's `update-motd(5)` describes `run-parts --lsbsysinit` ordering, which is lexical with caveats. The post now says lexical order and explains that numeric prefixes control display order.
- The MOTD test command used plain `run-parts /etc/update-motd.d/`. Ubuntu's dynamic MOTD framework uses `run-parts --lsbsysinit`, so the test command was updated accordingly.
- The static MOTD section said `/etc/update-motd.d/` overwrites `/etc/motd` on each login. Ubuntu writes generated output to `/run/motd.dynamic`, and `/etc/motd` is often a symlink to that file. The section was corrected to explain the symlink behavior and how to use a regular static `/etc/motd`.
- The PAM static MOTD instructions commented out both dynamic and static `pam_motd` lines, then added another static line. The section now distinguishes the dynamic `motd=/run/motd.dynamic` entry from the static `noupdate` entry and recommends an explicit `motd=/etc/motd` path when only the static file should be shown.

## Review Notes
The custom MOTD script is syntactically valid Bash and uses common Ubuntu/Linux commands. The `hostname -f` command may fail or return a short name on systems without a fully configured FQDN, but that is an environment caveat rather than a technical error in the tutorial.
