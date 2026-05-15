# Validation Summary: How to Install and Configure the New Relic Infrastructure Agent on RHEL 9

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- New Relic Infrastructure Agent
- systemd
- DNF/Yum package management
- New Relic infrastructure log forwarding
- YAML configuration

## Sources Consulted
- New Relic documentation: Install the infrastructure agent for Linux - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/linux-installation/package-manager-install/
- New Relic documentation: Infrastructure agent configuration settings - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/infrastructure-agent-configuration-settings/
- New Relic documentation: Start, stop, and restart the infrastructure agent - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/manage-your-agent/start-stop-restart-infrastructure-agent/
- New Relic documentation: Forward your logs using the infrastructure agent - https://docs.newrelic.com/docs/logs/forward-logs/forward-your-logs-using-infrastructure-agent/
- Red Hat documentation: Managing software with the DNF tool in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/

## Issues Found
No technical issues found.

## Review Notes
New Relic's RHEL-family package-manager documentation shows `yum` commands, while the post uses `dnf`. On RHEL 9, `dnf` is the native package manager and is appropriate. New Relic's log forwarding documentation states that new files under `/etc/newrelic-infra/logging.d/` are processed automatically without restarting the infrastructure service except for custom Fluent Bit configuration; the post's restart command is harmless but not strictly required for the shown file-based log forwarding configuration.
