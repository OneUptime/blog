# Validation Summary: Configure Cloud Run Direct VPC Egress to Avoid VPC Connector Throughput Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Direct VPC egress
- Serverless VPC Access connectors
- Google Cloud VPC subnets and firewall rules
- Cloud NAT and Cloud Router
- Google Cloud CLI
- Cloud Run service YAML
- Python Flask connectivity testing

## Sources Consulted
- Google Cloud Run Direct VPC egress documentation: https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Google Cloud Run migration from Serverless VPC Access connectors to Direct VPC egress: https://docs.cloud.google.com/run/docs/configuring/migrate-direct-vpc
- Google Cloud Serverless VPC Access connector documentation: https://docs.cloud.google.com/vpc/docs/serverless-vpc-access
- Google Cloud Run static outbound IP documentation: https://docs.cloud.google.com/run/docs/configuring/static-outbound-ip
- Google Cloud VPC subnet documentation: https://cloud.google.com/vpc/docs/subnets

## Issues Found
- The post said Serverless VPC Access connectors max out around 1 Gbps. Updated this to reflect current documented throughput ranges by connector machine type, including e2-standard-4 connectors up to an estimated 16 Gbps.
- The post said each Cloud Run instance uses one subnet IP address. Updated this to the current Cloud Run guidance: services use about 2 times the instance count at steady state, require headroom for revision updates, reserve addresses in blocks of 16, and need a /26 or larger subnet.
- The post said a /24 subnet gives 254 usable addresses. Updated this to 252 usable addresses for Google Cloud primary subnet ranges because Google reserves the first two and last two addresses.
- The post described the subnet describe command as checking available IPs. Updated the wording because that command shows configured IP ranges, not available address counts.
- The `private-ranges-only` description was narrowed to RFC 1918 private ranges. Updated it to match Cloud Run documentation, which describes the setting as routing traffic to internal addresses through the VPC.
- The Cloud Run YAML example had an invalid nested `spec.template.spec.vpcAccess` structure and duplicated `spec` keys. Replaced it with the documented `run.googleapis.com/network-interfaces` and `run.googleapis.com/vpc-access-egress` annotations.
- The Cloud NAT section implied all outbound traffic would use the static IP without restating the Cloud Run `all-traffic` egress requirement. Updated the sentence to make that condition explicit.
- The troubleshooting IP command only displayed the subnet CIDR. Replaced it with the documented `gcloud compute addresses list` command for viewing Cloud Run allocated IP addresses.

## Review Notes
The local environment did not have `gcloud` installed, so CLI flag validation was performed against official Google Cloud documentation rather than local `gcloud --help` output.
