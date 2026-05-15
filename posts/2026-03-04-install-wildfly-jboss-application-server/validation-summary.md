# Validation Summary: How to Install WildFly (JBoss) Application Server on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- WildFly Application Server
- Java / Red Hat build of OpenJDK
- systemd
- firewalld

## Sources Consulted
- WildFly 39 Getting Started Guide: https://docs.wildfly.org/39/Getting_Started_Guide.html
- WildFly downloads page: https://www.wildfly.org/downloads/
- WildFly 39.0.1.Final release asset: https://github.com/wildfly/wildfly/releases/download/39.0.1.Final/wildfly-39.0.1.Final.tar.gz
- Red Hat build of OpenJDK 21 on RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/21/html/installing_and_using_red_hat_build_of_openjdk_21_on_rhel/index
- firewalld documentation for opening ports and services: https://firewalld.org/documentation/howto/open-a-port-or-service
- firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original post used placeholder package and service names such as `<package-name>` and `<service>`. Replaced these with concrete WildFly, Java, systemd, and firewalld commands.
- The original dependency installation suggested `epel-release` and `Development Tools`, which are not required for installing WildFly from the official tarball on RHEL. Replaced them with OpenJDK 21 and required command-line tools.
- The original service configuration path `/etc/<service>/config.conf` was not valid for WildFly. Replaced it with WildFly's generated `wildfly-standalone.conf` workflow.
- The original service commands did not match WildFly's systemd unit names. Replaced them with `wildfly-standalone` commands and added `systemctl daemon-reload`.
- The original verification command `sudo <service> --test` was not a WildFly command. Replaced it with an HTTP check against the default WildFly port.
- The original firewall command used a nonexistent generic service name. Replaced it with explicit `8080/tcp` and optional `9990/tcp` port rules.
- The original performance command used `pidof <service>`, which would not find the WildFly Java process. Replaced it with a process lookup for the WildFly standalone process.

## Review Notes
WildFly 39.0.1.Final is used as the concrete release because it is listed as the latest final WildFly release on the official downloads page as of this review. WildFly 40.0.0.Beta1 is available but is a beta release, so it was not used for a production-oriented RHEL installation guide.
