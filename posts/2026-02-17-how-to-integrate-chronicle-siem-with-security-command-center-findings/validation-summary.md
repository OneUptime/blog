# Validation Summary: How to Integrate Chronicle SIEM with Security Command Center Findings

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Google Cloud Security Command Center
- Google Security Operations / Chronicle SIEM
- Google Cloud Pub/Sub
- Google Cloud CLI (`gcloud`)
- YARA-L detection rules
- Unified Data Model (UDM)
- Chronicle SOAR
- Sensitive Data Protection API

## Sources Consulted
- Google Security Operations documentation: Ingest Google Cloud data to Google Security Operations - https://cloud.google.com/chronicle/docs/ingestion/default-parsers/ingest-gcp-logs
- Google Security Operations documentation: Collect Security Command Center findings - https://docs.cloud.google.com/chronicle/docs/ingestion/default-parsers/collect-security-command-center-findings
- Security Command Center documentation: Enable finding notifications for Pub/Sub - https://docs.cloud.google.com/security-command-center/docs/how-to-notifications
- Security Command Center documentation: Filtering notifications - https://docs.cloud.google.com/security-command-center/docs/how-to-api-filter-notifications
- Google Cloud SDK reference: `gcloud scc notifications create` - https://docs.cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Google Security Operations documentation: Feed management overview - https://cloud.google.com/chronicle/docs/administration/feed-management-overview
- Google Security Operations documentation: Use the Feed Management UI - https://docs.cloud.google.com/chronicle/docs/administration/feed-management
- Google Security Operations documentation: YARA-L condition section syntax - https://docs.cloud.google.com/chronicle/docs/yara-l/condition-syntax
- Google Security Operations documentation: YARA-L expressions, operators, and map syntax - https://docs.cloud.google.com/chronicle/docs/yara-l/expressions
- Google Cloud IAM documentation: Security Command Center roles and permissions - https://docs.cloud.google.com/iam/docs/roles-permissions/securitycenter

## Issues Found
- The direct integration instructions referred to a Chronicle integrations page and a Chronicle service account permission grant that did not match the current Google SecOps direct ingestion flow. Updated the section to describe Google SecOps direct ingestion from the Google Cloud console and changed the IAM examples to apply to a SOAR or automation identity.
- The prerequisites implied that only SCC Premium or Enterprise could be used. Clarified that SCC must be enabled, Premium or Enterprise is recommended for richer findings, and direct Google SecOps ingestion is documented for Security Center Premium findings.
- The finding filter section described SCC finding classes as categories and used `SCC_ERROR`, which is not the Google SecOps ingestion label. Updated the labels to `GCP_SECURITYCENTER_THREAT`, `GCP_SECURITYCENTER_VULNERABILITY`, `GCP_SECURITYCENTER_MISCONFIGURATION`, and `GCP_SECURITYCENTER_ERROR`.
- The Pub/Sub notification filter used example category names that are not reliable SCC finding category values and did not filter inactive findings. Replaced it with a valid active high/critical severity filter and noted that specific `category` values can be added from the user's SCC findings.
- The SCC notification command omitted `--location`. Added `--location=global`, matching the current gcloud SCC notification configuration model.
- The feed creation instructions used older Chronicle wording and a vague log type name. Updated the wording to Google SecOps and Security Command Center findings.
- The post stated that finding state can be `MUTED`. SCC finding state is `ACTIVE` or `INACTIVE`; mute status is separate. Corrected the wording.
- The YARA-L failed-login example used `security_result.action = "BLOCK"`. Updated it to `FAIL`, matching Google's YARA-L failed login examples.
- The SOAR playbook referenced the Data Loss Prevention API. Updated it to Sensitive Data Protection API, the current Google Cloud product name.

## Review Notes
The YARA-L examples remain illustrative and may need environment-specific field adjustments because SCC parser mappings vary by finding class and source. The Pub/Sub feed setup can also vary depending on whether a deployment uses direct ingestion, a Pub/Sub feed, or a Pub/Sub push feed.
