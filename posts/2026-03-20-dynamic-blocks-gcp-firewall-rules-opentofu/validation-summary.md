# Validation Summary: How to Use Dynamic Blocks for GCP Firewall Rules in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform Google provider
- Google Cloud VPC firewall rules
- HCL

## Sources Consulted
- OpenTofu dynamic blocks documentation: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- OpenTofu type constraints and optional/null handling: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- Terraform Google provider `google_compute_firewall` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_firewall.html.markdown
- Google Cloud VPC firewall rules documentation: https://docs.cloud.google.com/firewall/docs/firewalls?hl=en

## Issues Found
- The `icmp` examples set `ports = []`, but Google Cloud firewall rules only support ports for protocols such as TCP and UDP. I changed the `icmp` examples to use `ports = null` so the argument is omitted for ICMP rules.
- The comment in the first firewall example said the dynamic block generated one block per protocol/port combination. OpenTofu `dynamic` blocks generate one nested block per `for_each` element, so I corrected the comment to match the actual behavior.
- The service-account example could omit all ingress source filters when `target_service_accounts` was set. The `google_compute_firewall` resource documentation requires one of `source_ranges`, `source_tags`, or `source_service_accounts` for `INGRESS`, so I changed the example to keep a valid `source_ranges` value.
- The service-account section text implied the dynamic block was being used to create service-account targeting. I adjusted the wording so it accurately describes that the dynamic block is generating repeated `allow` blocks while service-account targeting is handled by `target_service_accounts`.

## Review Notes
- The examples use the Terraform Google provider resource `google_compute_firewall`, which is appropriate for OpenTofu because OpenTofu consumes Terraform-compatible providers.
- The `network` argument accepts either a network name or self link, so using `var.network_self_link` is valid.
- The priority explanation is correct: lower numeric values have higher precedence, and deny rules win when priorities are equal.
