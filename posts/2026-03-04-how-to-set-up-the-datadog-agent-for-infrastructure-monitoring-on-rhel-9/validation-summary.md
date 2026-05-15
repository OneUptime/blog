# Validation Summary: How to Set Up the Datadog Agent for Infrastructure Monitoring on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Datadog Agent 7
- Linux systemd services
- Datadog Agent YAML configuration
- Datadog log collection
- Datadog Process check integration

## Sources Consulted
- Datadog Agent Linux documentation: https://docs.datadoghq.com/agent/supported_platforms/linux/
- Datadog supported platforms documentation: https://docs.datadoghq.com/agent/supported_platforms/
- Datadog Agent configuration files documentation: https://docs.datadoghq.com/agent/configuration/agent-configuration-files/
- Datadog Host Agent log collection documentation: https://docs.datadoghq.com/agent/logs/
- Datadog log file permissions guide for Linux: https://docs.datadoghq.com/logs/guide/setting-file-permissions-for-rotating-logs/
- Datadog Process integration documentation: https://docs.datadoghq.com/integrations/process/

## Issues Found
- The log collection command wrote to `/etc/datadog-agent/conf.d/syslog.d/conf.yaml` without ensuring that the `syslog.d` directory exists. Datadog's log collection documentation says to create a `<CUSTOM_LOG_SOURCE>.d` directory under `conf.d`, so I added `sudo mkdir -p /etc/datadog-agent/conf.d/syslog.d`.
- The log collection example tailed `/var/log/messages` and `/var/log/secure`, but the Datadog Agent runs as the `dd-agent` user on Linux and may not be able to read root-owned files under `/var/log`. I added a `setfacl` command to grant the Agent user read access to those two files.
- The Process check command wrote to `/etc/datadog-agent/conf.d/process.d/conf.yaml` without ensuring the directory exists. Datadog integration configuration files live under `<INTEGRATION>.d` directories in `conf.d`, so I added `sudo mkdir -p /etc/datadog-agent/conf.d/process.d`.

## Review Notes
- The install command, `systemctl` commands, `datadog-agent status` command, main `/etc/datadog-agent/datadog.yaml` location, `logs_enabled: true`, and `process.d/conf.yaml` structure were consistent with Datadog's official documentation.
- For production systems, ACLs for rotated logs should also be made persistent through logrotate configuration, as noted in Datadog's Linux log permissions guide.
