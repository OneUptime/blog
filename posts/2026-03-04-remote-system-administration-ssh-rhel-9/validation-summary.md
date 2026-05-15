# Validation Summary: How to Set Up Remote System Administration Using SSH on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH client and server
- SSH key-based authentication
- sshd_config and ssh_config
- SELinux port labeling with semanage
- firewalld and firewall-cmd
- SSH local, dynamic, and remote port forwarding
- ssh-agent, scp, sftp, rsync, journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/assembly_using-secure-communications-between-two-systems-with-openssh_securing-networks
- Red Hat Enterprise Linux 9 Configuring basic system settings documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/configuring_basic_system_settings/red_hat_enterprise_linux-9-configuring_basic_system_settings-en-us.pdf
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- OpenSSH ssh-keygen(1) manual: https://man.openbsd.org/ssh-keygen
- OpenSSH ssh-add(1) manual: https://man.openbsd.org/ssh-add
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- Local OpenSSH command help for ssh-keygen and installed command availability checks

## Issues Found
- The post called Ed25519 keys "recommended for RHEL" without caveat. Red Hat documents that Ed25519 is not FIPS-140-compliant and does not work with OpenSSH in FIPS mode. I changed the wording to recommend Ed25519 for most non-FIPS systems and noted RSA as an option for FIPS-mode RHEL systems.
- The remote port forwarding section said the local service is accessible on the remote server's port 9090. OpenSSH binds remote TCP forwarding sockets to the server loopback interface by default unless a bind address is specified and the server permits it through GatewayPorts. I clarified that the example exposes the service on the remote server's localhost port.
- The source-restricted firewalld example used `service name="ssh"`, which applies to the default SSH service definition. I clarified that this example restricts the default SSH service so it is not confused with a custom SSH port.

## Review Notes
- The sshd_config directives, ssh client configuration examples, firewall-cmd commands, semanage SSH port labeling command, SSH tunnel syntax, ssh-agent usage, file transfer examples, and journalctl monitoring commands are technically valid.
- For environments that use a non-default SSH port, source-restricted firewalld rules should be adjusted to match that port rather than only the default ssh service.
