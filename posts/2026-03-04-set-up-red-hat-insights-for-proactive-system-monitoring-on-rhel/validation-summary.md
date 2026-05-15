# Validation Summary: How to Set Up Red Hat Insights for Proactive System Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Insights / Red Hat Lightspeed
- insights-client
- systemd timers
- OpenSCAP compliance scans
- Ansible remediation playbooks
- YAML redaction configuration

## Sources Consulted
- Red Hat documentation: Registering RHEL systems and configuring client tools with Red Hat Lightspeed - https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html-single/remote_host_configuration_and_management/index/
- Red Hat documentation: Command options for insights-client - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html-single/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/index#assembly-insights-cli-options
- Red Hat documentation: YAML files for redaction and archive verification - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html-single/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/index#proc-configuring-data-redaction
- Red Hat documentation: Red Hat Insights Remediations Guide - https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/red_hat_insights_remediations_guide/remediations-overview_red-hat-insights-remediation-guide
- Red Hat documentation: Getting Started with Red Hat Insights - https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html-single/getting_started_with_red_hat_insights/index

## Issues Found
- The post described `sudo insights-client --display-name` as a way to view the system ID. Official documentation defines `--display-name=DISPLAY_NAME` as an option to set or change the host display name, so the incorrect "view system ID" command was removed.
- The post described `sudo insights-client --check-results` as an immediate check and upload. Official documentation defines it as retrieving analysis results, with `--show-results` used to display those results. The comments were corrected and `sudo insights-client --show-results` was added.
- The post described `sudo insights-client --compliance` as viewing a compliance report. Official documentation defines it as running an OpenSCAP scan and uploading the report to the compliance service, so the comment was corrected.
- The post used the older INI-style `remove.conf` example as the primary redaction method. Current Red Hat documentation uses `file-redaction.yaml` and `file-content-redaction.yaml` for insights-client 3.x redaction. The example was updated to `file-redaction.yaml` YAML syntax.
- The post used `sudo insights-client --no-upload --keep-archive` for pre-upload archive inspection. Official documentation uses `--no-upload` to save the archive locally before upload and `--keep-archive` to retain an archive after upload, so the verification command was changed to `sudo insights-client --no-upload`.

## Review Notes
Red Hat has been rebranding Insights-related documentation under Red Hat Lightspeed, but the `insights-client` commands and Red Hat Insights for RHEL terminology remain recognizable in the current official documentation.
