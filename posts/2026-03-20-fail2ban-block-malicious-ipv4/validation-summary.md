# Validation Summary: How to Configure Fail2Ban to Block Malicious IPv4 Addresses

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Fail2Ban
- Linux
- SSH / sshd
- iptables
- Apache HTTP Server
- Nginx
- vsftpd
- EPEL
- `apt`
- `dnf`

## Sources Consulted
- Fail2Ban upstream `jail.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- Fail2Ban upstream `ChangeLog`: https://github.com/fail2ban/fail2ban/blob/master/ChangeLog
- Fail2Ban `jail.conf(5)` man page: https://manpages.debian.org/bookworm/fail2ban/jail.conf.5.en.html
- Fail2Ban `fail2ban-client(1)` man page: https://manpages.debian.org/testing/fail2ban/fail2ban-client.1.en.html
- Fail2Ban `fail2ban-regex(1)` man page: https://manpages.debian.org/unstable/fail2ban/fail2ban-regex.1.en.html
- EPEL getting started guide: https://tdawson.fedorapeople.org/epel-docs/public/epel/getting-started/

## Issues Found
- The RHEL/CentOS install command used `yum install epel-release` directly, which is not the current official EPEL enablement flow for modern EL systems. I replaced it with current `dnf`-based EPEL installation commands.
- The post assumed current Fail2Ban defaults still align with `iptables` and hard-coded `/var/log/auth.log`. Current upstream and distro defaults vary by platform, including `nftables` and `systemd` backends on some systems. I explicitly set `iptables` banactions to match the post's IPv4 focus and replaced hard-coded log paths with Fail2Ban's built-in path/backend variables.
- The default action was set to `%(action_mwl)s`, which adds mail and whois actions and can fail without extra prerequisites. I changed it to the upstream default ban-only action, `%(action_)s`.
- The Apache jail was described as protecting against "404 floods", but `apache-auth` is the authentication-failure jail. I corrected that description.
- The `vsftpd` example omitted `ftps-data` from the port list. I added it and switched the log path to `%(vsftpd_log)s`.
- The custom filter example showed commented configuration lines inside a `bash` block instead of a working file creation example. I replaced it with an executable heredoc plus the correct `fail2ban-regex` test command.
- The repeat-offender section claimed "permanent" bans while the example configured a one-week `bantime`. I corrected the wording and changed the recidive jail to use `banaction = %(banaction_allports)s` instead of specifying `action` directly.
- The sample log line used `f2b-sshd` as if it were the jail name. I corrected it to `sshd`; `f2b-sshd` is the firewall chain name used by the iptables action.

## Review Notes
- The post now intentionally pins Fail2Ban to `iptables` actions so the title, tags, and validation commands stay accurate on modern distributions that may otherwise default to `nftables`.
- Copying the full `jail.conf` into `jail.local` is still technically valid, but smaller `.local` or `jail.d/*.local` overrides are usually easier to maintain across package updates.
