# Validation Summary: How to Set Up VPC Firewall Rules to Allow SSH Access Only from Specific IP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC firewall rules
- Google Cloud CLI (`gcloud`)
- Compute Engine VM network tags
- Identity-Aware Proxy (IAP) TCP forwarding
- IAM roles and IAM Conditions
- Cloud Logging firewall logs
- OS Login

## Sources Consulted
- Google Cloud: VPC firewall rules - https://cloud.google.com/firewall/docs/firewalls
- Google Cloud: Use VPC firewall rules - https://cloud.google.com/firewall/docs/using-firewalls
- Google Cloud SDK: `gcloud compute firewall-rules create` - https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud SDK: `gcloud compute firewall-rules list` - https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- Google Cloud SDK: `gcloud compute firewall-rules update` - https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/update
- Google Cloud SDK: `gcloud topic filters` - https://cloud.google.com/sdk/gcloud/reference/topic/filters
- Google Cloud Compute Engine API: Firewall resource - https://cloud.google.com/compute/docs/reference/rest/v1/firewalls
- Google Cloud: Using IAP for TCP forwarding - https://cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud IAM: IAM Conditions attribute reference - https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud Compute Engine: Set up OS Login - https://cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Google Cloud: Firewall Rules Logging - https://cloud.google.com/firewall/docs/firewall-rules-logging

## Issues Found
- The first SSH audit command filtered `allowed[]` without flattening the nested allow-rule list. Updated it to use `--flatten="allowed[]"` and flattened fields such as `allowed.IPProtocol` and `allowed.ports`, following the documented `gcloud` nested-list filtering behavior.
- The IAP section said IAM conditions could restrict access to VMs with a specific tag, but the example actually used a VM name prefix. Google IAP TCP forwarding documentation currently notes that tags are not supported for IAP TCP forwarding access control. Updated the text and comment to describe a VM name prefix condition, and added a `resource.type == "compute.googleapis.com/Instance"` guard recommended by IAM Conditions guidance when using `resource.name`.
- The "any port from any source" audit command used `allowed[].ports:*`, which finds rules where the ports field is present. In the Compute Engine Firewall resource, an omitted `ports` field means the rule applies to any port for TCP or UDP. Updated the command to flatten `allowed[]` and filter for TCP or UDP allow entries where `allowed.ports` is not set.

## Review Notes
The remaining commands and explanations align with current Google Cloud documentation. For production use, IAP users may also need Compute Engine and OS Login or SSH key management permissions in addition to `roles/iap.tunnelResourceAccessor`, depending on how they connect.
