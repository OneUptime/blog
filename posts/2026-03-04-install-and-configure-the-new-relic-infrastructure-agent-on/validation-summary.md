# Validation Summary: How to Install and Configure the New Relic Infrastructure Agent on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- New Relic Infrastructure Agent
- Linux package management with dnf/yum
- systemd service management
- YAML configuration

## Sources Consulted
- New Relic Documentation: Install the infrastructure agent for Linux - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/linux-installation/package-manager-install/
- New Relic Documentation: Configure the infrastructure agent - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/configure-infrastructure-agent/
- New Relic Documentation: Infrastructure agent configuration settings - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/infrastructure-agent-configuration-settings/
- New Relic Documentation: Compatibility and requirements for the infrastructure agent - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/requirements-infrastructure-agent/
- New Relic Documentation: Start, stop, and restart the infrastructure agent - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/manage-your-agent/start-stop-restart-infrastructure-agent/

## Issues Found
- The installation commands used placeholders (`<package-name>`) instead of the actual New Relic repository setup and `newrelic-infra` package installation. Replaced them with the official RHEL 9 repository URL, repository metadata refresh command, and `newrelic-infra` package install command.
- The configuration file path used a generic placeholder (`/etc/<service>/config.conf`). Replaced it with the official Linux agent configuration file path, `/etc/newrelic-infra.yml`.
- The configuration guidance mentioned generic service settings such as listening addresses and authentication settings. Replaced it with New Relic infrastructure agent settings such as `license_key`, `display_name`, `custom_attributes`, and logging options.
- The systemd commands used a placeholder service name (`<service-name>`). Replaced them with the official `newrelic-infra` service name.
- The verification and troubleshooting commands used placeholders for service and package names. Replaced them with `newrelic-infra`.
- The prerequisites did not mention the required New Relic license key. Added it because `license_key` is required for the agent to report data to a New Relic account.

## Review Notes
The guide is now technically accurate for a typical RHEL 9 x86_64 installation. The New Relic documentation also provides an arm64 repository URL for RHEL 9 systems running on that architecture; this post uses the x86_64 repository to keep the existing guide focused.
