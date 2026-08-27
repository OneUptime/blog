# Validation Summary: Recover from Compute Engine Zone Resource Shortages

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Google Cloud Compute Engine
- Compute Engine virtual machines and zonal operations
- Google Cloud CLI (`gcloud`)
- Machine types, GPUs, Local SSD, and CPU platforms
- Standard, Flex-start, and Spot provisioning models
- Regional managed instance groups and target distribution shapes
- Compute Engine reservations and quota
- Zonal and regional Persistent Disk, snapshots, and cross-zone recovery

## Sources Consulted

- [Troubleshooting resource availability errors](https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-resource-availability)
- [Compute Engine API error catalog](https://cloud.google.com/compute/docs/reference/rest/v1/errors)
- [Troubleshoot creating, updating, and deleting VMs](https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-vm-creation)
- [Best practices for the Compute Engine API](https://cloud.google.com/compute/docs/api/best-practices)
- [`gcloud compute instances describe`](https://cloud.google.com/sdk/gcloud/reference/compute/instances/describe)
- [`gcloud compute operations describe`](https://cloud.google.com/sdk/gcloud/reference/compute/operations/describe)
- [`gcloud compute machine-types list`](https://cloud.google.com/sdk/gcloud/reference/compute/machine-types/list)
- [`gcloud compute instance-groups managed describe`](https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/describe)
- [Compute Engine instances REST resource](https://cloud.google.com/compute/docs/reference/rest/v1/instances)
- [Regional instance group managers REST resource](https://cloud.google.com/compute/docs/reference/rest/v1/regionInstanceGroupManagers)
- [Compute Engine provisioning models](https://cloud.google.com/compute/docs/instances/provisioning-models)
- [About Flex-start VMs](https://cloud.google.com/compute/docs/instances/about-flex-start-vms)
- [Spot VMs](https://cloud.google.com/compute/docs/instances/spot)
- [Compute Engine reservations overview](https://cloud.google.com/compute/docs/instances/reservations-overview)
- [Troubleshooting reservation creation](https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-reservation-creation)
- [Regional MIG target distribution shapes](https://cloud.google.com/compute/docs/instance-groups/regional-mig-set-target-distribution-shape)
- [Global, regional, and zonal resources](https://cloud.google.com/compute/docs/regions-zones/global-regional-zonal-resources)
- [Create and manage regional disks](https://cloud.google.com/compute/docs/disks/regional-persistent-disk)
- [Persistent Disk snapshots](https://cloud.google.com/compute/docs/disks/create-snapshots)

## Issues Found

- The post said that a detailed resource error could identify a Local SSD interface. The documented `local_ssd_availability` reason identifies the requested amount of Local SSD, so this was changed to Local SSD capacity.
- The `gcloud compute operations describe` example uses `--zone`, but its introductory sentence applied to asynchronous operations of every scope. The sentence was limited to zonal asynchronous operations; regional and global operations instead require `--region` and `--global`, respectively.
- The post presented a regional MIG distribution-shape change as the fifth item in Google's least-to-most-disruptive sequence. Google's ordered sequence contains four remedies and documents the regional MIG recommendation separately, so the introduction and subsection heading were corrected to preserve that distinction.

## Review Notes

All remaining commands, field names, filter expressions, technical claims, and documentation links were verified against current official Google Cloud documentation. The machine-type filter syntax and the selected instance and regional MIG output fields are valid. The linked `cloud.google.com` documentation URLs resolve to their intended current pages.

The reservation discussion accurately describes the normal reservation lifecycle; future reservation requests and calendar-mode reservations have separate approval and fulfillment behavior. Regional MIG distribution-shape changes also have documented prerequisites and limitations—for example, `BALANCED` and `ANY_SINGLE_ZONE` require proactive instance redistribution to be disabled—which should be reviewed before making an operational change.
