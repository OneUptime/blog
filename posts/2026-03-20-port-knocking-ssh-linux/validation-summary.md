# Validation Summary: How to Configure Port Knocking for SSH Access on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SSH
- Port knocking
- Linux
- `knockd`
- `iptables`
- `nmap`
- `netcat`
- `systemd`

## Sources Consulted
- Debian `knockd(1)` man page: https://manpages.debian.org/bookworm/knockd/knockd.1.en.html
- Debian `knock(1)` man page: https://manpages.debian.org/unstable/knockd/knock.1.en.html
- Debian `knockd` package defaults: https://sources.debian.org/data/main/k/knockd/0.8-2/debian/default
- Debian `knockd` package README: https://sources.debian.org/data/main/k/knockd/0.8-2/debian/README.Debian
- Debian `knockd` systemd unit: https://sources.debian.org/data/main/k/knockd/0.8-2/debian/knockd.service
- Official Nmap port scanning options reference: https://nmap.org/book/port-scanning-options.html
- Official Nmap port-state reference: https://nmap.org/book/man-port-scanning-basics.html
- Netfilter `iptables` man page: https://ipset.netfilter.org/iptables.man.html
- Netfilter `iptables-extensions` man page: https://ipset.netfilter.org/iptables-extensions.man.html
- Red Hat: How to install EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux
- Fedora package page for `knock`: https://packages.fedoraproject.org/pkgs/knock/knock/
- Fedora package page for `knock-server`: https://packages.fedoraproject.org/pkgs/knock/knock-server/epel-9.html

## Issues Found
- The `knockd` examples appended the temporary SSH `ACCEPT` rule with `iptables -A` even though the post later appended a blanket `DROP` for port 22. Because `iptables` evaluates rules in order, the later `ACCEPT` would never be reached. I changed the `knockd` examples to insert the temporary rule at the top of `INPUT` with `-I INPUT 1`, and kept the reverse `-D` rule for cleanup.
- The walkthrough said SSH closes again "after connection (or timeout)", but the configuration shown only supported a manual reverse knock. The official `knockd(1)` docs show that automatic timeout behavior requires `cmd_timeout` plus `stop_command`. I corrected the explanation to match the actual configuration.
- The RHEL/CentOS install block was inaccurate for current EL packaging. Current official guidance requires enabling the appropriate repositories first, and EPEL ships the daemon as `knock-server` rather than `knockd`. I replaced the generic `yum install epel-release` and `yum install knockd` lines with verified EL9 commands for RHEL 9 and CentOS Stream 9.
- The `/etc/default/knockd` startup toggle was presented as a general Linux step, but it is Debian/Ubuntu-specific. Debian’s package defaults and service unit confirm that `START_KNOCKD=1` applies there, while Fedora/EPEL uses `/etc/sysconfig/knockd`. I scoped that note to Debian/Ubuntu only.
- The `nmap` fallback used `--host-timeout 201` without a time suffix. Nmap documents time values as seconds by default, so the original command would wait far too long and could break the knock sequence. I corrected the commands to `201ms`.
- The client section said "netcat" while the actual fallback example used `nmap`, and it only showed a reverse close command for the `knock` client. I aligned the wording with the example and added the reverse `nmap` sequence so the fallback path is complete.
- The UDP example only showed an opening sequence. That left the post without a matching UDP close sequence even though the main configuration used a reverse knock to remove the rule. I added the reverse UDP `closeSSH` example and matching `nc -zu` commands.
- The post overstated scan behavior by calling SSH "completely invisible" and saying an attacker would see "no open ports" and that it would be "impossible" to know SSH was running. With an `iptables DROP`, the more accurate description from Nmap’s port-state documentation is that SSH no longer appears open and typically looks filtered. I revised that wording.
- I updated the established-connection firewall example from the older `-m state --state` form to the current `-m conntrack --ctstate` form.

## Review Notes
- The tutorial is IPv4-only as written. On dual-stack hosts, you would also need corresponding IPv6 rules such as `start_command_6` and `stop_command_6`, which `knockd(1)` supports.
- The post intentionally uses direct `iptables` commands. On systems managed by `firewalld`, `ufw`, or native `nftables`, the same idea applies but the commands and persistence model differ.
