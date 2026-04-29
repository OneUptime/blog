# Validation Summary: How to Manage Akamai Resources with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Akamai Terraform provider
- Akamai Property Manager
- Akamai edge hostnames
- Akamai Application Security (AppSec / WAF)

## Sources Consulted
- Akamai Terraform provider overview for v6.0: https://techdocs.akamai.com/terraform/v6.0/docs/overview
- Akamai Terraform environment variables: https://techdocs.akamai.com/terraform/v5.0/docs/environment-variables
- Akamai common identifiers and product IDs: https://techdocs.akamai.com/terraform/docs/common-identifiers
- Akamai Property Manager ID prefixes and product codes: https://techdocs.akamai.com/property-mgr/reference/id-prefixes
- Akamai `akamai_edge_hostname` resource: https://techdocs.akamai.com/terraform/docs/pm-rc-edge-hostname
- Akamai `akamai_property` resource: https://techdocs.akamai.com/terraform/v7.0/docs/pm-rc-property
- Akamai `akamai_property_rules_builder` data source: https://techdocs.akamai.com/terraform/v8.0/docs/pm-ds-rules-builder
- Akamai Property Manager `origin` behavior reference: https://techdocs.akamai.com/terraform/docs/origin
- Akamai Property Manager `cp_code` behavior reference: https://techdocs.akamai.com/terraform/v9.1/docs/cp-code
- Akamai Property Manager `caching` behavior reference: https://techdocs.akamai.com/terraform/docs/ga-caching
- Akamai `akamai_appsec_configuration` resource: https://techdocs.akamai.com/terraform/v6.5/docs/as-rc-configuration
- Akamai `akamai_appsec_security_policy` resource: https://techdocs.akamai.com/terraform/v6.1/docs/as-rc-security-policy
- Akamai `akamai_appsec_waf_mode` resource: https://techdocs.akamai.com/terraform/docs/as-rc-waf-mode
- Akamai `akamai_property_activation` resource: https://techdocs.akamai.com/terraform/docs/pm-rc-activation
- Akamai property activation workflow: https://techdocs.akamai.com/property-mgr/docs/how-activation-works
- Akamai AppSec activations: https://techdocs.akamai.com/terraform/docs/as-rc-activations

## Issues Found
- The edge hostname example labeled `prd_Fresca` as "Ion Premier", but Akamai documents `prd_Fresca` as Ion Standard and `prd_SPM` as Ion Premier. I corrected the comment to match the documented product code.
- The edge hostname example used `ip_behavior = "IPV6_COMPLIANCE"`. The official `akamai_edge_hostname` Terraform resource documentation lists `IPV4` and `IPV6_PERFORMANCE` as the supported values, so I corrected the example to `IPV6_PERFORMANCE`.
- The rules builder example contained invalid or inaccurate HCL for documented Akamai behaviors: `comment` should be `comments`, `cpcode` should be `cp_code`, `minhttpversion` is not a documented `origin` option, and the `products` field under the CP code value is not part of the input shape needed for the example. I corrected these items to match the documented rules-builder schema.
- The rules builder referenced `data.akamai_property_rules_builder.static_content` and `data.akamai_property_rules_builder.api_passthrough`, but those data sources were not defined anywhere in the post. I removed those undefined child references so the example is self-contained and syntactically valid.
- The WAF section said `akamai_appsec_waf_mode` "Enable Kona Site Defender". That resource controls Kona Rule Set update mode; it does not enable the product itself. I corrected the comment to describe the resource accurately.
- The conclusion implied Akamai's staging-then-production recommendation generically. I clarified that the recommendation being referenced is the property activation workflow shown in the post.

## Review Notes
- The post pins the Akamai provider to `~> 6.0`. Current Akamai Terraform documentation is published for newer major versions, so readers targeting newer releases should re-check current docs and breaking changes before applying these examples unchanged.
- The AppSec section creates configuration objects and WAF mode settings, but the post does not include a separate `akamai_appsec_activations` example or match-target configuration. That omission is acceptable for a resource-management overview, but readers should know AppSec changes are not deployed to staging or production until the security configuration is activated, and Akamai documents that activation requires at least one match target.
