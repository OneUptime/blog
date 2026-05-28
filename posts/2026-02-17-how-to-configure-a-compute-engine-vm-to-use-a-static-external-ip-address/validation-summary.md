# Validation Summary: How to Configure a Compute Engine VM to Use a Static External IP Address

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Compute Engine
- Static and ephemeral external IP addresses
- Google Cloud CLI (`gcloud`)
- Cloud DNS
- Network Service Tiers

## Sources Consulted
- Google Cloud Compute Engine: Configure static external IP addresses: https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address
- Google Cloud VPC pricing: https://cloud.google.com/vpc/pricing
- Google Cloud Network Service Tiers: Set the network tier: https://cloud.google.com/network-tiers/docs/set-network-tier
- Google Cloud SDK reference: `gcloud compute addresses create`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Google Cloud SDK reference: `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference: `gcloud compute instances add-access-config`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config
- Google Cloud SDK reference: `gcloud compute instances delete-access-config`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/delete-access-config
- Google Cloud SDK reference: `gcloud compute addresses list`: https://cloud.google.com/sdk/gcloud/reference/compute/addresses/list
- Google Cloud SDK reference: `gcloud dns record-sets create`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Google Cloud Compute Engine: Stop or restart a Compute Engine instance: https://cloud.google.com/compute/docs/instances/stop-start-instance

## Issues Found
- The post said idle static IPs were those not attached to a running VM. Google Cloud considers a static external IP to be in use when associated with a VM whether that VM is running or stopped, so I changed this to "not assigned to a resource."
- The post said an IP attached to a running VM has no additional charge. Current Google Cloud pricing charges for external IPv4 addresses in use on standard VMs, at a lower hourly rate than idle static IPs, so I updated the cost explanation.
- The unused static IP monthly estimate was updated from about $7.20 to about $7.30 to reflect the current $0.01/hour idle static IP rate in many regions.
- The "What Happens When You Stop a VM" section incorrectly said a static IP is detached when the VM stops. I corrected it to say the static IP remains associated with the stopped VM.
- The VM creation and `add-access-config` examples now include `--network-tier=PREMIUM` to match the previously reserved Premium Tier address and avoid tier mismatch issues in projects whose default tier is not Premium.
- The Cloud DNS example now uses a trailing dot in `www.example.com.` to match Cloud DNS fully qualified record-set examples.
- The deployment script defined `PROJECT_ID` but did not use it. I added `--project="${PROJECT_ID}"` to the `gcloud` commands in the script.

## Review Notes
- The commands and flags used in the post are current according to the official Google Cloud CLI reference.
- The post assumes IPv4 external addresses. Google Cloud has separate IPv6 behavior and pricing notes, but the examples are all IPv4 and remain accurate for that scope.
