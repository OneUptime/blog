# Validation Summary: How to Use Dynamic Blocks for GCP Firewall Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- HashiCorp Google provider
- Google Cloud VPC firewall rules
- Google Cloud IAP TCP forwarding
- Google Cloud Load Balancing health checks

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- HashiCorp Google provider `google_compute_firewall` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Google Cloud Compute Engine Firewall REST API reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/firewalls
- Google Cloud VPC firewall rules documentation: https://docs.cloud.google.com/firewall/docs/firewalls
- Google Cloud IAP TCP forwarding documentation: https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud Load Balancing health check concepts: https://docs.cloud.google.com/load-balancing/docs/health-check-concepts

## Issues Found
- The service-based firewall example created one `google_compute_firewall` rule per service and combined all source ranges from all port configurations. Because GCP firewall sources are scoped to the whole firewall rule, this would allow every listed source range to reach every listed port for that service. I changed the example to flatten service port configurations into separate firewall rules so each protocol and port set keeps its intended `source_ranges`.

## Review Notes
- The Terraform dynamic block syntax, optional object attributes, `allow` and `deny` block usage, priority behavior, IAP IPv4 range, and common Google Cloud health check source ranges were verified against official documentation.
- The health check examples allow all TCP ports from health check ranges. This is technically valid because omitted ports apply to all ports, but Google Cloud recommends limiting health check firewall rules to the protocols and ports used by the health checks.
