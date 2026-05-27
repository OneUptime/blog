# Validation Summary: How to Restrict IAP TCP Tunneling to Specific VM Instances and Ports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy (IAP) TCP forwarding
- Google Cloud IAM roles and IAM Conditions
- Google Cloud CLI (`gcloud`)
- Compute Engine VM IAM bindings
- Cloud Audit Logs and Cloud Logging
- Terraform Google provider

## Sources Consulted
- Google Cloud: Using IAP for TCP forwarding - https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud: TCP forwarding overview - https://cloud.google.com/iap/docs/tcp-forwarding-overview
- Google Cloud: IAM Conditions overview - https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud: IAM Conditions attribute reference - https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud: IAM Conditions resource attribute values - https://cloud.google.com/iam/docs/conditions-resource-attributes
- Google Cloud SDK: `gcloud projects add-iam-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK: `gcloud compute instances remove-iam-policy-binding` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/remove-iam-policy-binding
- Google Cloud SDK: `gcloud compute instances get-iam-policy` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/get-iam-policy
- Google Cloud: Identity-Aware Proxy audit logging - https://docs.cloud.google.com/iap/docs/audit-log-howto
- Terraform Registry: `google_compute_instance_iam_member` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_iam

## Issues Found
- Clarified that `roles/iap.tunnelResourceAccessor` grants IAP tunnel access, but does not by itself grant successful SSH login or bypass firewall/protocol-level authorization. Google documents additional Compute Engine, OS Login, SSH metadata, and service account permissions depending on the connection path.
- Removed an unsupported broad statement that IAM conditions scope access to zones in this tutorial. The examples and reviewed Google IAM condition attributes focus on instance-level bindings and `destination.port` restrictions.
- Clarified the SSH-only examples to say they allow IAP reachability to port 22, while normal SSH authorization still applies.
- Updated the audit logging text to note that IAP tunnel access requests are available through Cloud Audit Logs when IAP Data Access audit logs are enabled.
- Updated the Cloud Logging filter to include `protoPayload.serviceName="iap.googleapis.com"` instead of filtering on `protoPayload.resourceName:"tunnelInstances"`, which is less aligned with current official IAP audit logging guidance.

## Review Notes
The command syntax for IAM conditions, the `destination.port` CEL expressions, comparison operators for port ranges, and the Terraform `condition` block syntax are consistent with current Google Cloud and Terraform provider documentation. In a future revision, the post could add prerequisite firewall rules for IAP TCP forwarding from `35.235.240.0/20` and explicitly mention the separate Compute Engine permissions needed for `gcloud compute ssh`.
