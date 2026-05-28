# Validation Summary: How to Create Your First VPC Service Perimeter in Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- VPC Service Controls
- Access Context Manager
- Google Cloud CLI (`gcloud`)
- BigQuery
- Cloud Storage
- Cloud SQL
- Cloud Logging audit logs

## Sources Consulted
- Google Cloud CLI reference: `gcloud access-context-manager policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/policies/create
- Google Cloud CLI reference: `gcloud access-context-manager policies list` - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/policies/list
- Google Cloud CLI reference: `gcloud access-context-manager perimeters create` - https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud CLI reference: `gcloud access-context-manager perimeters dry-run create` - https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/create
- Google Cloud CLI reference: `gcloud access-context-manager perimeters dry-run enforce` - https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/dry-run/enforce
- Google Cloud CLI reference: `gcloud access-context-manager perimeters update` - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/update
- Google Cloud Access Context Manager documentation: Creating a basic access level - https://docs.cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud VPC Service Controls documentation: Service perimeter details and configuration - https://docs.cloud.google.com/vpc-service-controls/docs/service-perimeters
- Google Cloud VPC Service Controls documentation: Dry run mode for service perimeters - https://docs.cloud.google.com/vpc-service-controls/docs/dry-run-mode
- Google Cloud VPC Service Controls documentation: Allow access to protected resources from outside a perimeter - https://docs.cloud.google.com/vpc-service-controls/docs/use-access-levels
- Google Cloud VPC Service Controls documentation: Supported products and limitations - https://docs.cloud.google.com/vpc-service-controls/docs/supported-products

## Issues Found
- The dry-run perimeter creation command used enforced-mode flags (`--title`, `--resources`, and `--restricted-services`) for a new dry-run-only perimeter. Updated the command to use `--perimeter-title`, `--perimeter-resources`, and `--perimeter-restricted-services`, matching the documented dry-run create syntax for a new Service Perimeter.
- The access level name `corporate-network` contained hyphens, but Access Context Manager access level names can include letters, numbers, and underscores. Changed it to `corporate_network` and updated the corresponding access level resource path.
- The Cloud SQL restricted service was listed as `cloudsql.googleapis.com`, which is not the VPC Service Controls service name for Cloud SQL. Changed it to `sqladmin.googleapis.com` and clarified that VPC Service Controls protects the Cloud SQL Admin API.
- Several claims described VPC Service Controls protection too broadly. Added wording that the boundary applies to supported services restricted in the perimeter, and clarified that inside-to-outside access is controlled for restricted service calls unless egress rules allow it.

## Review Notes
The local environment did not have `gcloud` installed, so command validation was performed against current official Google Cloud CLI documentation rather than local `--help` output. The tutorial remains intentionally introductory; future improvements could mention restricted VIP/private connectivity and service-specific limitations in more depth.
