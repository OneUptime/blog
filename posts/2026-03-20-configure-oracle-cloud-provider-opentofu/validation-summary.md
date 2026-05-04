# Validation Summary: How to Configure Oracle Cloud Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform fork)
- Oracle Cloud Infrastructure (OCI) provider (`oracle/oci`)
- HashiCorp Configuration Language (HCL)
- OCI API key authentication

## Sources Consulted
- Oracle OCI Terraform provider registry: https://registry.terraform.io/providers/oracle/oci/latest/docs
- OCI provider authentication docs: https://registry.terraform.io/providers/oracle/oci/latest/docs#authentication
- OCI `oci_core_vcn` resource docs: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_vcn
- Oracle Cloud API signing key documentation: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- Sibling validated post for pattern: `posts/2026-03-20-configure-pagerduty-provider-opentofu/README.md`

## Issues Found
The post was a generic placeholder template that contained no Oracle Cloud-specific information despite its title and stated topic. Every code block referenced abstract identifiers (`provider_name`, `provider-namespace/provider-name`, `PROVIDER_API_KEY`, `provider_example_resource`) instead of actual OCI provider details. This rendered the tutorial inaccurate and unusable for its stated purpose.

Fixes applied:
- Replaced the placeholder `required_providers` block with the real OCI provider source `oracle/oci` pinned to `~> 6.0` (current major version of the Oracle OCI provider).
- Replaced the generic environment-variable example with the actual OCI authentication inputs: `tenancy_ocid`, `user_ocid`, `fingerprint`, `private_key_path`, and `region`. OCI uses an RSA API signing key pair, not an API key/secret pair, so the original `PROVIDER_API_KEY`/`PROVIDER_API_SECRET` example was technically incorrect.
- Updated the provider configuration block to reference the real OCI provider arguments.
- Replaced the `provider_example_resource` placeholder with a real, minimal `oci_core_vcn` resource (a VCN is the foundational OCI networking primitive and a common starting point). Switched the generic `tags` map to OCI's `freeform_tags`, which is the correct field name on `oci_core_vcn`.
- Expanded the `variables` block to declare the variables required by the new provider and resource configurations.
- Updated the output to expose the VCN id (`oci_core_vcn.main.id`) instead of the placeholder resource id.

## Review Notes
- The OCI provider also supports Instance Principal, Resource Principal, and Security Token authentication modes via the `auth` argument; this post covers only API key authentication, which matches the simple "environment variables" framing of the original draft.
- The `~> 6.0` version pin tracks the current major. If newer major versions ship in the future, the example should be revisited for breaking changes (especially around resource schemas).
- The "Best Practices" and "Conclusion" sections are generic and were left untouched per the brief; the conclusion's phrase "SaaS tooling" reads slightly oddly for a cloud-infrastructure post but is not technically incorrect.
