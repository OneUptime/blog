# Validation Summary: How to Fix 'Cloud NAT' Configuration Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Cloud NAT
- Google Cloud Router
- Google Cloud CLI
- Google Cloud Monitoring and Logging
- Google Kubernetes Engine
- Terraform Google provider

## Sources Consulted
- Google Cloud NAT overview: https://docs.cloud.google.com/nat/docs/overview
- Google Cloud Public NAT specifications: https://docs.cloud.google.com/nat/docs/public-nat
- Google Cloud NAT IP addresses and ports: https://docs.cloud.google.com/nat/docs/ports-and-addresses
- Google Cloud NAT troubleshooting: https://docs.cloud.google.com/nat/docs/troubleshooting
- Google Cloud NAT logs and metrics: https://docs.cloud.google.com/nat/docs/monitoring
- Google Cloud SDK `gcloud compute routers nats create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud SDK `gcloud compute routers nats update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud SDK `gcloud compute routers nats list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/list
- Google Cloud SDK `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Google provider `google_compute_router_nat`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat

## Issues Found
- The architecture diagrams implied that NAT data-plane traffic passes through Cloud Router. Updated the diagrams and explanation to clarify that Cloud Router provides the control plane and NAT traffic does not pass through Cloud Router.
- The post said each NAT IP handles approximately 64,000 concurrent connections. Updated the wording to say each NAT IP provides approximately 64,000 source ports and that exhaustion is about NAT source IP address and port tuples.
- The dynamic port allocation command did not explicitly disable endpoint-independent mapping. Added `--no-enable-endpoint-independent-mapping` because dynamic port allocation is mutually exclusive with endpoint-independent mapping.
- The endpoint-independent mapping section said it is enabled by default and used incorrect gcloud flags. Updated the default to disabled and corrected the flags to `--enable-endpoint-independent-mapping` and `--no-enable-endpoint-independent-mapping`.
- The monitoring alert example used outdated or incorrect `gcloud monitoring policies create` flags. Replaced them with `--if`, `--duration`, and `--combiner`.
- The metrics table described `nat/port_usage` as a percentage and treated `nat/nat_allocation_failed` like a numeric count. Updated the descriptions and thresholds to match the official metric definitions.

## Review Notes
`gcloud` and `terraform` were not installed in the local workspace, so command and Terraform validation were performed against current official Google Cloud SDK, Cloud NAT, Cloud Monitoring, and Terraform Google provider documentation.
