# Validation Summary: How to Migrate from Legacy Networks to Custom Mode VPC in GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud VPC networks
- Google Cloud legacy networks
- Compute Engine VM network interface migration
- VPC firewall rules
- Cloud DNS
- VPC Flow Logs
- Private Google Access
- VPC Network Peering
- gcloud CLI

## Sources Consulted
- Google Cloud VPC legacy networks documentation: https://docs.cloud.google.com/vpc/docs/legacy
- Google Cloud manage legacy networks documentation: https://docs.cloud.google.com/vpc/docs/using-legacy
- Google Cloud Compute Engine VM network migration documentation: https://docs.cloud.google.com/compute/docs/instances/migrating-interfaces-between-networks
- Google Cloud multiple network interfaces documentation: https://docs.cloud.google.com/compute/docs/instances/create-instance-multiple-nics
- Google Cloud gcloud subnets create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Google Cloud gcloud network interface update reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/update
- Google Cloud gcloud access config references: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config and https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/delete-access-config
- Google Cloud DNS record update reference: https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/update

## Issues Found
- The post claimed legacy networks cannot be converted in place. Google Cloud documents a single-region legacy network conversion tool that converts a legacy network to a custom mode VPC. I changed the text to explain that only multi-region legacy networks require consolidation or manual migration.
- The post described a dual-NIC bridge VM using one interface in a legacy network and one in a VPC. Legacy networks do not support multiple network interfaces, so that command would fail. I replaced the bridge pattern with supported temporary options: external IP connectivity for short migrations and application-level cutover through DNS or load balancer updates.
- The VM migration section said VMs must be recreated from disk snapshots. Compute Engine supports migrating a stopped standalone VM's network interface from a legacy network to a VPC. I replaced the snapshot/recreate flow with the official stop, `network-interfaces update`, and start sequence, and added the documented managed instance group limitation.
- The static external IP example used a concrete documentation-reserved IP address and the older display name for the access config. I changed the example to use `RESERVED_EXTERNAL_IP` and the documented default access config name `external-nat`.
- The legacy network characteristics section said each VM specifies its own IP range. I corrected this to say instance IPs are allocated from the legacy network's single global range and are not grouped by region or zone.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was verified against the official Google Cloud SDK reference documentation rather than local `gcloud --help` output.
