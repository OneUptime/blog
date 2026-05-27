# Validation Summary: How to Troubleshoot VLAN Attachment Stuck in PENDING_PARTNER State in GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Platform
- Cloud Interconnect
- Partner Interconnect
- VLAN attachments / InterconnectAttachment resources
- Google Cloud CLI
- Cloud Router
- Organization Policy
- Google Cloud quotas

## Sources Consulted
- Google Cloud Partner Interconnect: Create VLAN attachments: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/creating-vlan-attachments
- Google Cloud Partner Interconnect: Request connections: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/requesting-connections
- Google Cloud Partner Interconnect: Activate connections: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/activating-connections
- Google Cloud Compute Engine REST reference: InterconnectAttachment resource: https://cloud.google.com/compute/docs/reference/rest/v1/interconnectAttachments
- Google Cloud SDK reference: gcloud compute interconnects attachments describe: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/describe
- Google Cloud SDK reference: gcloud compute interconnects attachments partner create: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/create
- Google Cloud SDK reference: gcloud compute interconnects attachments partner update: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/update
- Google Cloud SDK reference: gcloud resource-manager org-policies list: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/list
- Google Cloud Network Connectivity quotas and limits: https://cloud.google.com/network-connectivity/quotas

## Issues Found
- The state diagram omitted `PARTNER_REQUEST_RECEIVED`, an official Partner Interconnect provisioning state. Added it between `PENDING_PARTNER` and the post-provisioning states.
- The post said attachments typically expire after 14 days in `PENDING_PARTNER`. Google Cloud now documents the maximum Partner Interconnect VLAN attachment pairing key lifetime as 28 days, so this was updated.
- The sample pairing key included an invalid `a]` prefix. Updated it to match the documented pairing key format.
- The `DEFUNCT` description and diagram implied it only means the provider never completed setup. Updated it to reflect the official resource definition and the invalid pairing key case separately.
- The quota note implied an already-created attachment could be affected by quota during pairing. Updated it to say quota issues affect creating replacement or redundant attachments.
- The activation command used `--admin-enabled`, while the current `gcloud compute interconnects attachments partner update` reference documents `--enable-admin`. Updated the command.

## Review Notes
The post remains a valid troubleshooting guide. Some steps, such as checking organization policies, are general diagnostic advice rather than a common direct cause of `PENDING_PARTNER`, but they are not technically incorrect.
