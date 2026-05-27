# Validation Summary: How to Set Up VPC Network Peering Between Two Projects in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC Network Peering
- Google Cloud VPC firewall rules
- Google Cloud CLI (`gcloud`)
- Cloud DNS peering zones
- Identity-Aware Proxy TCP forwarding
- Shared VPC

## Sources Consulted
- Google Cloud VPC Network Peering documentation: https://docs.cloud.google.com/vpc/docs/vpc-peering
- Google Cloud VPC Network Peering setup and management guide: https://docs.cloud.google.com/vpc/docs/using-vpc-peering
- Google Cloud VPC quotas and limits: https://docs.cloud.google.com/vpc/docs/quota
- Google Cloud SDK reference for `gcloud compute networks peerings create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/create
- Google Cloud SDK reference for `gcloud compute networks peerings list-routes`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/list-routes
- Google Cloud SDK reference for `gcloud compute routes list`: https://cloud.google.com/sdk/gcloud/reference/compute/routes/list
- Cloud DNS peering zones documentation: https://docs.cloud.google.com/dns/docs/zones/peering-zones
- Identity-Aware Proxy TCP forwarding documentation: https://cloud.google.com/iap/docs/using-tcp-forwarding

## Issues Found
- The prerequisite about auto mode VPCs was too broad. I changed it to state that two auto mode VPCs cannot be peered because their predefined subnet ranges overlap, while a custom mode VPC can peer with an auto mode VPC if it avoids `10.128.0.0/9`.
- The route verification example used `gcloud compute routes list` with `nextHopPeering`. I replaced it with `gcloud compute networks peerings list-routes`, which is the purpose-built command for received and advertised peering routes, and clarified regional behavior for dynamic routes.
- The connectivity test used `--tunnel-through-iap` for a VM without an external IP address but did not allow IAP TCP forwarding traffic. I added the required SSH firewall rule for source range `35.235.240.0/20`.
- The peering quota section referenced the deprecated 15,500 VM instances per peering group limit. I replaced it with current guidance that Google Cloud no longer enforces the deprecated instances-per-peering-group quota and enforces VM instance limits per VPC network.
- The peering count command used table output piped to `wc -l`, which counts the header row. I changed it to `--format="value(name)" | wc -l`.

## Review Notes
The local environment does not have `gcloud` installed, so command verification was performed against official Google Cloud SDK reference pages instead of local `--help` output.
