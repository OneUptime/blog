# Validation Summary: How to Automate CIS Benchmark Compliance Scanning for Google Cloud Resources

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Security Command Center
- Security Health Analytics
- CIS Google Cloud Computing Foundations Benchmark
- Google Cloud CLI
- Python Google Cloud client libraries
- Cloud Functions
- Pub/Sub
- Cloud Scheduler
- Google Cloud Organization Policy
- Terraform Google provider
- Cloud SQL
- Cloud Storage
- BigQuery SQL

## Sources Consulted
- Google Cloud Security Command Center compliance documentation: https://docs.cloud.google.com/security-command-center/docs/compliance-management
- Google Cloud Security Health Analytics documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-use-security-health-analytics
- Google Cloud SDK `gcloud scc manage services update`: https://docs.cloud.google.com/sdk/gcloud/reference/scc/manage/services/update
- Google Cloud SDK `gcloud scc findings list`: https://docs.cloud.google.com/sdk/gcloud/reference/scc/findings/list
- Security Command Center vulnerability findings: https://docs.cloud.google.com/security-command-center/docs/how-to-remediate-security-health-analytics-findings
- Google Cloud Organization Policy constraints: https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Cloud SQL organization policies: https://docs.cloud.google.com/sql/docs/mysql/org-policy/org-policy
- Cloud SQL SSL/TLS configuration for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/configure-ssl-instance
- Google Cloud IAM Admin Python client docs: https://docs.cloud.google.com/python/docs/reference/iam/latest/google.cloud.iam_admin_v1.services.iam.IAMClient
- Google Cloud Compute Python `Allowed` type docs: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.types.Allowed

## Issues Found
- The Security Health Analytics enable command used `gcloud scc settings services enable`, which is now an alpha settings command shape. Updated it to the documented `gcloud scc manage services update security-health-analytics --enablement-state=ENABLED` form.
- The SCC findings command used `--source=SECURITY_HEALTH_ANALYTICS` and filtered `category:"CIS"`. The SCC CLI expects a source ID, and SHA finding categories are detector names, not CIS labels. Added a source lookup command and changed the findings query to list active SHA findings for correlation in SCC Compliance.
- The SHA mapping table incorrectly mapped SSL enforcement to `SQL_NO_ROOT_PASSWORD`. Replaced it with `SSL_NOT_ENFORCED`; `SQL_NO_ROOT_PASSWORD` applies to MySQL root password configuration.
- The Python scanner imported `google.cloud.iam_v1`, which is not the documented IAM Admin client for listing service accounts and service account keys. Replaced it with `google.cloud.iam_admin_v1`.
- The Python scanner used `datetime.utcnow()` without importing `datetime`. Added `from datetime import datetime, timezone` and used `datetime.now(timezone.utc)`.
- The Cloud Functions deployment referenced the Pub/Sub topic before creating it. Moved topic creation before deployment.
- The organization policy example used `compute.vmExternalIpAccess` with `enable-enforce`, but that constraint is a list constraint rather than a simple boolean enforcement example. Replaced it with the boolean `storage.publicAccessPrevention` policy, which directly prevents public Cloud Storage access.
- The Terraform Cloud SQL example used the legacy `require_ssl` setting. Replaced it with the current `ssl_mode = "ENCRYPTED_ONLY"` setting recommended by Cloud SQL documentation.
- The Terraform section label described the snippet as "Sentinel-style validation" even though it was resource configuration. Updated the comment to describe it as Terraform resource configuration enforcing CIS-aligned controls.

## Review Notes
- `gcloud` was not installed in the local workspace, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
- The Python code was syntax-checked locally with `ast.parse`; runtime execution was not attempted because it requires Google Cloud credentials, enabled APIs, and the relevant client libraries.
- CIS control numbers can vary by benchmark version. The post now relies on SCC Compliance for authoritative current detector-to-control correlation.
