# Validation Summary: How to Track Shared Responsibility Model Compliance Obligations in Google Cloud

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud shared responsibility model
- Compute Engine
- Google Kubernetes Engine
- Cloud Run
- BigQuery and GoogleSQL
- Cloud Functions / Functions Framework for Python
- Cloud Scheduler
- Compute Engine Python client library
- BigQuery Python client library
- Security Command Center
- Compliance Reports Manager
- Assured Workloads

## Sources Consulted
- Google Cloud Architecture Center: Shared responsibilities and shared fate on Google Cloud: https://docs.cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate
- GKE shared responsibility: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/shared-responsibility
- Cloud Run security design overview: https://docs.cloud.google.com/run/docs/securing/security
- Compute Engine disk encryption and CMEK: https://docs.cloud.google.com/compute/docs/disks/customer-managed-encryption
- Compute Engine disk encryption details: https://docs.cloud.google.com/compute/docs/disks/view-disk-details
- Compute Engine Disks API reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/disks
- Google Cloud Python Compute client reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.services.disks.DisksClient
- Google Cloud Python Compute firewall allowed type reference: https://cloud.google.com/python/docs/reference/compute/latest/google.cloud.compute_v1.types.Allowed
- BigQuery bq command-line reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery GoogleSQL DDL reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery date and timestamp functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions and https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery Python client insert_rows_json reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- Cloud Scheduler HTTP job reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler HTTP authentication guide: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Compliance Reports Manager: https://cloud.google.com/security/compliance/compliance-reports-manager/
- Assured Workloads violations REST reference: https://cloud.google.com/assured-workloads/docs/reference/rest/v1/organizations.locations.workloads.violations/list
- Security Command Center overview: https://docs.cloud.google.com/security-command-center/docs/security-command-center-overview
- Security Command Center Compliance Manager overview: https://docs.cloud.google.com/security-command-center/docs/compliance-manager-overview

## Issues Found
- The automated findings table was queried and written to but never created. Added a `compliance_tracking.automated_findings` table definition with fields matching the Python findings and dashboard query.
- The Python compliance checker wrote a `check` field, while the dashboard query grouped by `check_type`. Changed emitted findings to use `check_type`.
- The CMEK check only tested whether `disk_encryption_key` existed. Because Compute Engine uses the `diskEncryptionKey.kmsKeyName` field for CMEK, changed the check to require `kms_key_name`.
- The firewall check treated public rules with no port list as passing. In Compute Engine firewall rules, an omitted port list can mean all ports for the protocol, so the check now only passes public TCP rules limited to ports 80 and 443.
- Removed unused Python imports for `asset_v1` and `timedelta`, and replaced `datetime.utcnow()` with timezone-aware UTC timestamps.
- The dashboard SQL block had two queries without semicolons between them. Added semicolons so the block can run as a BigQuery script.
- The compliance documentation section described an Assured Workloads violation command as a Compliance Reports API call, and the command omitted the workload identifier. Reworded it as an Assured Workloads violations example and added `--workload=WORKLOAD_ID`.

## Review Notes
The Cloud Function example is still intentionally illustrative: service account hygiene and audit logging checks are placeholders, and production deployments should discover zones dynamically rather than hard-code them. Security Command Center capabilities vary by tier; the post's statement that SCC supplements obligation tracking is accurate, but future revisions could mention tier requirements for Compliance Manager and posture features.
