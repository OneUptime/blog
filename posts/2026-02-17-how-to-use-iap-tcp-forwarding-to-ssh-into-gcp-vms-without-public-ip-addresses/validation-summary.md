# Validation Summary: How to Use IAP TCP Forwarding to SSH into GCP VMs Without Public IP Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy TCP forwarding
- Google Compute Engine VMs
- Google Cloud CLI (`gcloud`)
- SSH and SCP
- Google Cloud firewall rules
- Google Cloud IAM
- Terraform Google provider

## Sources Consulted
- Google Cloud IAP: Using IAP for TCP forwarding: https://docs.cloud.google.com/iap/docs/using-tcp-forwarding
- Google Cloud IAP: TCP forwarding overview: https://docs.cloud.google.com/iap/docs/tcp-forwarding-overview
- Google Cloud SDK reference: `gcloud compute ssh`: https://cloud.google.com/sdk/gcloud/reference/compute/ssh
- Google Cloud SDK reference: `gcloud compute scp`: https://cloud.google.com/sdk/gcloud/reference/compute/scp
- Google Cloud SDK reference: `gcloud compute start-iap-tunnel`: https://cloud.google.com/sdk/gcloud/reference/compute/start-iap-tunnel
- Google Cloud SDK reference: `gcloud compute instances delete-access-config`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/delete-access-config
- Google Cloud SDK reference: `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Terraform Google provider: `google_iap_tunnel_instance_iam_member`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iap_tunnel_instance_iam

## Issues Found
- The IAM section only granted `roles/iap.tunnelResourceAccessor`, but Google Cloud documents additional Compute Engine permissions for `gcloud compute ssh` and `gcloud compute scp`. Added a prerequisite and a project-level `roles/compute.instanceAdmin.v1` binding example, while noting that an equivalent custom role can be used.
- The instance-level IAM section implied that moving the IAP role to the VM was enough for granular access. Google Cloud documents that the other roles still need to be granted on the project, so the text now says that explicitly.
- The SSH config example used `Host gcp-*` and then ran `ssh gcp-my-private-vm`, which would pass `gcp-my-private-vm` to `gcloud compute start-iap-tunnel` as the instance name. Changed the example to use `Host my-private-vm` so `%h` resolves to the actual VM instance name.

## Review Notes
- The firewall source range `35.235.240.0/20`, `--tunnel-through-iap`, `start-iap-tunnel`, `--listen-on-stdin`, SCP tunneling, and Terraform IAP tunnel IAM resource were verified against official Google Cloud and HashiCorp documentation.
- Google Cloud notes that IPv6 VMs use the IAP TCP forwarding source range `2600:2d00:1:7::/64`; the post focuses on IPv4 firewall rules, which is correct for the examples shown.
