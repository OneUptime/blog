# Validation Summary: How to Set Up Keepalived for VRRP/Failover on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Keepalived
- VRRP
- Linux networking
- UFW
- iptables
- firewalld
- Nginx
- HAProxy
- Bash health check and notification scripts
- OneUptime monitoring

## Sources Consulted
- Keepalived configuration manual: https://manpages.debian.org/testing/keepalived/keepalived.conf.5.en.html
- Ubuntu Keepalived man page: https://manpages.ubuntu.com/manpages/focal/man8/keepalived.8.html
- RFC 3768, Virtual Router Redundancy Protocol: https://datatracker.ietf.org/doc/html/rfc3768
- Ubuntu 24.04 UFW man page: https://manpages.ubuntu.com/manpages/noble/man8/ufw.8.html
- Ubuntu 22.04 UFW man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu 20.04 UFW man page: https://manpages.ubuntu.com/manpages/focal/man8/ufw.8.html
- HAProxy Enterprise active/standby documentation: https://www.haproxy.com/documentation/haproxy-enterprise/administration/high-availability/active-standby/

## Issues Found
- The initial `enable_script_security` comments incorrectly described the directive as enabling scripts to run as root. Updated the comments to describe its actual purpose: enforcing safe permissions for scripts run by Keepalived.
- The HAProxy health check always checked the stats URL even though the comment said it was optional. Changed the default `HAPROXY_STATS_URL` to empty and clarified that the stats page check runs only when configured.
- The UFW example did not note that `proto vrrp` is supported in Ubuntu 24.04 UFW documentation but not in Ubuntu 20.04/22.04 man pages. Added a version caveat and kept the `before.rules` fallback for older versions.
- The UFW `before.rules` instructions said to add rules before the `*filter` section. Corrected this to add rules inside the `*filter` section before the final `COMMIT` line.
- A testing command described `keepalived --dump-conf` as VRRP statistics. Updated the comment to say it dumps the parsed Keepalived configuration.
- The troubleshooting command used `keepalived --check`, which is not the Keepalived configuration-test option. Replaced it with `keepalived --config-test -f /etc/keepalived/keepalived.conf`.
- The debugging section had Keepalived `USR1` and `USR2` signal outputs reversed. Corrected `USR1` to write `/tmp/keepalived.data` and `USR2` to write `/tmp/keepalived.stats`.
- The graceful shutdown script claimed `SIGUSR1` reduces priority, but Keepalived uses `USR1` for data output. Replaced it with a clean `systemctl stop keepalived`, which causes Keepalived to release the VIP and advertise priority 0.
- The production config comment for `vrrp_gna_interval` incorrectly described priority behavior. Updated it to describe unsolicited neighbor advertisement interval behavior.
- The production config combined `state MASTER` with `preempt_delay`; Keepalived documentation indicates `preempt_delay` is not applied when the initial state is MASTER. Changed the example to use `state BACKUP` with a clarifying comment.

## Review Notes
The post is technically relevant and broadly accurate after the targeted fixes. Readers still need to adapt interface names, cloud-provider networking behavior, and firewall policy to their own environments.
