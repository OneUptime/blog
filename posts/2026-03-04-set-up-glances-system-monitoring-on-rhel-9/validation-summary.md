# Validation Summary: How to Set Up Glances System Monitoring on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Glances
- EPEL
- systemd
- firewalld

## Sources Consulted
- Glances documentation: https://glances.readthedocs.io/en/v3.4.0/quickstart.html
- Glances configuration documentation: https://glances.readthedocs.io/en/v3.4.0/config.html
- Glances upstream systemd wiki: https://github.com/nicolargo/glances/wiki/Start-Glances-through-Systemd
- Fedora Packages for Glances in EPEL 9: https://packages.fedoraproject.org/pkgs/glances/glances/epel-9.html
- Red Hat DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat EPEL setup guidance: https://www.redhat.com/en/blog/install-epel-linux
- Red Hat systemd service management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index

## Issues Found
- The post omitted Step 1 even though it claimed to cover installation. Added RHEL 9 and CentOS Stream 9 EPEL setup commands and `dnf install -y glances`.
- The post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`, which would not work. Replaced them with Glances-specific paths and commands.
- The EPEL 9 Glances package installs `/etc/glances/glances.conf` and `/usr/bin/glances`, but does not include a systemd unit. Added a minimal `glances.service` unit that runs `glances -w`.
- Updated verification and troubleshooting commands to use `glances.service`, `rpm -q glances`, and the default Glances web port `61208`.

## Review Notes
The guide now configures Glances in web server mode. For production deployments, administrators should also decide whether to bind Glances only to trusted interfaces and whether to enable authentication in the Glances configuration.
