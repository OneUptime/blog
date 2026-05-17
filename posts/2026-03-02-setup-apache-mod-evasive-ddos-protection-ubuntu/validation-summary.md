# Validation Summary: How to Set Up Apache mod_evasive for DDoS Protection on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Apache HTTP Server (Apache 2.4)
- mod_evasive (libapache2-mod-evasive, upstream v1.10.x)
- Ubuntu (apt, systemd, a2enmod, apache2ctl)
- UFW (Uncomplicated Firewall)
- sudoers / visudo
- mailutils (mail command)
- cron (/etc/cron.d)
- Bash scripting, awk, find

## Sources Consulted
- jzdziarski/mod_evasive upstream README: https://github.com/jzdziarski/mod_evasive
- Ubuntu jammy `libapache2-mod-evasive` package metadata: https://packages.ubuntu.com/jammy/libapache2-mod-evasive
- Ubuntu jammy `libapache2-mod-evasive` filelist (confirms `/usr/share/doc/libapache2-mod-evasive/examples/test.pl`): https://packages.ubuntu.com/jammy/amd64/libapache2-mod-evasive/filelist
- mod_evasive20.c source (confirms `dos-<IP>` log filename pattern and per-IP file behavior)
- Apache 2.4 mod directives and `a2enmod`/`apache2ctl` usage (Debian Apache packaging)
- UFW manpage for `ufw insert ... deny from ... to any` syntax

## Issues Found
- **DOSPageCount vs DOSSiteCount swap in the "How mod_evasive Works" section.** The bullet list paired the directives with the wrong descriptions:
  - Original (incorrect): "Requests per second from each IP address (DOSPageCount/DOSPageInterval)" and "Requests per second to each URL (DOSSiteCount/DOSSiteInterval)".
  - Per the upstream README, `DOSPageCount` is the threshold for requests to the *same page/URI* from one client, and `DOSSiteCount` is the threshold for the *total* requests from one client across the whole listener — i.e. exactly the opposite pairing.
  - Fixed to: "Requests per second to the same URL from each client (DOSPageCount/DOSPageInterval)" and "Total requests per second from each client across the listener (DOSSiteCount/DOSSiteInterval)". The configuration block further down already had the correct per-directive comments, so only the introductory bullet list was wrong.

## Review Notes
- `<IfModule mod_evasive20.c>` is correct on modern Ubuntu (22.04 / 24.04). The Debian/Ubuntu package builds the upstream `mod_evasive20.c` source, so the identifier remains `mod_evasive20.c` even on Apache 2.4 — there is no `mod_evasive24.c`.
- Package name `libapache2-mod-evasive`, the `a2enmod evasive` command, the `apache2ctl -M | grep evasive` check, and the `/usr/share/doc/libapache2-mod-evasive/examples/test.pl` location are all confirmed correct.
- The `dos-*` filename pattern used by the cleanup `find` matches the upstream `snprintf(..., "%s/dos-%s", log_dir, remote_ip)` log filename format.
- The sudoers entry `www-data ALL=(ALL) NOPASSWD: /usr/sbin/ufw` is technically redundant given that `block-ip.sh` is invoked via sudo (so `ufw` inside the script already runs as root), but it is not harmful and does not break the example.
- The `DOSEmailNotify` directive does require a working `mail` command in PATH for the Apache process, which `mailutils` provides — this is accurate.
- The post correctly notes mod_evasive's limitations (in-process, attack traffic still hits the server) and appropriately recommends layering with fail2ban / CDN / network-level rate limiting.
