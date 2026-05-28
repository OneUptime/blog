# Validation Summary: How to Deploy and Configure Cloud Next-Generation Firewall

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Cloud Next Generation Firewall
- Google Cloud CLI
- Network firewall policies and firewall endpoint associations
- Security profiles and security profile groups
- Cloud NGFW threat prevention and Google Threat Intelligence
- TLS inspection
- Certificate Authority Service
- Terraform Google provider resources
- Cloud Logging

## Sources Consulted
- Cloud NGFW overview: https://docs.cloud.google.com/firewall/docs/about-firewalls
- Create firewall endpoints and endpoint associations: https://docs.cloud.google.com/firewall/docs/configure-firewall-endpoints
- TLS inspection overview: https://docs.cloud.google.com/firewall/docs/about-tls-inspection
- Set up TLS inspection: https://docs.cloud.google.com/firewall/docs/setup-tls-inspection
- Firewall policy rule details: https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-details
- Threat logs: https://docs.cloud.google.com/firewall/docs/threat_logs
- gcloud firewall endpoint associations update reference: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/firewall-endpoint-associations/update
- gcloud security profile groups create reference: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/security-profile-groups/create
- gcloud threat prevention profile and override references: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/security-profiles/threat-prevention
- gcloud network firewall policy rules create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/network-firewall-policies/rules/create
- gcloud TLS inspection policies reference: https://docs.cloud.google.com/sdk/gcloud/reference/network-security/tls-inspection-policies
- gcloud Certificate Authority Service references: https://docs.cloud.google.com/sdk/gcloud/reference/privateca/pools/create and https://docs.cloud.google.com/sdk/gcloud/reference/privateca/roots/create
- Terraform Google provider resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/network_security_firewall_endpoint_association, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/network_security_tls_inspection_policy, and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_firewall_policy_rule

## Issues Found
- The required APIs were incomplete. Added Compute Engine and Certificate Authority Service APIs, and clarified that Certificate Manager is optional unless trust configs are used.
- The security profile group was created before the referenced threat prevention profile and omitted `--location`. Reordered the commands and added the required location flag.
- Threat prevention override commands used a non-existent `update` command and unsupported `--severity-overrides` flags. Replaced them with supported `add-override` commands using `--severities` and `--action`.
- TLS inspection policy examples used a non-existent `gcloud network-security tls-inspection-policies create` command and used a global location. Replaced this with the documented YAML import flow in the same region as the CA pool.
- TLS inspection setup omitted the Cloud NGFW service identity permissions required to request certificates from the CA pool. Added service identity creation and CA pool IAM binding.
- The endpoint association attempted to reference a TLS inspection policy before creating it. Removed the early reference and added a later update command after policy import.
- The firewall policy rule intended to inspect TLS traffic did not enable TLS inspection. Added `--tls-inspect` and the Terraform `tls_inspect` field.
- The Google Threat Intelligence CLI flag used the wrong plural form. Changed `--src-threat-intelligences` to `--src-threat-intelligence`.
- The Terraform example omitted the TLS inspection policy and did not attach it to the endpoint association. Added the TLS policy resource and association field.
- The Terraform `security_profile_group` value needed the fully qualified Network Security API URL form. Updated the reference accordingly.
- The Cloud Logging query used incorrect threat log field names. Updated it to filter the Cloud NGFW threat log and display documented JSON payload fields.

## Review Notes
The examples still use placeholder project, organization, and network values. Users must replace those placeholders and ensure the CA certificate is trusted by clients before TLS inspection can work without certificate errors.
