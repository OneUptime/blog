# Validation Summary: How to Configure Shielded VM Options to Protect Against Rootkits

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Google Cloud Compute Engine
- Shielded VM
- Secure Boot
- Virtual Trusted Platform Module (vTPM)
- Integrity Monitoring
- Google Cloud CLI (`gcloud`)
- Cloud Logging and Cloud Monitoring
- Google Cloud Organization Policy
- Terraform Google provider

## Sources Consulted
- Google Cloud Shielded VM overview: https://docs.cloud.google.com/compute/shielded-vm/docs/shielded-vm
- Google Cloud modifying Shielded VM options: https://docs.cloud.google.com/compute/shielded-vm/docs/modifying-shielded-vm
- Google Cloud monitoring integrity on Shielded VMs: https://docs.cloud.google.com/compute/shielded-vm/docs/integrity-monitoring
- Google Cloud SDK `gcloud compute instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK `gcloud compute instances update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/update
- Google Cloud SDK `gcloud compute instance-templates create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud SDK `gcloud resource-manager org-policies enable-enforce`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/enable-enforce
- Google Cloud Organization Policy constraints reference: https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Terraform Google provider `google_compute_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post said the integrity baseline is stored in Cloud Logging. Google Cloud documentation describes the integrity policy baseline as securely stored and Cloud Logging as the place where Shielded VM integrity events are written. Updated the wording accordingly.
- The post used `gcloud compute instances describe --format="yaml(shieldedInstanceIntegrityPolicy)"` to check pass/fail integrity status. That field is the integrity policy setting used for baseline learning, not the boot validation event status. Replaced it with a Cloud Logging query for `earlyBootReportEvent` and `lateBootReportEvent` `policyEvaluationPassed` values.
- The baseline update section did not mention that the VM must be running when updating the integrity policy baseline. Added that requirement based on Google Cloud's integrity monitoring documentation.

## Review Notes
The remaining `gcloud` Shielded VM flags, organization policy command, Terraform `shielded_instance_config` fields, and descriptions of Secure Boot, vTPM, Measured Boot, and Integrity Monitoring matched current official documentation. Alerting examples remain intentionally high-level because Cloud Monitoring alert policy creation depends on notification channels and project-specific policy configuration.
