# Validation Summary: How to Configure WildFly as a systemd Service on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- systemd
- WildFly
- Java / OpenJDK
- firewalld
- Linux service administration

## Sources Consulted
- WildFly 38 Getting Started Guide: https://docs.wildfly.org/38/Getting_Started_Guide.html
- WildFly command-line parameters documentation: https://docs.jboss.org/author/display/WFLY8/Command%20line%20parameters.html
- Red Hat Enterprise Linux systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks
- Red Hat build of OpenJDK 17 installation documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html/installing_and_using_red_hat_build_of_openjdk_17_on_rhel/installing-openjdk-on-rhel_openjdk

## Issues Found
- The original post used generic placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, which would not configure WildFly. Replaced them with concrete WildFly 38 installation, service generation, and service management commands.
- The dependency installation recommended `epel-release` and `"Development Tools"`, which are not required for installing and running WildFly as a systemd service from the upstream distribution. Replaced them with Java, archive, and download dependencies needed by the documented workflow.
- The service configuration step did not match WildFly's provided systemd workflow. Updated it to create a dedicated `wildfly` user and group, run `generate_systemd_unit.sh`, copy the generated service and sysconfig files, and reload systemd.
- The verification command `sudo <service> --test` was invalid for WildFly. Replaced it with `systemctl is-active`, `systemctl is-enabled`, and an HTTP check against the default WildFly port.
- The firewall example used `--add-service=<service>`, but WildFly does not have a standard predefined firewalld service in RHEL. Replaced it with `--add-port=8080/tcp` for WildFly's default HTTP listener.
- The resource monitoring examples used placeholder process names. Updated them to query the `wildfly-standalone` systemd unit and its `MainPID`.

## Review Notes
The guide now targets WildFly 38. Future updates should check the current WildFly release number and Java support matrix before refreshing the download URL or package recommendations.
