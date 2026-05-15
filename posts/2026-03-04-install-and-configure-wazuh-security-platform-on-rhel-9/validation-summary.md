# Validation Summary: How to Install and Configure Wazuh Security Platform on RHEL

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Wazuh Security Platform
- Red Hat Enterprise Linux 9
- systemd
- DNF/RPM package management
- SELinux troubleshooting

## Sources Consulted
- Wazuh Quickstart documentation: https://documentation.wazuh.com/current/quickstart.html
- Wazuh server step-by-step installation documentation: https://documentation.wazuh.com/current/installation-guide/wazuh-server/step-by-step.html
- Wazuh dashboard step-by-step installation documentation: https://documentation.wazuh.com/current/installation-guide/wazuh-dashboard/step-by-step.html
- Wazuh manager documentation: https://documentation.wazuh.com/current/user-manual/manager/wazuh-manager.html
- Wazuh packages list: https://documentation.wazuh.com/current/installation-guide/packages-list.html

## Issues Found
- The original installation command used the placeholder `sudo dnf install -y <package-name>`, which does not install Wazuh. Replaced it with the official Wazuh installation assistant commands for the current Wazuh 4.14 quickstart.
- The prerequisites listed CentOS Stream 9, but current Wazuh central component documentation lists RHEL 7, 8, 9, and 10 and CentOS Stream 10. Updated the prerequisite to RHEL 9 for this RHEL-specific post.
- The original configuration file path `/etc/<service>/config.conf` was a placeholder and not valid for Wazuh manager configuration. Replaced it with `/var/ossec/etc/ossec.conf`.
- The original service commands used `<service-name>`, which would not work. Replaced them with the real Wazuh central component services: `wazuh-manager`, `wazuh-indexer`, and `wazuh-dashboard`.
- The verification and troubleshooting commands used placeholders. Updated them to check Wazuh service status, Wazuh manager journal logs, and installed Wazuh RPM packages.

## Review Notes
The post now follows the official Wazuh all-in-one quickstart path for RHEL 9. For a production deployment, the post could later be expanded with hardware sizing, firewall ports, certificate handling, password rotation, and the Wazuh recommendation to disable Wazuh package repositories after installation to prevent accidental component upgrades.
