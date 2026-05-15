# Validation Summary: How to Change the Default SSH Port on RHEL and Update SELinux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server and client configuration
- SELinux port labeling with semanage
- firewalld firewall configuration
- systemd service management
- Linux socket inspection with ss

## Sources Consulted
- Red Hat Enterprise Linux 9 Securing networks, OpenSSH non-default port guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/securing_networks/Red_Hat_Enterprise_Linux-9-Securing_networks-en-US.pdf
- Red Hat Enterprise Linux 9 Using SELinux, semanage port examples and package references: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters, firewalld zones and service/port commands: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld official documentation, opening ports and permanent configuration: https://firewalld.org/documentation/howto/open-a-port-or-service
- OpenSSH sshd_config manual page, Port directive and configuration behavior: https://man.openbsd.org/sshd_config
- OpenSSH/Linux sshd manual page, test mode flags: https://man7.org/linux/man-pages/man8/sshd.8.html
- semanage-port manual page, add/delete/modify syntax: https://manpages.ubuntu.com/manpages/questing/man8/semanage-port.8.html

## Issues Found
- The SELinux cleanup command used `sudo semanage port -d -t ssh_port_t -p tcp 2222`. The `semanage port --delete` syntax deletes by protocol and port, without a type argument. Changed it to `sudo semanage port -d -p tcp 2222`.

## Review Notes
The post's core workflow is accurate for a typical RHEL 9 host using OpenSSH, SELinux in enforcing mode, and firewalld. The firewalld examples operate on the default zone; systems with multiple zones may need an explicit `--zone` option.
