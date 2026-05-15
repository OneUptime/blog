# Validation Summary: How to Configure rsyslog for Centralized Log Management on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- rsyslog
- syslog over TCP and UDP
- firewalld
- systemd service management
- logger

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Configuring logging": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/configuring-logging_configuring-basic-system-settings
- rsyslog documentation, "imudp: UDP Syslog Input Module" and UDP port parameter: https://docs.rsyslog.com/doc/reference/parameters/imudp-port.html
- rsyslog documentation, "imtcp: TCP Syslog Input Module" and TCP port parameter: https://docs.rsyslog.com/doc/reference/parameters/imtcp-port.html
- rsyslog documentation, "Understanding rsyslog Queues": https://docs.rsyslog.com/doc/concepts/queues.html
- rsyslog documentation, "The Property Replacer": https://www.rsyslog.com/doc/configuration/property_replacer.html
- firewalld documentation, "firewall-cmd" manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The instruction said to "Uncomment these lines" in `/etc/rsyslog.conf`, but RHEL systems may not already contain the exact modern RainerScript `module()` and `input()` lines shown. Changed the wording to "Add or uncomment these lines" so the instruction remains accurate whether the lines already exist or need to be added.

## Review Notes
- The rsyslog module, input, forwarding, dynamic file, and queue syntax shown in the post is valid modern RainerScript syntax.
- The firewalld commands use the documented `--permanent --add-port=PORT/PROTOCOL` form followed by `--reload`.
- RHEL documentation recommends validating rsyslog configuration with `rsyslogd -N 1` before restarting and notes SELinux considerations for non-standard ports. The post uses the default port 514, so this is not a blocking issue.
