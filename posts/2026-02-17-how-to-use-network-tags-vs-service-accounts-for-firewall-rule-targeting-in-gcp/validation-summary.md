# Validation Summary: How to Use Network Tags vs Service Accounts for Firewall Rule Targeting in GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud VPC firewall rules
- Compute Engine VM network tags
- Compute Engine VM service accounts
- Shared VPC
- gcloud CLI
- IAM and Cloud Audit Logs

## Sources Consulted
- Google Cloud VPC firewall rules documentation: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud "Use VPC firewall rules" documentation: https://cloud.google.com/firewall/docs/using-firewalls
- Google Cloud "Add and remove network tags" documentation: https://cloud.google.com/vpc/docs/add-remove-network-tags
- Google Cloud "Change the attached service account" documentation: https://cloud.google.com/compute/docs/instances/change-service-account
- Google Cloud Compute Engine audit logging documentation: https://cloud.google.com/compute/docs/logging/audit-logging
- gcloud compute firewall-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- gcloud compute instances create reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- gcloud compute instances set-service-account reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/set-service-account
- gcloud iam service-accounts create reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create

## Issues Found
- The post incorrectly said network tag changes could not be audited. Compute Engine Admin Activity audit logs include `v1.compute.instances.setTags`, so I changed the limitation to state that network tags are not controlled per tag value by IAM, while tag changes can still appear in audit logs.
- The post incorrectly described VM service accounts as immutable after creation and said changing them required recreating the VM. Google Cloud documents changing a VM's attached service account after stopping the VM, so I changed the advantage to say a service account change requires stopping, updating, and restarting the VM.

## Review Notes
The command examples use current documented gcloud flags for VM creation, service account creation, firewall rule creation, and service account updates. Service accounts and network tags cannot be mixed in the same firewall rule, and the examples keep tag-based and service-account-based rules separate. The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference pages.
