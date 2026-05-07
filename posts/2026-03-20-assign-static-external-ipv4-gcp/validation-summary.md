# Validation Summary: How to Assign Static External IPv4 Addresses to GCP Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Google Compute Engine
- `gcloud` CLI
- Static external IPv4 addressing
- Google Cloud load balancing

## Sources Consulted
- Google Cloud Compute Engine: Configure static external IP addresses - https://docs.cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address
- Google Cloud VPC: Reserve a static external IP address - https://docs.cloud.google.com/vpc/docs/reserve-static-external-ip-address
- Google Cloud SDK reference: `gcloud compute instances create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference: `gcloud compute instances add-access-config` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config
- Google Cloud SDK reference: `gcloud compute instances delete-access-config` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/delete-access-config
- Google Cloud SDK reference: `gcloud compute addresses list` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/addresses/list
- Google Cloud pricing: External IP address pricing - https://cloud.google.com/vpc/pricing

## Issues Found
- The existing-instance workflow passed the reserved address resource name to `gcloud compute instances add-access-config --address`. Current Google Cloud documentation for that command requires the actual external IP value. I changed the snippet to resolve the reserved IP first and then pass `$STATIC_IP`.
- The existing-instance workflow hard-coded the access config name as `External NAT`. Current documentation notes that the access config name can differ and that `external-nat` is the present default. I changed the snippet to query the instance for the current access config name and reuse that value.
- The release note said an IP in use by an instance cannot be released. Current Google Cloud documentation says that with the `gcloud` CLI or API you can delete the address resource even if it is in use; if attached, it remains attached until the resource is deleted. I corrected the note.
- The billing note overstated the condition for charges. Current pricing documentation distinguishes between in-use external IPs and reserved-but-unassigned external IPs, with unassigned reserved addresses charged at a higher rate. I corrected the wording.

## Review Notes
- The stable `gcloud compute instances create` reference indicates that `--address` can accept an IP address, address resource name, or address resource URI. The post now uses the resolved IP value in the create example for consistency with the Compute Engine how-to documentation and the existing-instance workflow.
- Pricing values are usage-based and can change over time; this review validated the billing behavior described, not a fixed dollar amount.
