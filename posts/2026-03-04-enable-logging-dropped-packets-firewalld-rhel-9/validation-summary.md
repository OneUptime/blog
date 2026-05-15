# Validation Summary: How to Enable Logging for Dropped Packets in Firewalld on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- firewalld
- firewall-cmd
- firewalld rich rules
- systemd journal
- rsyslog
- logrotate
- Bash and standard Linux text-processing commands

## Sources Consulted
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewalld.conf configuration documentation: https://firewalld.org/documentation/configuration/firewalld-conf.html
- rsyslog filter conditions documentation: https://www.rsyslog.com/doc/configuration/filters.html
- Red Hat Enterprise Linux 7 Security Guide, firewalld LogDenied section: https://docs.redhat.com/en/documentation/Red_Hat_Enterprise_Linux/7/html-single/security_guide/index

## Issues Found
- The SSH rich-rule example was titled and commented as logging dropped SSH attempts, but the rule only contains a `log` action and no `drop` or `reject` action. Per the firewalld rich language documentation, logging rules are placed in the zone log chain and matching traffic then continues through normal deny and allow processing. I changed the heading and comment to say it logs SSH attempts before normal zone handling.

## Review Notes
- The `firewall-cmd --set-log-denied` syntax, valid values, and persistence behavior are correct: upstream firewalld documents it as both a runtime and permanent change that reloads the firewall.
- The rich-rule `log`, `level`, and `limit value="rate/duration"` syntax matches the official firewalld rich language documentation.
- The rsyslog property-based filter syntax using `:msg, contains, "value"` is valid. The example writes matching messages to a separate file but does not stop later rsyslog rules from also processing them.
