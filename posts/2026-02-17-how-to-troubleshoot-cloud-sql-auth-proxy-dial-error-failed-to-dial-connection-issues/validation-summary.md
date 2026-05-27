# Validation Summary: Troubleshoot Cloud SQL Auth Proxy Dial Error Failed to Dial Connection Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL Auth Proxy
- Google Cloud CLI (`gcloud`)
- Google Cloud IAM
- Private Google Access
- Bash diagnostics

## Sources Consulted
- Cloud SQL Auth Proxy overview: https://docs.cloud.google.com/sql/docs/postgres/sql-proxy
- Connect using the Cloud SQL Auth Proxy: https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Cloud SQL Admin API instances resource: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1/instances
- Start, stop, and restart Cloud SQL instances: https://docs.cloud.google.com/sql/docs/postgres/start-stop-restart-instance
- Google Cloud Service Usage list services documentation: https://docs.cloud.google.com/service-usage/docs/list-services
- Configure Private Google Access: https://docs.cloud.google.com/vpc/docs/configure-private-google-access
- `gcloud auth application-default print-access-token` reference: https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token
- `gcloud compute networks subnets update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Cloud SQL Auth Proxy GitHub documentation and flags: https://github.com/GoogleCloudPlatform/cloud-sql-proxy

## Issues Found
- Corrected the IAM role wording from `cloudsql.client` to Cloud SQL Client (`roles/cloudsql.client`) or equivalent permissions, matching Google Cloud IAM role naming.
- Updated the network requirement to include TCP port 3307 in addition to HTTPS port 443, because the Cloud SQL Auth Proxy requires egress to both Google APIs and the Cloud SQL proxy server.
- Corrected the instance status check to include `settings.activationPolicy`. Cloud SQL Admin API documents `RUNNABLE` as running or stopped by owner, so activation policy is needed to identify a stopped instance.
- Added the `gcloud sql instances patch --activation-policy=ALWAYS` command for starting a stopped Cloud SQL instance.
- Updated the Cloud SQL Auth Proxy Linux download URL from v2.8.0 to v2.22.0, the current version shown in Google Cloud documentation at review time.
- Fixed the diagnostic script's Cloud SQL Admin API check so it prints `NOT ENABLED` when `gcloud services list` succeeds but returns no matching service.
- Updated the diagnostic script to report activation policy alongside instance state.
- Updated the Mermaid flowchart labels to use the correct Cloud SQL Client role naming.

## Review Notes
The troubleshooting flow is technically sound after the corrections. The pinned Cloud SQL Auth Proxy download version should be rechecked during future validations because Google updates the proxy regularly.
