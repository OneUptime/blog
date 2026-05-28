# Validation Summary: How to Debug Cloud SQL Connection Refused Errors for Private IP Configurations

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL private IP
- Private services access
- VPC Network Peering
- Google Cloud CLI
- Google Cloud firewall rules
- Cloud SQL Auth Proxy
- Google Kubernetes Engine
- Shared VPC

## Sources Consulted
- Google Cloud SQL private IP overview: https://docs.cloud.google.com/sql/docs/mysql/private-ip
- Google Cloud SQL private IP configuration guide: https://docs.cloud.google.com/sql/docs/mysql/configure-private-ip
- Google Cloud SQL private services access guide: https://docs.cloud.google.com/sql/docs/mysql/configure-private-services-access
- Google Cloud SQL Auth Proxy documentation: https://docs.cloud.google.com/sql/docs/postgres/sql-proxy
- Cloud SQL Auth Proxy official repository: https://github.com/GoogleCloudPlatform/cloud-sql-proxy
- Cloud SQL Admin API instance IP address types: https://docs.cloud.google.com/sql/docs/sqlserver/admin-api/rest/v1/instances
- gcloud sql instances patch reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- gcloud services vpc-peerings update reference: https://docs.cloud.google.com/sdk/gcloud/reference/services/vpc-peerings/update
- gcloud compute addresses create reference: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- gcloud compute firewall-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create

## Issues Found
- The post said the VM and Cloud SQL instance must be in the same region unless peering route import/export is enabled. Google Cloud documents that Cloud SQL private IP can be reached across regions. I changed this to require access to the VPC where private services access is configured, and rewrote the cross-region section as external or multi-VPC connectivity guidance.
- The route inspection command filtered only `10.0` destination ranges. Private services access ranges are not necessarily in `10.0.0.0/8`. I changed the route filter to look for routes with `nextHopPeering`.
- The command for getting the Cloud SQL private IP used `ipAddresses[0]`, which can return a public `PRIMARY` address when both public and private IPs exist. I changed it to flatten and filter for `ipAddresses.type=PRIVATE`.
- The firewall allow example used `10.0.0.0/8`, which can be too broad and can miss Cloud SQL private IPs allocated from other private or privately used ranges. I changed it to use the specific `PRIVATE_IP/32` placeholder.
- The firewall section implied only database ports matter. For Cloud SQL Auth Proxy, Google documents outbound TCP 443 and 3307 requirements. I added that distinction.
- The GKE section said a peered VPC was sufficient and that pods should resolve the Cloud SQL private IP. Because VPC peering is not transitive and Cloud SQL documents specific multi-VPC patterns, I changed this to require the same VPC or supported multi-VPC connectivity and changed resolution to routing.
- The GKE section implied Workload Identity and `cloudsql.client` are required for direct private IP connectivity. I narrowed that requirement to Cloud SQL Auth Proxy or connector use.
- The post did not mention the Shared VPC limitation for existing instances. I added the Google Cloud documented caveat that existing Cloud SQL instances cannot be assigned a private IP in a Shared VPC network.

## Review Notes
The local environment did not have `gcloud` installed, so CLI flags were verified against the official Google Cloud SDK reference documentation instead of local `--help` output.
