# Validation Summary: How to Set Up Dynatrace OneAgent for Full-Stack Monitoring on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Dynatrace OneAgent
- Linux systemd
- Dynatrace Log Monitoring
- Dynatrace process monitoring

## Sources Consulted
- Dynatrace Docs: Install OneAgent on Linux - https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/installation-and-operation/linux/installation/install-oneagent-on-linux
- Dynatrace Docs: Deployment API - Download latest OneAgent - https://docs.dynatrace.com/docs/dynatrace-api/environment-api/deployment/oneagent/download-oneagent-latest
- Dynatrace Docs: OneAgent configuration via command-line interface - https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/oneagent-configuration-via-command-line-interface
- Dynatrace Docs: Stop/restart OneAgent on Linux - https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/installation-and-operation/linux/operation/stop-restart-oneagent-on-linux
- Dynatrace Docs: Custom log source - https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-log-ingestion/lma-log-ingestion-via-oa/lma-custom-log-source
- Dynatrace Docs: Log ingest rules - https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-log-ingestion/lma-log-ingestion-via-oa/lma-log-storage-configuration
- Dynatrace Docs: Process group detection - https://docs.dynatrace.com/docs/observe/infrastructure-monitoring/process-groups/configuration/pg-detection
- Dynatrace Docs: Process deep monitoring - https://docs.dynatrace.com/docs/observe/infrastructure-monitoring/process-groups/configuration/pg-monitoring

## Issues Found
- The installer download placeholder used `YOUR_API_TOKEN`, which was too generic. Dynatrace documents that OneAgent installer downloads require a token with the `InstallerDownload` scope, so the placeholder was changed to `YOUR_INSTALLER_DOWNLOAD_TOKEN`.
- The `oneagentctl --set-host-group` and `--set-network-zone` examples did not restart OneAgent. Dynatrace documents that `set` parameters require a OneAgent restart to apply changes unless passed during installation, so `--restart-service` was added to both examples.
- The custom log path UI location used the older `Settings > Log Monitoring > Log sources and storage` wording. Dynatrace's current documentation uses `Settings > Collect and capture > Log Monitoring > Custom log sources`, so the path was updated.

## Review Notes
The RHEL 9 focus is technically reasonable because Dynatrace supports OneAgent on supported Linux distributions and the documented Linux installer is package-manager independent. For custom logs, defining the custom source only identifies the path; log ingestion/storage may still require log ingest rules depending on the environment configuration.
