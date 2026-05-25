# Validation Summary: How to Configure Akamai Provider in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Akamai Terraform Provider
- Akamai EdgeGrid authentication
- Akamai Edge DNS
- Akamai Property Manager
- Akamai Application Security
- Akamai EdgeWorkers

## Sources Consulted
- Akamai Terraform provider overview: https://techdocs.akamai.com/terraform/v10.0/docs/overview
- Akamai alternative authentication documentation: https://techdocs.akamai.com/terraform/docs/gs-authentication
- Akamai EdgeGrid credential setup: https://techdocs.akamai.com/developer/docs/set-up-authentication-credentials
- Akamai Terraform environment variables: https://techdocs.akamai.com/terraform/v7.0/docs/environment-variables
- Akamai Edge DNS zone resource: https://techdocs.akamai.com/terraform/v5.1/docs/dns-zone
- Akamai Edge DNS record resource: https://techdocs.akamai.com/terraform/v9.3/docs/dns-record
- Akamai Property Manager property resource: https://techdocs.akamai.com/terraform/v10.0/docs/pm-rc-property
- Akamai Property Manager activation resource: https://techdocs.akamai.com/terraform/docs/pm-rc-activation
- Akamai common identifiers and product IDs: https://techdocs.akamai.com/terraform/docs/common-identifiers
- Akamai Application Security configuration resource: https://techdocs.akamai.com/terraform/docs/as-rc-configuration
- Akamai Application Security security policy resource: https://techdocs.akamai.com/terraform/docs/as-rc-security-policy
- Akamai EdgeWorkers resource: https://techdocs.akamai.com/terraform/v9.3/docs/ew-rc-edgeworkers
- Akamai EdgeWorkers resource tier data source: https://techdocs.akamai.com/terraform/docs/ew-ds-resource-tier
- Akamai CLI for Terraform export commands: https://akamai.github.io/cli-terraform/

## Issues Found
- Updated the provider version constraint from `~> 6.0` to `~> 10.0` so the setup reflects the current Akamai Terraform provider major version.
- Changed the Edge DNS zone type from `PRIMARY` to `primary`, matching the documented accepted values for `akamai_dns_zone`.
- Added `rule_format = "v2025-07-07"` to the property example so the rule schema is explicit for current Property Manager examples.
- Changed the property hostname example to use `cert_provisioning_type = "DEFAULT"` with an `edgekey.net` hostname, matching current documented hostname provisioning examples for automatically provisioned certificates.
- Added the required `security_policy_prefix` argument to the `akamai_appsec_security_policy` example.
- Corrected the EdgeWorkers resource type from `akamai_edgeworkers_edge_worker` to `akamai_edgeworker`.
- Updated the best-practices provider pin example from `~> 6.0` to `~> 10.0`.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or schema validation locally. The review was performed against official Akamai Terraform and EdgeGrid documentation.
