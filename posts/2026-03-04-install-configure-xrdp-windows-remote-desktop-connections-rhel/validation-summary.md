# Validation Summary: How to Install and Configure XRDP for Windows Remote Desktop Connections to RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- EPEL
- XRDP
- xorgxrdp
- GNOME
- firewalld
- SELinux
- systemd
- OpenSSL / TLS
- Windows Remote Desktop Connection

## Sources Consulted
- Fedora EPEL getting started documentation: https://tdawson.fedorapeople.org/epel-docs/public/epel/getting-started/
- Fedora Packages for xrdp on EPEL 9: https://packages.fedoraproject.org/pkgs/xrdp/xrdp/epel-9.html
- Fedora Packages for xorgxrdp on EPEL 9: https://packages.fedoraproject.org/pkgs/xorgxrdp/xorgxrdp/epel-9.html
- Fedora Packages for xrdp-selinux: https://packages.fedoraproject.org/pkgs/xrdp/xrdp-selinux/
- xrdp project overview: https://www.xrdp.org/
- xrdp TLS security layer documentation: https://github.com/neutrinolabs/xrdp/wiki/TLS-security-layer
- xrdp.ini manual page: https://manpages.ubuntu.com/manpages/focal/man5/xrdp.ini.5.html
- Red Hat DNF package group documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_software_with_the_dnf_tool/installing-package-groups
- Red Hat firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/red_hat_enterprise_linux-9-configuring_firewalls_and_packet_filters-en-us.pdf
- Red Hat SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/using_selinux/red_hat_enterprise_linux-8-using_selinux-en-us.pdf

## Issues Found
- The EPEL setup command used `sudo dnf install -y epel-release`, which is not the recommended RHEL 8/9 EPEL installation path and can fail on RHEL because the release RPM is not provided by the base RHEL repositories. I changed it to enable CodeReady Builder for RHEL 9 and install the official EPEL 9 release RPM URL.
- The install command described TigerVNC as the backend and installed `tigervnc-server`. On current EPEL 8/9 packages, `xorgxrdp` is the separate XRDP Xorg backend package. I changed the install command to `xrdp xorgxrdp`.
- The SELinux section used `xrdp_connect_all_unreserved_ports`, which is not a documented RHEL/Fedora XRDP SELinux boolean. I replaced it with installation of the `xrdp-selinux` policy package and kept the audit-log troubleshooting command.
- The global session script path used `/etc/xrdp/startwm.sh`, but the EPEL 9 package installs the default startup scripts under `/usr/libexec/xrdp/`. I changed the example to back up and edit `/usr/libexec/xrdp/startwm.sh`.

## Review Notes
The TLS configuration keys, `security_layer=tls`, `certificate`, `key_file`, `max_bpp`, `xserverbpp`, `crypt_level`, systemd commands, firewalld port commands, log paths, and default RDP port were consistent with the consulted documentation. The EPEL commands are now specifically correct for RHEL 9; RHEL 8 users should use the matching RHEL 8 CodeReady Builder repository and EPEL 8 release RPM.
