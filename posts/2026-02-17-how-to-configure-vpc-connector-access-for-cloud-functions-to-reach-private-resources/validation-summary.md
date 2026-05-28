# Validation Summary: Configure VPC Connector Access for Cloud Functions to Reach Private Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Serverless VPC Access connectors
- Google Cloud VPC networking and firewall rules
- Cloud SQL private IP
- Memorystore for Redis
- Internal load balancers
- Google Cloud CLI
- Terraform Google provider
- Node.js, Functions Framework, pg, redis, axios

## Sources Consulted
- Google Cloud Serverless VPC Access connector configuration: https://docs.cloud.google.com/vpc/docs/configure-serverless-vpc-access
- Google Cloud Serverless VPC Access overview, throughput, scaling, and connector network tags: https://docs.cloud.google.com/vpc/docs/serverless-vpc-access
- Google Cloud SDK reference for `gcloud compute networks vpc-access connectors create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Google Cloud Functions runtime support: https://docs.cloud.google.com/functions/docs/runtime-support
- Google Cloud Functions v2 API reference for VPC connector egress settings: https://docs.cloud.google.com/functions/docs/reference/rpc/google.cloud.functions.v2
- Terraform Google provider `google_vpc_access_connector`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/vpc_access_connector
- Terraform Google provider `google_cloudfunctions2_function`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Terraform Google provider `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Google Cloud Memorystore for Redis overview and networking docs: https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview and https://docs.cloud.google.com/memorystore/docs/redis/networking
- Google Cloud VPC firewall rules overview: https://docs.cloud.google.com/firewall/docs/firewalls

## Issues Found
- The post described the connector subnet as a `/28` minimum. Google Cloud documents connector subnets as dedicated `/28` subnets that must remain `/28`, so the wording was corrected.
- The auto-created subnet example said "auto-assigned IP range" even though the command provides the range and Google creates a managed connector subnet from it. The comment was corrected.
- The internal load balancer JavaScript snippet used `functions.http` without importing the Functions Framework in that snippet. Added the missing import.
- The firewall rule example targeted `cloudsql` with a VM network tag, which does not target Cloud SQL private IP instances. Replaced the example with VM/internal-load-balancer backend firewall rules using documented connector source tags, and added a note for Cloud SQL private IP and Memorystore connectivity.
- The troubleshooting note said connector errors usually mean the subnet is too small. Updated it to reflect the documented dedicated `/28` requirement and range-conflict failure mode.

## Review Notes
- `nodejs20` is still listed by Google Cloud as supported for 1st gen and Cloud Run functions, but it reached deprecation on April 30, 2026 and is scheduled for decommission on October 30, 2026. A future update should move examples to `nodejs22` or newer.
- The Terraform snippet is illustrative and references resources that are not fully defined in the post, such as source buckets, service accounts, and the Cloud SQL instance.
