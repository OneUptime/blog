# Validation Summary: How to Configure Private Service Access for Cloud SQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud SQL
- Private Service Access
- VPC Network Peering
- Service Networking API
- Google Cloud CLI
- Terraform Google provider
- Cloud DNS
- Shared VPC
- Cloud VPN and Cloud Interconnect

## Sources Consulted
- Google Cloud SQL for PostgreSQL: Configure private services access: https://docs.cloud.google.com/sql/docs/postgres/configure-private-services-access
- Google Cloud SQL for MySQL: Configure private IP: https://docs.cloud.google.com/sql/docs/mysql/configure-private-ip
- Google Cloud VPC: Configure private services access: https://docs.cloud.google.com/vpc/docs/configure-private-services-access
- Google Cloud SDK reference: gcloud services vpc-peerings update: https://docs.cloud.google.com/sdk/gcloud/reference/services/vpc-peerings/update
- Google Cloud SDK reference: gcloud sql instances create: https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud SDK reference: gcloud beta sql instances create: https://cloud.google.com/sdk/gcloud/reference/beta/sql/instances/create
- Terraform Registry: google_sql_database_instance: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance

## Issues Found
- The introduction stated that without PSA, Cloud SQL can only be accessed through public IP or the Auth Proxy over public endpoints. This was too absolute because Cloud SQL has other connectivity options, such as Private Service Connect. Changed the wording to say PSA-based private IP connectivity is unavailable without PSA.
- The post stated that the peering cannot be modified directly, but later correctly updates peering route import/export settings. Changed the wording to clarify that Service Networking commands manage the private connection and the VPC peering should not be deleted directly.
- The post stated that the allocated range cannot be changed after Cloud SQL instances are created in it. Google Cloud documents that a private service connection's allocated ranges can be changed, while a Cloud SQL instance's assigned allocated range name cannot be changed after creation. Updated the wording accordingly.
- The Cloud SQL command that uses `--allocated-ip-range-name` used `gcloud sql instances create`. Current Google Cloud SDK docs expose that flag on `gcloud beta sql instances create`, so the command was updated to use the beta command surface.
- The on-premises connectivity section said to export PSA routes. Google Cloud documentation requires exporting custom routes to the service producer network for return traffic and advertising the allocated PSA range toward on-premises. Updated the section and summary to include both requirements.

## Review Notes
The Terraform resources and field names matched the current Google provider documentation. The local environment did not have `gcloud` or Terraform installed, so CLI validation was performed against official Google Cloud SDK and Terraform Registry documentation rather than local `--help` output.
