# Validation Summary: How to Set Up RHEL as a Media Streaming and Transcoding Server

## Status
not-technically-relevant

## Post Type
Placeholder guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd and systemctl
- firewalld and firewall-cmd
- systemd journal and journalctl
- SELinux audit troubleshooting
- RPM package queries
- FFmpeg, mentioned but not actually configured

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld guide to opening ports and services: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- systemd systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The article does not provide a real RHEL media streaming or transcoding setup. It mentions FFmpeg and media delivery, but never installs FFmpeg, configures a media server, defines a streaming protocol, configures transcoding, or provides a working service unit.
- The setup begins at "Step 2" and omits the actual installation or service selection step, leaving the guide incomplete.
- The command examples use unresolved placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<PORT>`. If copied literally into a shell, angle-bracket placeholders can be interpreted as redirection syntax rather than command arguments.
- The service configuration path `/etc/<service>/config.conf` is not valid for any specific media streaming or transcoding service and cannot be verified against service documentation.
- The firewall command pattern is valid only after replacing `<PORT>` with a numeric port and choosing the correct firewalld zone when needed, but the article does not identify any actual port or service used by a media streaming stack.
- The SELinux troubleshooting advice is generic. Red Hat documents more complete AVC searches using `ausearch -m AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR -ts recent`, while the article only checks `avc`.

## Review Notes
The post should be removed or replaced with a concrete, tested tutorial for a specific stack, such as FFmpeg plus a named streaming server or an application like Jellyfin. A salvageable rewrite would need to define supported repositories, install commands, service names, listening ports, SELinux handling, firewall zones, and verification commands for the chosen implementation.
