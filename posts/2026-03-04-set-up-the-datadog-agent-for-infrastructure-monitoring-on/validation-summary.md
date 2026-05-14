# Validation Summary: How to Set Up the Datadog Agent for Infrastructure Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- CentOS Stream 9
- Datadog Agent
- systemd
- Linux shell commands

## Sources Consulted
- Datadog Linux Agent documentation: https://docs.datadoghq.com/agent/supported_platforms/linux/
- Datadog Agent configuration files documentation: https://docs.datadoghq.com/agent/configuration/agent-configuration-files/
- Datadog Getting Started with the Agent documentation: https://docs.datadoghq.com/getting_started/agent/
- Datadog API and Application Keys documentation: https://docs.datadoghq.com/account_management/api-app-keys/

## Issues Found
- The post used generic placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which would not work for the Datadog Agent. Updated them to the correct Datadog Agent paths and service name: `/etc/datadog-agent/datadog.yaml` and `datadog-agent`.
- The post did not include an installation command. Added the official Agent 7 installation script pattern using `DD_API_KEY`, `DD_SITE`, and `install_script_agent7.sh`.
- The description of Agent data collection implied logs and traces are collected by default. Updated it to state that system metrics are collected by default and logs, traces, and process data require additional configuration.
- The verification command used only generic service status checks. Updated verification to use `sudo datadog-agent status`, which is the Datadog Agent status command documented for Linux.
- The troubleshooting package check used a placeholder package name. Updated it to check for `datadog-agent`.

## Review Notes
- The install command uses `DD_SITE="datadoghq.com"` as the default US1 site. Users in other Datadog regions should replace it with their organization site, such as `datadoghq.eu` or `ddog-gov.com`.
- Datadog currently recommends using its in-app Fleet Automation workflow for the most current host-specific installation command, but the Agent 7 install script pattern remains documented and appropriate for this guide.
