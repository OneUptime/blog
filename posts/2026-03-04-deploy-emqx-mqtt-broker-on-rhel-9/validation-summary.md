# Validation Summary: How to Deploy Emqx MQTT Broker on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- EMQX MQTT broker
- Red Hat Enterprise Linux 9 / CentOS Stream 9
- RPM package installation with dnf
- systemd service management
- firewalld firewall management

## Sources Consulted
- EMQX Enterprise Docs: Install EMQX on CentOS/RHEL: https://docs.emqx.com/en/emqx/latest/deploy/install-rhel.html
- EMQX Enterprise Docs: Installation and Migration: https://docs.emqx.com/en/emqx/latest/deploy/install.html
- EMQX Enterprise Docs: Configuration Files: https://docs.emqx.com/en/emqx/latest/configuration/configuration.html
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The post omitted the installation step even though it described a deployment guide. Added a minimal RPM installation step using `dnf install ./emqx-*.rpm` after downloading the RHEL 9 RPM from EMQX.
- The configuration path used the placeholder `/etc/<service>/config.conf`, which is not an EMQX path. Changed it to `/etc/emqx/emqx.conf`, the RPM/DEB configuration directory documented by EMQX.
- The systemd commands used the placeholder `<service-name>`. Changed these commands to use the EMQX service name `emqx`.
- The firewall example used the placeholder `<PORT>/tcp`. Changed it to open EMQX's default MQTT TCP port `1883/tcp` and Dashboard/API port `18083/tcp`.
- The verification and troubleshooting commands used placeholders for the service and package names. Changed them to `emqx` and added the documented `/var/log/emqx` log directory.

## Review Notes
The guide now covers a basic single-node EMQX deployment. Production deployments may also need additional EMQX listener ports such as `8883`, `8083`, `8084`, and clustering ports `4370` and `5370`, depending on enabled features and network exposure requirements.
