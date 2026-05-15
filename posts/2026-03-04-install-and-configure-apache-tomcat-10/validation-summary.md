# Validation Summary: How to Install and Configure Apache Tomcat 10 on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Apache Tomcat 10.1
- OpenJDK 17
- systemd
- firewalld
- Linux shell commands

## Sources Consulted
- Apache Tomcat 10 setup documentation: https://tomcat.apache.org/tomcat-10.1-doc/setup.html
- Apache Tomcat 10 software downloads: https://tomcat.apache.org/download-10
- Apache Tomcat 10 Application Developer's Guide, Installation: https://tomcat.apache.org/tomcat-10.1-doc/appdev/installation.html
- Apache Tomcat 10 Introduction, CATALINA_HOME and CATALINA_BASE: https://tomcat.apache.org/tomcat-10.1-doc/introduction.html
- Red Hat Enterprise Linux 9 documentation, software management with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat Enterprise Linux 9 documentation, OpenJDK 17 package guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/
- systemd.service manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld documentation, opening a port or service: https://firewalld.org/documentation/howto/open-a-port-or-service

## Issues Found
- Replaced placeholder package commands such as `dnf install -y <package-name>` and `rpm -qi <package-name>` with a concrete Tomcat installation flow using OpenJDK 17, Apache's Tomcat 10 binary tarball, SHA-512 checksum verification, `/opt/tomcat`, and a dedicated `tomcat` system user.
- Removed unnecessary EPEL and "Development Tools" installation commands. They are not required for the documented binary Tomcat setup.
- Replaced the placeholder configuration path `/etc/<service>/config.conf` with a valid systemd unit at `/etc/systemd/system/tomcat.service`.
- Replaced placeholder service management commands such as `systemctl enable --now <service>` and `journalctl -u <service>` with `tomcat` service commands.
- Replaced the invalid test command `sudo <service> --test` with Tomcat's `catalina.sh configtest` and an HTTP check against `localhost:8080`.
- Replaced the invalid firewalld service placeholder `--add-service=<service>` with `--add-port=8080/tcp`, which matches Tomcat's default HTTP connector port.
- Replaced placeholder process monitoring commands with systemd memory inspection for the `tomcat` unit and a `pgrep` expression that targets Tomcat's bootstrap process.
- Fixed the conclusion wording so it refers to installing and configuring Apache Tomcat 10 rather than repeating the title in lowercase.

## Review Notes
Tomcat 10.1 requires Java 11 or later; the post uses OpenJDK 17 because it is a current, supported Java choice on RHEL 9. The guide pins Tomcat to version 10.1.55 as the current Tomcat 10.1 release checked during validation on 2026-05-15. Future maintenance should update the `TOMCAT_VERSION` value and verify the SHA-512 checksum from Apache's download site.
