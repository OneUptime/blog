# Validation Summary: How to Set Up VPC Access Connector for App Engine to Communicate

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google App Engine standard environment
- Google Cloud Serverless VPC Access
- Google Cloud VPC networking
- Google Cloud CLI (`gcloud`)
- Cloud NAT and Cloud Router
- Shared VPC
- Cloud Monitoring
- Python Flask, Redis client, and Requests

## Sources Consulted
- Google Cloud: App Engine standard - Connecting to a VPC network: https://docs.cloud.google.com/appengine/docs/standard/connecting-vpc
- Google Cloud: VPC - Send serverless traffic to a VPC network: https://docs.cloud.google.com/vpc/docs/serverless-vpc-access
- Google Cloud SDK reference: `gcloud compute networks vpc-access connectors create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/create
- Google Cloud: App Engine standard - Connecting to a Shared VPC network: https://docs.cloud.google.com/appengine/docs/standard/connecting-shared-vpc
- Google Cloud: App Engine standard - Configure connectors in Shared VPC service projects: https://docs.cloud.google.com/appengine/docs/standard/shared-vpc-service-projects
- Google Cloud: App Engine standard - Configure connectors in the Shared VPC host project: https://docs.cloud.google.com/appengine/docs/standard/shared-vpc-host-project
- Google Cloud: App Engine standard - Outbound IP addresses for App Engine services: https://docs.cloud.google.com/appengine/docs/standard/outbound-ip-addresses
- Google Cloud: Cloud NAT overview: https://docs.cloud.google.com/nat/docs/overview
- Google Cloud Monitoring metrics list for Serverless VPC Access: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z

## Issues Found
- Corrected the `private-ranges-only` description. Google documents that it routes RFC 1918 ranges, RFC 6598 ranges, and internal DNS names through the connector, not only the three RFC 1918 blocks.
- Corrected connector throughput estimates. Google currently documents estimated connector-level ranges of `200-1000 Mbps` for `e2-micro` and `3200-16000 Mbps` for `e2-standard-4`, rather than the post's per-instance values.
- Renamed the high-throughput connector example from `high-throughput-connector` to `hi-connector` because connector names must be under 21 characters and hyphens count as two characters.
- Corrected the Shared VPC command to use `--subnet=connector-subnet` with `--subnet-project=host-project-id`, matching the documented `gcloud` flow for a service-project connector that uses a host-project subnet.
- Clarified Shared VPC IAM requirements. Google documents that the service project's Serverless VPC Access service account and Cloud Services service account need `compute.networkUser`, not just a generic App Engine service account.
- Clarified firewall behavior. Google automatically creates required connector firewall rules for standalone VPC networks and Shared VPC host projects, while Shared VPC service-project connectors and higher-priority deny rules can require explicit firewall rules.
- Clarified the connector region troubleshooting note for App Engine services in `us-central` and `europe-west`, which use `us-central1` and `europe-west1` for Serverless VPC Access connectors.

## Review Notes
The Python health-check sample is syntactically valid but assumes dependencies such as `Flask`, `redis`, and `requests` are present in the application dependencies. The Cloud NAT example is technically plausible, but for stronger least-privilege NAT configuration Google recommends creating and NATing a dedicated connector subnet instead of using `--nat-all-subnet-ip-ranges`.
