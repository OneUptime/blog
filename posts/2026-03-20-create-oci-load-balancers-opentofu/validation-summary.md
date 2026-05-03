# Validation Summary: How to Create OCI Load Balancers with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Oracle Cloud Infrastructure (OCI)
- OCI Load Balancer service (flexible shape)
- OCI Terraform provider (oracle/oci) — `oci_load_balancer_load_balancer`, `oci_load_balancer_backend_set`, `oci_load_balancer_backend`, `oci_load_balancer_listener`, `oci_load_balancer_certificate`, `oci_load_balancer_rule_set`
- TLS / SSL termination
- HTTP-to-HTTPS redirect rules

## Sources Consulted
- [oci_load_balancer_load_balancer (Terraform Registry)](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/load_balancer_load_balancer)
- [oci_load_balancer_load_balancer (Oracle docs)](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/load_balancer_load_balancer.html)
- [oci_load_balancer_backend_set (Oracle docs)](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/load_balancer_backend_set.html)
- [oci_load_balancer_backend (Oracle docs)](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/load_balancer_backend.html)
- [oci_load_balancer_listener (Oracle docs)](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/load_balancer_listener.html)
- [oci_load_balancer_rule_set (Oracle docs)](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/load_balancer_rule_set.html)
- [oci_core_instance (Oracle docs)](https://docs.oracle.com/en-us/iaas/tools/terraform-provider-oci/latest/docs/r/core_instance.html)
- [OCI Load Balancer Policies](https://docs.oracle.com/en-us/iaas/Content/Balance/Reference/lbpolicies.htm)
- [OCI Load Balancer Listeners (Console / concepts)](https://docs.oracle.com/en-us/iaas/Content/Balance/Tasks/managinglisteners_topic-Creating_Listeners.htm)

## Issues Found
- `redirect_uri.port` in the rule set REDIRECT example was specified as the string `"443"`. Per the OCI provider schema for `oci_load_balancer_rule_set`, `redirect_uri.port` is an integer (valid range 1–65535). Changed to `port = 443`.

## Review Notes
- The `shape = "flexible"` value with the `shape_details` block (min/max bandwidth) matches the current OCI provider schema; flexible is the only non-deprecated shape after May 2023.
- `policy` values `ROUND_ROBIN`, `LEAST_CONNECTIONS`, and `IP_HASH` are all valid per the OCI Load Balancer Policies reference.
- `health_checker` arguments (`protocol`, `port`, `url_path`, `interval_ms`, `timeout_in_millis`, `retries`, `return_code`) are all valid.
- The `oci_load_balancer_backend` argument name `backendset_name` (one word) is the correct provider argument name — easy to misspell as `backend_set_name`, but `backendset_name` is what the provider expects.
- `oci_core_instance` does export a top-level `private_ip` attribute, so `oci_core_instance.web[count.index].private_ip` is correct.
- For HTTPS termination, the post uses `protocol = "HTTP"` plus an `ssl_configuration` block. This is the conventional and accepted pattern for the OCI Terraform provider's `oci_load_balancer_listener` (the API protocol values are HTTP, HTTP2, TCP — SSL is enabled separately via `ssl_configuration`). Using `"HTTPS"` is also accepted by the service in some contexts, but `"HTTP"` + `ssl_configuration` is the more portable form and is left as written.
- `ip_address_details` is a valid exported (computed) attribute on `oci_load_balancer_load_balancer`, so the `output "lb_ip"` example is correct.
- For production, consider also setting `ssl_configuration.protocols = ["TLSv1.2", "TLSv1.3"]` and a non-default `cipher_suite_name`, but this is a hardening suggestion rather than a correctness issue.
