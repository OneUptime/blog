# Validation Summary: How to Configure Private Service Connect for Consuming Google APIs Without

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Private Service Connect
- Google Cloud VPC
- Google Cloud DNS
- Service Directory
- VPC Flow Logs
- gcloud CLI
- VPC Service Controls

## Sources Consulted
- Google Cloud VPC documentation: Access Google APIs through endpoints - https://docs.cloud.google.com/vpc/docs/configure-private-service-connect-apis
- Google Cloud VPC documentation: About accessing Google APIs through endpoints - https://docs.cloud.google.com/vpc/docs/about-accessing-google-apis-endpoints
- Google Cloud VPC documentation: Private Service Connect compatibility - https://docs.cloud.google.com/vpc/docs/private-service-connect-compatibility
- Google Cloud SDK documentation: gcloud compute forwarding-rules create - https://docs.cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK documentation: gcloud compute forwarding-rules list - https://docs.cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/list
- Google Cloud VPC documentation: VPC Flow Logs traffic flows - https://docs.cloud.google.com/vpc/docs/about-traffic-flows

## Issues Found
- Corrected the default traffic explanation. Google Cloud documentation states default Google API DNS names resolve to publicly routable IP addresses, but traffic from Google Cloud resources to those IPs remains within Google's network.
- Corrected prerequisites. Service Directory API and Cloud DNS API are required for this workflow; Service Networking API is not part of the documented PSC endpoint setup for Google APIs. Added the documented IAM roles and the Private Google Access caveat for VMs without external IP addresses.
- Corrected the PSC address reservation command. Global Google API endpoints require a global internal address with `--purpose=PRIVATE_SERVICE_CONNECT` and `--network`, not a regional subnet address with `--purpose=GCE_ENDPOINT`.
- Corrected the forwarding rule commands. PSC endpoints for global Google APIs use `--global`, not `--region`.
- Corrected endpoint IP guidance. The endpoint IP must be a single IPv4 address that is not inside any primary or secondary subnet range in the VPC.
- Corrected DNS configuration. The documented default-name override uses an A record for `googleapis.com.` pointing to the endpoint IP and a wildcard CNAME for `*.googleapis.com.` pointing to that A record. Removed the manual `p.googleapis.com` private zone, which can conflict with the Service Directory DNS zone created for PSC.
- Corrected the multiple-regions section. Global Google API endpoints are global resources reachable from any region in the VPC; multiple endpoints are optional for policy, routing, or bundle separation rather than required per region.
- Corrected Shared VPC wording and command syntax to avoid implying a regional endpoint.
- Corrected monitoring commands and notes. `describe` and `list` use global forwarding rules, and VPC Flow Logs annotate VM-to-Google API flows through PSC endpoints.
- Corrected firewall and verification examples to use the updated endpoint IP.

## Review Notes
The local environment did not have `gcloud` installed, so command verification was done against official Google Cloud SDK and VPC documentation rather than local `--help` output.
