# Validation Summary: How to Debug Cloud Run VPC Connector Connection Refused Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Serverless VPC Access connectors
- Google Cloud VPC networking
- VPC firewall rules and Firewall Rules Logging
- VPC Flow Logs
- Cloud SQL private IP / private services access
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Cloud Run documentation: VPC with Serverless VPC Access connectors - https://docs.cloud.google.com/run/docs/configuring/vpc-connectors
- Cloud Run VpcAccess REST reference - https://cloud.google.com/run/docs/reference/rest/v2/VpcAccess
- Serverless VPC Access overview, throughput, and scaling - https://docs.cloud.google.com/vpc/docs/serverless-vpc-access
- Google Cloud CLI reference for `gcloud run services update` - https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update
- Google Cloud CLI reference for `gcloud compute networks vpc-access connectors create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Google Cloud CLI reference for `gcloud compute networks subnets update` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Cloud SQL private services access documentation - https://docs.cloud.google.com/sql/docs/postgres/configure-private-services-access
- VPC Flow Logs documentation - https://docs.cloud.google.com/vpc/docs/access-flow-logs
- Firewall Rules Logging documentation - https://docs.cloud.google.com/firewall/docs/firewall-rules-logging

## Issues Found
- The post said `private-ranges-only` routes only RFC 1918 traffic. Updated this to reflect current Cloud Run documentation: it routes internal IPv4 destinations including RFC 1918, RFC 6598, and `199.36.153.4/30` plus `199.36.153.8/30`.
- The post advised using `all-traffic` for "non-standard private IP" or DNS resolution through the VPC. Updated this to the documented cases where `all-traffic` is required, such as privately used external IP destinations routable in the VPC, including some Private Service Connect or custom-routed destinations.
- The VPC Flow Logs section implied VPC Flow Logs show firewall drops with `disposition="DENIED"`. Updated it to explain that firewall-denied ingress packets can be absent from VPC Flow Logs and that `disposition` belongs to Firewall Rules Logging records, not VPC Flow Logs.
- The flow log query used a loose `logName:"vpc_flows"` filter and a partial string match on the connector IP. Updated it to use the documented `compute.googleapis.com/vpc_flows` log name and `ip_in_net(...)` filtering.
- The post described firewall blocks as a direct cause of literal "connection refused" errors. Tightened this wording because Google Cloud firewall drops commonly appear as timeouts, while Firewall Rules Logging is the right source for allow or deny decisions.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud CLI reference documentation instead of local `--help` output.
