# Validation Summary: How to Deploy a WAR File to Tomcat on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Tomcat 9
- Java/OpenJDK
- systemd
- firewalld
- Linux command-line deployment

## Sources Consulted
- Red Hat JBoss Web Server Installation Guide: RHEL 8.x and RHEL 9.x `tomcat` package availability and Tomcat version notes: https://docs.redhat.com/en/documentation/red_hat_jboss_web_server/6.1/html/installation_guide/
- Red Hat Enterprise Linux 9 DNF documentation: package installation with `dnf install`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat Enterprise Linux 9 considerations: OpenJDK 17 as the default Java implementation in current RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/
- Apache Tomcat 9 configuration reference: `server.xml` is the main Catalina server configuration file: https://tomcat.apache.org/tomcat-9.0-doc/config/server.html
- Apache Tomcat 9 deployment documentation: WAR files deployed from the Host `appBase`, defaulting to `$CATALINA_BASE/webapps`: https://tomcat.apache.org/tomcat-9.0-doc/deployer-howto.html
- firewalld `firewall-cmd` manual: `--add-port=port/protocol` syntax for opening TCP ports: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9 firewalld documentation: services and ports are added to firewall zones: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The post used placeholder package commands such as `dnf install -y <package-name>` and `rpm -qi <package-name>`. I replaced them with `tomcat`, plus Java verification, because RHEL 9.2 and later provide a `tomcat` package and Tomcat requires Java.
- The prerequisites did not mention the RHEL minor-version caveat for the packaged Tomcat server. I updated the prerequisite to RHEL 9.2 or later.
- The post installed `epel-release` and `"Development Tools"` as generic dependencies. I replaced that with `java-17-openjdk`, which is the relevant runtime dependency for running Tomcat-hosted Java web applications.
- The configuration path `/etc/<service>/config.conf` was not a valid Tomcat configuration path. I changed it to `/etc/tomcat/server.xml`.
- The systemd commands used `<service>` placeholders. I replaced them with the packaged Tomcat service name, `tomcat`.
- The verification step used `sudo <service> --test`, which is not a Tomcat validation command. I replaced it with deploying the WAR to `/var/lib/tomcat/webapps/`, checking `journalctl -u tomcat`, and testing the context path with `curl`.
- The firewall example used `--add-service=<service>`, which is not appropriate for Tomcat unless a matching firewalld service definition exists. I changed it to `--add-port=8080/tcp`, matching Tomcat's default HTTP connector port and firewalld syntax.
- The performance tuning commands used placeholders and `pidof <service>`, which would not work for Tomcat. I replaced them with `systemctl show tomcat` and `MainPID` lookup.
- Troubleshooting examples used placeholders and did not target Tomcat paths or ports. I updated them to use `tomcat`, `/var/lib/tomcat/webapps`, and port `8080`.

## Review Notes
The guide now covers the basic RHEL-packaged Tomcat deployment path. Future improvements could mention Tomcat Manager deployment, custom context descriptors, SELinux remediation commands when a specific context error is present, and the Java EE versus Jakarta EE compatibility difference when moving applications between Tomcat 9 and Tomcat 10.
