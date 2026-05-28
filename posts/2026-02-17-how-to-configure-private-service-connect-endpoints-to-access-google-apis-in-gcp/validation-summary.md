# Validation Summary: How to Configure Private Service Connect Endpoints to Access Google APIs in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Private Service Connect
- Google APIs
- Google Cloud VPC networking
- Cloud DNS
- Cloud Router
- VPC Flow Logs
- gcloud CLI

## Sources Consulted
- Google Cloud: Access Google APIs through endpoints: https://docs.cloud.google.com/vpc/docs/configure-private-service-connect-apis
- Google Cloud: About accessing Google APIs through endpoints: https://docs.cloud.google.com/vpc/docs/about-accessing-google-apis-endpoints
- Google Cloud SDK: gcloud compute forwarding-rules create: https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK: gcloud compute routers update: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/update
- Google Cloud: Monitor Private Service Connect connections: https://docs.cloud.google.com/vpc/docs/monitor-private-service-connect-connections

## Issues Found
- The original endpoint address command used a regional subnet address with `--purpose=GCE_ENDPOINT`. Updated it to reserve a global internal address with `--purpose=PRIVATE_SERVICE_CONNECT`, `--global`, and `--network`, and clarified that the endpoint IP must not be inside a subnet range.
- The forwarding rule examples used regional forwarding rules, subnet flags, `--load-balancing-scheme=""`, and endpoint names with hyphens. Updated them to use global forwarding rules, removed the subnet and load balancing scheme flags, and used endpoint names compatible with the PSC Google APIs endpoint requirements.
- The DNS example pointed the wildcard `*.googleapis.com` CNAME at a custom `p.googleapis.com` name. Updated it to the documented pattern: an apex `A` record for `googleapis.com.` and a wildcard CNAME to `googleapis.com.`.
- The examples reused `10.10.0.100`, which implied an endpoint IP inside the same subnet as the example VM. Updated examples to use `10.20.0.100` and `10.20.0.101` consistently.
- Added the required caveat that VMs without external IP addresses need Private Google Access enabled on their subnet before using the endpoint.
- The Cloud Router example could replace existing custom advertisements without keeping subnet advertisements. Updated it to include `--set-advertisement-groups=ALL_SUBNETS` with the PSC endpoint range.
- The monitoring section incorrectly suggested Cloud Monitoring PSC metrics for Google API endpoints. Updated it to use VPC Flow Logs, because PSC metrics are not generated for endpoints that connect to Google APIs.
- The cleanup commands used regional deletion flags and omitted the apex DNS `A` record. Updated cleanup to delete the global forwarding rule, global address, wildcard CNAME, and apex `A` record.

## Review Notes
The tutorial is technically relevant and valid after corrections. Future improvements could mention Service Directory's automatically created `p.googleapis.com` private zone and endpoint-specific names for clients that support custom API endpoints.
