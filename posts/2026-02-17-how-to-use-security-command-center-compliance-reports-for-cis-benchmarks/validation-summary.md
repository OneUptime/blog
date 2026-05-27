# Validation Summary: How to Use Security Command Center Compliance Reports for CIS Benchmarks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Security Command Center
- Security Health Analytics
- CIS Google Cloud Computing Foundations Benchmark
- Google Cloud CLI
- BigQuery
- Pub/Sub notifications
- Python
- SQL

## Sources Consulted
- Google Cloud Security Command Center compliance management documentation: https://docs.cloud.google.com/security-command-center/docs/compliance-management
- Google Cloud Security Command Center console documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-use-security-command-center
- Google Cloud Security Command Center findings list documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-api-list-findings
- Google Cloud Security Command Center finding REST reference: https://docs.cloud.google.com/security-command-center/docs/reference/rest/v2/organizations.sources.locations.findings
- Google Cloud Security Command Center vulnerability findings reference: https://docs.cloud.google.com/security-command-center/docs/concepts-vulnerabilities-findings
- Google Cloud Security Command Center BigQuery export documentation: https://docs.cloud.google.com/security-command-center/docs/how-to-analyze-findings-in-big-query
- Google Cloud SDK reference for SCC notification configs: https://cloud.google.com/sdk/gcloud/reference/scc/notifications/create
- Google Cloud SDK reference for subnet updates and VPC Flow Logs flags: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update

## Issues Found
- The console navigation described the compliance view as a generic "Compliance" tab. Updated it to reflect the current Compliance page and the difference between the legacy compliance view and Compliance Manager.
- The prerequisites listed only `roles/securitycenter.findingsViewer`. Added `roles/securitycenter.adminViewer` as the role needed for broader Security Command Center console access.
- The `gcloud scc findings list` examples used an older parent/source pattern and filtered on `sourceProperties.compliance_standards`, which is not the current finding field for compliance mappings. Updated the commands to use `organizations/ORGANIZATION_ID`, `--location=global`, `--source=SHA_SOURCE_ID`, and the `compliances` array field with `contains()`.
- The text described the CLI aggregation as a count per CIS section, but the command groups by finding category. Updated the wording to match the command behavior.
- The CIS mapping table had incorrect or incomplete mappings for MFA, VPC Flow Logs, and Cloud SQL SSL. Updated those rows to match Security Health Analytics finding categories and documented CIS control mappings.
- The BigQuery trend query used a `structured_findings` table and top-level `state` and `category` fields. Updated it to use the SCC BigQuery export `findings` table and nested `finding.state` / `finding.category` fields.
- The notification command claimed to alert on CIS-related findings but only filtered by severity and state. Updated the wording and filter to scope the notification to the Security Health Analytics source and include the current `--location` flag.

## Review Notes
The local environment did not have `gcloud` installed, so command validation was performed against the official Google Cloud CLI reference and Security Command Center documentation rather than local `--help` output.
