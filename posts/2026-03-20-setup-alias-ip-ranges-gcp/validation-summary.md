# Validation Summary: How to Set Up Alias IP Ranges for GCP Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC
- Compute Engine
- Alias IP ranges
- Google Cloud CLI (`gcloud`)
- GKE VPC-native clusters
- Linux IP routing

## Sources Consulted
- Google Cloud VPC alias IP ranges overview: https://docs.cloud.google.com/vpc/docs/alias-ip
- Google Cloud VPC configure alias IP ranges guide: https://docs.cloud.google.com/vpc/docs/configure-alias-ip-ranges
- `gcloud compute instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- `gcloud compute instances network-interfaces update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/update
- `gcloud compute networks subnets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- GKE create a VPC-native cluster guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- GKE VPC-native clusters concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- `gcloud container clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create

## Issues Found
- The VM creation example used `--subnet` with a standalone `--aliases` flag. Current `gcloud compute instances create` syntax defines alias ranges as part of the `--network-interface` properties, so the command was changed to `--network-interface="subnet=app-subnet,aliases=/24"`.
- The existing-instance update section said to add an alias range, but `gcloud compute instances network-interfaces update --aliases` replaces the interface's alias range list. Added a note that existing ranges must be included if they should be retained.
- The OS configuration section showed `ip addr add` as the normal Linux configuration step. Google Cloud's supported Linux images use the guest agent to configure alias IP ranges as local routes automatically, and the documented manual fallback is `ip route add to local ... proto 66`. Replaced the commands with route verification and the documented manual route fallback.
- The conclusion said subnet secondary ranges are referenced with `--aliases` at instance or cluster level. GKE clusters reference user-managed secondary ranges with `--cluster-secondary-range-name` and `--services-secondary-range-name`, so the conclusion was corrected.

## Review Notes
- The GKE command uses `--zone`, which is still accepted for zonal clusters; current `gcloud` help prefers `--location` for cluster location selection.
- The Linux interface name `ens4` can vary by image and network configuration; users should use the interface name that exists on their VM.
