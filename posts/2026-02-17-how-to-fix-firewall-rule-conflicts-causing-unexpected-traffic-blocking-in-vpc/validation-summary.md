# Validation Summary: How to Fix Firewall Rule Conflicts Causing Unexpected Traffic Blocking in VPC

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud VPC firewall rules
- Cloud NGFW / firewall rule evaluation
- Firewall Rules Logging and Cloud Logging
- Network Intelligence Center Connectivity Tests
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- Google Cloud VPC firewall rules documentation: https://docs.cloud.google.com/firewall/docs/firewalls
- Google Cloud Firewall Rules Logging documentation: https://docs.cloud.google.com/firewall/docs/firewall-rules-logging
- Google Cloud manage firewall logging documentation: https://docs.cloud.google.com/firewall/docs/using-firewall-rules-logging
- `gcloud compute firewall-rules list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- `gcloud compute firewall-rules create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- `gcloud compute firewall-rules update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/update
- `gcloud network-management connectivity-tests create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create

## Issues Found
- The evaluation summary said "the first matching rule wins." Google Cloud evaluates the highest-priority applicable matching rule, and deny rules override allow rules only when both matching rules have the same priority. Updated the wording to reflect the documented same-priority behavior.
- The implied ingress fallback was described as an invisible "rule" at the lowest priority. Google Cloud documentation now describes this as an implied action reached when no VPC firewall rule applies. Updated the wording to "implied action" and "lowest precedence" to avoid confusing it with a visible VPC firewall rule.

## Review Notes
The `gcloud` examples use current documented commands and flags. The local workspace does not have the `gcloud` CLI installed, so command verification was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
