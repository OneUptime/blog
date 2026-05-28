# Validation Summary: How to Ingest Windows Event Logs into Chronicle Using the Forwarder

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google SecOps / Chronicle SIEM
- Google SecOps forwarder
- Windows Event Forwarding
- Windows Event Collector
- Windows Event Logs
- NXLog Community Edition
- Docker
- Sysmon
- UDM search

## Sources Consulted
- Google Security Operations documentation: Install and configure the forwarder: https://docs.cloud.google.com/chronicle/docs/install/install-forwarder
- Google Security Operations documentation: Manage forwarder configuration file manually: https://docs.cloud.google.com/chronicle/docs/install/forwarder-configuration-manual
- Google Security Operations documentation: Collect Microsoft Windows Event logs: https://docs.cloud.google.com/chronicle/docs/ingestion/default-parsers/winevtlog
- Google Security Operations documentation: Collect Microsoft Windows Sysmon logs: https://docs.cloud.google.com/chronicle/docs/ingestion/default-parsers/windows-sysmon
- Microsoft Learn: wecutil: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wecutil
- Microsoft Learn: Setting up a Source Initiated Subscription: https://learn.microsoft.com/en-us/windows/win32/wec/setting-up-a-source-initiated-subscription

## Issues Found
- The post did not mention the current deprecation status of the Google SecOps forwarder. Added a note that, as of April 1, 2026, new Google SecOps customers cannot use the forwarder and that Google recommends Bindplane for new log collection deployments.
- The prerequisite list described a generic secret key. Updated it to specify the customer ID, collector ID, and a service account key with Data Plane API permissions, matching the current forwarder configuration documentation.
- The outbound connectivity prerequisite named only `malachiteingestion-pa.googleapis.com`. Updated it to refer to the required Google SecOps ingestion and authentication endpoints because current Google documentation lists multiple region and authentication endpoints.
- The NXLog examples sent data using `OutputType Syslog_TLS` or `to_syslog_ietf()`, which did not match Google's documented NXLog examples for WINEVTLOG and WINDOWS_SYSMON ingestion. Updated the snippets to send JSON over TCP with `to_json()` and timestamp conversion.
- The direct NXLog example sent Sysmon events to the same port as standard Windows Event Logs even though Sysmon should use the `WINDOWS_SYSMON` parser. Split Sysmon into a separate output and route on port 10515, matching the separate forwarder collector.
- The forwarder configuration used an older/minimal output block. Updated the examples to include the current Data Plane fields: regional `url`, `use_dataplane`, `project_id`, `region`, and a service account JSON `secret_key`.
- The Docker run command published a single port instead of using the documented Linux forwarder pattern. Updated it to include log rotation options and `--net=host`, consistent with Google's Linux forwarder installation guidance.

## Review Notes
The article remains technically relevant for existing Google SecOps forwarder deployments, but new deployments should use Bindplane where possible because the forwarder is deprecated and has published end-of-life dates.
