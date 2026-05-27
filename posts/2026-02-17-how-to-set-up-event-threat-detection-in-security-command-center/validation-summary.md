# Validation Summary: How to Set Up Event Threat Detection in Security Command Center

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Security Command Center
- Event Threat Detection
- Cloud Audit Logs
- VPC Flow Logs
- Cloud DNS logging
- Cloud NAT logging and Firewall Rules Logging
- Pub/Sub notifications
- Cloud Functions for automated response
- Google Cloud CLI
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud Security Command Center: Overview of Event Threat Detection: https://docs.cloud.google.com/security-command-center/docs/concepts-event-threat-detection-overview
- Google Cloud Security Command Center: Using Event Threat Detection: https://docs.cloud.google.com/security-command-center/docs/how-to-use-event-threat-detection
- Google Cloud Security Command Center: Threat findings index: https://docs.cloud.google.com/security-command-center/docs/threat-findings-index
- Google Cloud CLI: gcloud scc manage services describe: https://cloud.google.com/sdk/gcloud/reference/scc/manage/services/describe
- Google Cloud CLI: gcloud scc manage services update: https://docs.cloud.google.com/sdk/gcloud/reference/scc/manage/services/update
- Google Cloud CLI: gcloud scc findings list: https://cloud.google.com/sdk/gcloud/reference/scc/findings/list
- Google Cloud CLI: gcloud scc notifications create: https://cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Google Cloud Security Command Center: Mute findings: https://cloud.google.com/security-command-center/docs/how-to-mute-findings
- Google Cloud CLI: gcloud compute networks subnets update: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud CLI: gcloud dns policies create: https://cloud.google.com/sdk/gcloud/reference/dns/policies/create
- Cloud Logging: Enable Data Access audit logs: https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud IAM: Disable and enable service accounts: https://cloud.google.com/iam/docs/service-accounts-disable-enable

## Issues Found
- The post described ETD as only analyzing Cloud Audit Logs, VPC Flow Logs, and Cloud DNS logs in real time. Updated this to describe supported Cloud Logging streams more accurately and to include Cloud NAT logs, Firewall Rules logs, and other supported product logs, with "near real time" matching Google Cloud wording.
- The prerequisites incorrectly implied that VPC Flow Logs and Cloud DNS logging are always required. Updated the prerequisites to clarify that these logs are needed for the relevant detectors and investigations, and that Premium or Enterprise tier is required.
- The service status command used `gcloud scc settings services describe`, which is an alpha-era command shape. Replaced it with the current `gcloud scc manage services describe etd --organization=organizations/ORGANIZATION_ID` command and added the current CLI enable command.
- The findings list examples passed a full source resource path to `--source`. Updated the examples to use the source ID as shown in current `gcloud scc findings list` documentation.
- Several finding category names were outdated or incorrect, including `CRYPTOMINING_POOL_CONNECTION`, `CRYPTOMINING_RESOURCE_USAGE`, `MALWARE_CRYPTOMINING_BAD_DOMAIN`, `ANOMALOUS_IAM_GRANT`, `EXTERNAL_MEMBER_ADDED`, `SERVICE_ACCOUNT_KEY_CREATED`, `SSH_BRUTE_FORCE`, `OUTGOING_INTRUSION_ATTEMPT`, and `DNS_EXFILTRATION`. Replaced them with current ETD API category names from the official Event Threat Detection rules.
- The notification filter used outdated category names. Updated it to current ETD categories such as `CRYPTOMINING_POOL_DOMAIN`, `CRYPTOMINING_POOL_IP`, and `BRUTE_FORCE_SSH`.
- The Cloud Function example checked the outdated `CRYPTOMINING_POOL_CONNECTION` category and used a comment that did not match `SERVICE_ACCOUNT_SELF_INVESTIGATION`. Updated the category and comment.
- The detailed finding lookup used `finding.name` in the filter. Updated it to `name`, matching current SCC finding filter examples that use top-level field names.
- The mute rule used outdated category `CRYPTOMINING_POOL_CONNECTION` and `resource.name`. Updated it to `CRYPTOMINING_POOL_IP` and `resource_name`.
- The post said ETD requires no agents, which could be read as applying to every log source. Updated the wording to clarify that ETD itself does not require ETD agents or custom rules.

## Review Notes
- `gcloud` was not installed in the local workspace, so CLI verification was performed against official Google Cloud CLI reference documentation rather than local `--help` output.
- The VPC Flow Logs example uses 100% sampling and a 5-second aggregation interval, which is technically valid but may be expensive. Google Cloud recommends lower sampling and longer aggregation intervals for cost management in many environments.
- The automated response example is intentionally simplified. Production use should add allowlists, dry-run mode, error handling, permissions scoping, and resource-name validation before disabling service accounts or stopping VMs.
