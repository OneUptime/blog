# Validation Summary: How to Access the RHEL Web Console Remotely via SSH

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- OpenSSH local port forwarding, dynamic forwarding, and jump hosts
- systemd socket overrides
- TLS certificates for Cockpit
- autossh
- dnf and EPEL package installation

## Sources Consulted
- Red Hat RHEL 9 web console documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- Cockpit TCP port and address documentation: https://cockpit-project.org/guide/195/listen.html
- Cockpit configuration manual: https://cockpit-project.org/guide/latest/cockpit.conf.5.html
- Cockpit TLS certificate documentation: https://cockpit-project.org/guide/latest/https
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- systemd.socket documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.socket.html
- Fedora autossh package page: https://packages.fedoraproject.org/pkgs/autossh/autossh/
- Red Hat blog on installing EPEL for RHEL 9: https://www.redhat.com/en/blog/install-epel-linux
- autossh man page: https://manpages.debian.org/unstable/autossh/autossh.1.en.html

## Issues Found
- The `autossh` installation command assumed the package was available from the enabled RHEL repositories. Fedora packages list `autossh` for EPEL 9, and Red Hat documents EPEL as an add-on repository for RHEL. Updated the install comment to mention enabling EPEL first if `autossh` is not available.

## Review Notes
- The SSH forwarding examples, `ProxyJump` usage, SOCKS proxy command, Cockpit port 9090 references, `cockpit.conf` keys, systemd `ListenStream=` override pattern, certificate path, and curl/ss verification commands are technically valid.
- For production use, adding `-o ExitOnForwardFailure=yes` to background tunnel commands would make failures more explicit, but the existing commands are still valid.
