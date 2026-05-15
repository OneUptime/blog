# Validation Summary: How to Install and Configure Puppet Agent on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Puppet Agent
- systemd
- dnf/rpm

## Sources Consulted
- Puppet Core documentation: Install *nix agents - https://help.puppet.com/core/current/Content/PuppetCore/install_nix_agents.htm
- Puppet Core documentation: Configure the server setting - https://help.puppet.com/core/current/Content/PuppetCore/configure_server_setting.htm
- Puppet Core documentation: Configuration settings - https://help.puppet.com/core/current/Content/PuppetCore/config_settings.htm
- Puppet Core documentation: Supported agent platforms - https://help.puppet.com/core/current/Content/PuppetCore/supported_operating_systems.htm

## Issues Found
- The installation command used a placeholder package name. Changed it to install the official `puppet-agent` package after the Puppet package repository is configured.
- The configuration path `/etc/<service>/config.conf` was generic and incorrect for Puppet Agent. Replaced it with the official `puppet config set server ... --section main` command and noted the direct `puppet.conf` path at `/etc/puppetlabs/puppet/puppet.conf`.
- The service commands used a placeholder service name. Replaced them with the Puppet Agent systemd service name, `puppet`.
- The verification and troubleshooting commands used placeholders. Replaced them with `systemctl status puppet`, `journalctl -u puppet`, `rpm -q puppet-agent`, and `puppet agent --test`.
- Added a certificate-signing troubleshooting note because the first agent run commonly submits a certificate request that must be signed by the primary Puppet server.

## Review Notes
The post is now technically accurate as a basic Puppet Agent setup guide for RHEL 9, assuming the host has access to Puppet's package repository. Puppet's current documentation notes that Puppet Core package repositories require credentials, so production readers should follow their Puppet subscription or repository setup process before running the package installation command.
