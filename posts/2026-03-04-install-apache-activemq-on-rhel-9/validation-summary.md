# Validation Summary: How to Install Apache ActiveMQ on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache ActiveMQ Classic
- Red Hat Enterprise Linux 9
- DNF
- systemd
- firewalld
- Java/OpenJDK

## Sources Consulted
- Apache ActiveMQ Classic Installation: https://activemq.apache.org/components/classic/documentation/installation
- Apache ActiveMQ Classic Download page: https://activemq.apache.org/components/classic/download/
- Apache ActiveMQ Classic Unix Shell Script documentation: https://activemq.apache.org/components/classic/documentation/unix-shell-script
- Red Hat Enterprise Linux 9 DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- firewalld documentation for opening ports: https://firewalld.org/documentation/howto/open-a-port-or-service.html

## Issues Found
- The original installation command used the placeholder `<package-name>` and did not install Java or any tools needed to download and unpack ActiveMQ. Updated it to install `java-17-openjdk`, `wget`, and `tar`, then download and extract Apache ActiveMQ Classic 6.2.4.
- The original configuration path `/etc/<service>/config.conf` was not an ActiveMQ configuration path. Updated it to `/opt/activemq/conf/activemq.xml`.
- The original service commands used `<service-name>` placeholders and did not create a service unit. Added a concrete `activemq.service` systemd unit using the ActiveMQ Unix script's daemon mode.
- The original firewall command used `<PORT>` and did not identify ActiveMQ's default broker port. Updated it to open `61616/tcp`.
- The original verification and troubleshooting commands used placeholders. Updated them to check the `activemq` service and Java runtime directly.

## Review Notes
- Apache ActiveMQ Classic 6.2.4 requires Java 17 or later according to the Apache download page. The guide now installs OpenJDK 17 for RHEL 9 compatibility.
- The web console uses port `8161` by default, but the guide opens only the broker port `61616/tcp`. Administrators should expose the web console only when remote administrative access is required and access controls are configured appropriately.
