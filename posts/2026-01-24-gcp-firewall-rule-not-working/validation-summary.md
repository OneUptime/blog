# Validation Summary: How to Fix 'Firewall Rule' Not Working in GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud VPC firewall rules
- Google Cloud hierarchical firewall policies
- Google Cloud CLI (`gcloud`)
- Cloud Logging for VPC firewall rules
- Bash troubleshooting script

## Sources Consulted
- Google Cloud VPC firewall rules overview: https://docs.cloud.google.com/firewall/docs/firewalls
- Google Cloud evaluation order for firewall policies and rules: https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-eval-order
- Google Cloud create hierarchical firewall policies and rules: https://docs.cloud.google.com/firewall/docs/using-firewall-policies
- Google Cloud VPC firewall rules logging overview: https://docs.cloud.google.com/firewall/docs/vpc-firewall-rules-logging-overview
- Google Cloud VPC firewall rules logging format: https://docs.cloud.google.com/firewall/docs/vpc-log-format
- `gcloud compute firewall-rules create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- `gcloud compute firewall-rules update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/update
- `gcloud compute firewall-policies rules create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-policies/rules/create
- `gcloud compute firewall-policies list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-policies/list
- `gcloud compute instances add-tags` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/add-tags
- `gcloud logging read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read

## Issues Found
- The post described VPC firewall evaluation as "the first matching rule wins." Google Cloud evaluates matching rules by priority; for VPC firewall rules at the same priority, deny rules take precedence over allow rules. Updated the explanation and summary to say the highest-priority matching rule applies and clarified the equal-priority deny behavior.
- The Mermaid evaluation diagram labeled the implied deny as priority 65534. Google Cloud documents implied actions as the final evaluation step, not as a VPC firewall rule priority. Updated the diagram label to "Implied Action."
- The hierarchical firewall policy example used `--target-resources` with a VM instance URL. For hierarchical firewall policies, `--target-resources` expects target VPC network resource URLs, and VM targeting is narrowed with service accounts or secure tags. Updated the example to use a VPC network URL plus `--target-service-accounts`.

## Review Notes
The remaining `gcloud` commands and logging fields matched current Google Cloud CLI and Cloud NGFW documentation. The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference instead of local `--help` output.
