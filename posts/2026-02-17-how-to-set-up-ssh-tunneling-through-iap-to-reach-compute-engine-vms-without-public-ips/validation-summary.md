# Validation Summary: Set Up SSH Tunneling Through IAP to Reach Compute Engine VMs Without Public IPs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy TCP forwarding
- Google Compute Engine
- Google Cloud CLI
- Google Cloud IAM roles and IAM Conditions
- VPC firewall rules
- SSH, SCP, RDP, and TCP port forwarding
- Terraform Google provider
- Cloud Audit Logs

## Sources Consulted
- Google Cloud IAP TCP forwarding overview: https://cloud.google.com/iap/docs/tcp-forwarding-overview
- Google Cloud guide for using IAP TCP forwarding: https://cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud guide for connecting to Linux VMs using IAP: https://cloud.google.com/compute/docs/connect/ssh-using-iap
- Google Cloud SDK reference for `gcloud compute start-iap-tunnel`: https://cloud.google.com/sdk/gcloud/reference/compute/start-iap-tunnel
- Google Cloud SDK reference for `gcloud compute ssh`: https://cloud.google.com/sdk/gcloud/reference/compute/ssh
- Google Cloud SDK reference for `gcloud compute scp`: https://cloud.google.com/sdk/gcloud/reference/compute/scp
- Google Cloud IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud Compute Engine OS Login setup guide: https://cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Google Cloud Compute Engine service account SSH guide: https://cloud.google.com/compute/docs/connect/set-up-service-account-ssh
- Google Cloud IAP audit logging guide: https://cloud.google.com/iap/docs/audit-log-howto
- Google Cloud SSH audit best practices: https://cloud.google.com/compute/docs/connect/ssh-best-practices/auditing
- Terraform Google provider `google_compute_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post said users only need `roles/iap.tunnelResourceAccessor` for IAP SSH. Google documents additional Compute Engine permissions for `gcloud compute ssh`, commonly granted with `roles/compute.instanceAdmin.v1`, or OS Login roles when OS Login is used. Added the missing IAM binding and reflected it in Terraform.
- The IAM Conditions example claimed access could be scoped to instances with a tag. Google documents that tag-based grants are not supported for IAP TCP forwarding. Replaced the example with the documented `destination.port == 22` condition.
- The SSH `ProxyCommand` example used `Host *.iap` with `%h`, which would pass `private-vm.iap` to `gcloud compute start-iap-tunnel` instead of the Compute Engine instance name. Changed it to a concrete host alias with `HostName private-vm`.
- The CI/CD permissions note was too broad and did not distinguish metadata-based SSH keys, OS Login, and service account impersonation. Reworded it to match the documented permission model.
- The audit logging section implied every tunnel connection is always logged. IAP TCP forwarding access attempts require Cloud Identity-Aware Proxy API Data Access audit logs to be enabled. Updated the text and added `protoPayload.serviceName="iap.googleapis.com"` to the log filter.
- The conclusion said the setup requires a single IAM binding. Updated it to say IAM bindings, matching the corrected role requirements.

## Review Notes
- The main IAP firewall range `35.235.240.0/20`, `--tunnel-through-iap`, `gcloud compute start-iap-tunnel`, RDP forwarding, and no-`access_config` Terraform pattern are consistent with current official documentation.
- Google also documents an IPv6 IAP TCP forwarding range, `2600:2d00:1:7::/64`, for IPv6 VMs. The post focuses on IPv4, so no change was required.
