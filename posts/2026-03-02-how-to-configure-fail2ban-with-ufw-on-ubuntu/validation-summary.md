# Validation Summary: How to Configure fail2ban with UFW on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- fail2ban
- UFW
- SSH
- Nginx
- systemd journal backend
- Email notifications through fail2ban actions

## Sources Consulted
- Ubuntu `jail.conf(5)` manpage: https://manpages.ubuntu.com/manpages/jammy/man5/jail.conf.5.html
- Ubuntu `ufw(8)` manpage: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu `fail2ban-client(1)` manpage: https://manpages.ubuntu.com/manpages/noble/man1/fail2ban-client.1.html
- Ubuntu Noble `fail2ban` package files, version `1.0.2-3ubuntu0.1`, inspected locally with `apt download fail2ban` and `dpkg-deb`
- fail2ban upstream `ufw.conf` action definition: https://github.com/fail2ban/fail2ban/blob/1.0/config/action.d/ufw.conf

## Issues Found
- The introduction said UFW rate limiting only works for SSH. UFW `limit` rules can apply to arbitrary UFW rule targets, so this was changed to describe the real limitation: UFW rate limiting does not inspect application logs or service-specific failure patterns.
- The UFW action snippet was outdated. Current Ubuntu fail2ban uses a parameterized `ufw` action with `add = prepend` and default `blocktype = reject`, so the snippet and UFW status example were updated.
- The article did not state that UFW must be enabled for fail2ban's UFW rules to affect traffic. Added a short `ufw status` / `ufw enable` check.
- `logtarget` and `loglevel` were shown in `jail.local`, but they are fail2ban main configuration settings, not jail settings. Removed them from the jail example.
- The SSH port example used `port = ssh,22`, which is redundant for a default SSH port. Updated it to `port = ssh` with a note to replace it with the actual custom port when needed.
- The all-jails unban command used `fail2ban-client set all unbanip`, which is not the documented all-jails command. Replaced it with `fail2ban-client unban <IP>`.
- The persistent-ban section put `dbfile` and `dbpurgeage` in `jail.local` under `[DEFAULT]`, but these belong in `fail2ban.local` under `[Definition]`. Updated the file path, section, and explanation.
- The performance section recommended `backend = systemd` alongside file `logpath` jails. The fail2ban manpage says `logpath` is not valid with the `systemd` backend, so the example now calls out that `systemd` should only be used for jails with journal matching.

## Review Notes
The tutorial is technically relevant and valid after the fixes. Some operational choices, such as exact jail thresholds and whether to use `reject` or `deny`, remain environment-specific and should be tuned per deployment.
