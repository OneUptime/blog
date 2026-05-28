# Validation Summary: How to Fix Private Service Connect Endpoint Not Connecting to Published Service

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Private Service Connect
- Google Cloud VPC
- Private Service Connect service attachments
- Private Service Connect endpoints and forwarding rules
- Cloud DNS
- Google Cloud CLI
- Google Cloud load balancing
- Google Cloud firewall rules and quotas

## Sources Consulted
- Google Cloud Private Service Connect overview: https://cloud.google.com/vpc/docs/private-service-connect
- Google Cloud Access published services through endpoints: https://cloud.google.com/vpc/docs/configure-private-service-connect-services
- Google Cloud Publish services by using Private Service Connect: https://cloud.google.com/vpc/docs/configure-private-service-connect-producer
- Google Cloud Manage published services: https://cloud.google.com/vpc/docs/manage-private-service-connect-services
- Google Cloud About published services and NAT subnets: https://cloud.google.com/vpc/docs/about-vpc-hosted-services
- Google Cloud Access Google APIs through endpoints: https://cloud.google.com/vpc/docs/configure-private-service-connect-apis
- Google Cloud VPC quotas and limits: https://cloud.google.com/vpc/docs/quota
- Compute Engine forwardingRules REST resource: https://cloud.google.com/compute/docs/reference/rest/v1/forwardingRules
- Compute Engine subnetworks REST resource: https://cloud.google.com/compute/docs/reference/rest/v1/subnetworks
- gcloud compute service-attachments update reference: https://cloud.google.com/sdk/gcloud/reference/compute/service-attachments/update
- gcloud compute forwarding-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- gcloud compute networks subnets describe reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/describe
- gcloud compute networks subnets create reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create

## Issues Found
- The post stated that PSC connections must be explicitly accepted. This was too broad because service attachments can use `ACCEPT_AUTOMATIC`; I changed the wording to say the producer side accepts connections either automatically or through an explicit accept list.
- The `pscConnectionStatus` list omitted `NEEDS_ATTENTION`, a current forwarding rule status. I added it and updated the flowchart to account for it.
- The description of `ACCEPTED` implied the endpoint should always work. I clarified that `ACCEPTED` means the PSC connection is established, but DNS, firewall, or backend health issues can still block traffic.
- The NAT subnet command claimed to check IP utilization but did not request utilization data. I added `--view=WITH_UTILIZATION` and included `utilizationDetails` in the JSON output.

## Review Notes
The remaining `gcloud` commands and PSC concepts are consistent with current Google Cloud documentation. The quota-checking command is a useful broad inspection pattern, but exact quota names vary by PSC target type and should be confirmed in the Google Cloud quotas page when troubleshooting a specific environment.
