# Validation Summary: How to Manage Akamai Resources with OpenTofu - Resources

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Akamai Terraform provider (`akamai/akamai`)
- Akamai Property Manager resources (`akamai_property`, `akamai_edge_hostname`, `akamai_cp_code`, `akamai_property_activation`, `akamai_property_rules_template`)
- Akamai AppSec (`akamai_appsec_configuration`)
- EdgeGrid authentication via `.edgerc` and environment variables

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu settings (`terraform` block syntax): https://opentofu.org/docs/language/settings/
- OpenTofu workspaces: https://opentofu.org/docs/cli/workspaces/
- OpenTofu language workspaces guidance: https://opentofu.org/docs/language/state/workspaces/
- Akamai Terraform overview: https://techdocs.akamai.com/terraform/v8.0/docs/overview
- Akamai environment variables: https://techdocs.akamai.com/terraform/docs/environment-variables
- Akamai common identifiers (`akamai_contract`, `akamai_group`, product IDs, domain suffixes): https://techdocs.akamai.com/terraform/v7.0/docs/common-identifiers
- Akamai `akamai_cp_code` resource: https://techdocs.akamai.com/terraform/docs/cp-code
- Akamai `akamai_edge_hostname` resource: https://techdocs.akamai.com/terraform/docs/pm-rc-edge-hostname
- Akamai `akamai_property` resource: https://techdocs.akamai.com/terraform/docs/pm-rc-property
- Akamai `akamai_property_rules_template` data source: https://techdocs.akamai.com/terraform/docs/pm-ds-rules-template
- Akamai `akamai_property_activation` resource: https://techdocs.akamai.com/terraform/docs/pm-rc-activation
- Akamai `akamai_appsec_configuration` resource: https://techdocs.akamai.com/terraform/docs/as-rc-configuration
- Akamai provider releases: https://github.com/akamai/terraform-provider-akamai/releases

## Issues Found
- The provider version pin `~> 6.0` was outdated. Akamai’s latest official provider release is `v9.2.0`, so the post was updated to `~> 9.0` to align with the current major release line.
- The edge hostname example used `app.example.com.edgekey.net` without a `certificate` argument. Akamai’s `akamai_edge_hostname` documentation requires a certificate enrollment ID for Enhanced TLS (`edgekey.net`) hostnames. I changed the example to `app.example.com.edgesuite.net`, which is valid without adding extra certificate-management setup that the post does not otherwise explain.
- The best-practice advice to “Tag all Akamai resources” was too broad. The Akamai resources shown in the post do not expose generic tagging arguments in their documented schemas, so I replaced that line with consistent naming guidance.
- The workspace guidance was overly general. OpenTofu documents workspaces as separate state instances and cautions against using them as a default mechanism for separated deployments. I corrected the line to recommend separate workspaces or state only when staging and production are intentionally distinct Akamai configurations.

## Review Notes
- The post still uses `rule_format = "latest"`, which Akamai documents as a supported value. Akamai also notes that dated rule formats are the more stable option for long-lived configurations, so pinning a dated rule format may be preferable in a future revision.
- The `AKAMAI_CLIENT_TOKEN`, `AKAMAI_CLIENT_SECRET`, `AKAMAI_ACCESS_TOKEN`, and `AKAMAI_HOST` environment variables are correct for the default `.edgerc` section.
- The `akamai_property_activation` examples are valid, and staging-before-production sequencing is consistent with Akamai’s activation workflow.
