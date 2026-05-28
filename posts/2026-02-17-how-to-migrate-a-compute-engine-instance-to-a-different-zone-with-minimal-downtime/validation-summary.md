# Validation Summary: How to Migrate a Compute Engine Instance to a Different Zone

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud CLI (`gcloud`)
- Compute Engine machine images
- Persistent disk snapshots
- Cloud Load Balancing backend services
- Managed and unmanaged instance groups
- Static external IP addresses
- PostgreSQL replication
- Terraform Google provider

## Sources Consulted
- Google Cloud Compute Engine documentation: Move a VM instance between zones or regions - https://docs.cloud.google.com/compute/docs/instances/moving-instance-across-zones
- Google Cloud CLI release notes - https://docs.cloud.google.com/sdk/docs/release-notes
- Google Cloud CLI reference: `gcloud compute instances move` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/move
- Google Cloud Compute Engine documentation: Create machine images - https://docs.cloud.google.com/compute/docs/machine-images/create-machine-images
- Google Cloud Compute Engine documentation: Create instances from machine images - https://docs.cloud.google.com/compute/docs/machine-images/create-instance-from-machine-image
- Google Cloud CLI reference: `gcloud compute disks snapshot` - https://cloud.google.com/sdk/gcloud/reference/compute/disks/snapshot
- Google Cloud CLI reference: `gcloud compute backend-services add-backend`, `update-backend`, and `remove-backend` - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services
- Google Cloud Compute Engine documentation: Set a target distribution shape for VMs in a regional MIG - https://docs.cloud.google.com/compute/docs/instance-groups/regional-mig-set-target-distribution-shape
- Google Cloud CLI reference: `gcloud compute instance-groups unmanaged create` and `add-instances` - https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/unmanaged
- Google Cloud CLI reference: `gcloud compute instances add-access-config` and `delete-access-config` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config
- Terraform language documentation: lifecycle `create_before_destroy` - https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform Google provider documentation: `google_compute_instance` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The post presented `gcloud compute instances move` as the current simplest approach. Google Cloud CLI release notes show the command was deprecated and then removed, and current Compute Engine migration docs recommend recreating the VM by using a machine image or manual disk snapshots. I replaced Method 1 with the current machine-image workflow and updated the introduction, limitations, description, and wrap-up accordingly.
- The original `gcloud compute instances move` limitation list said the destination zone must be in the same region and that static external IPs are preserved. That was specific to the removed move command and did not match current machine-image or snapshot migration guidance. I replaced it with current machine-image and IP preservation caveats.
- The load-balancer migration example created a new VM but never put that VM in a backend instance group or added it to the backend service. I added unmanaged instance group creation, instance membership, and `backend-services add-backend`.
- The load-balancer example removed the old backend before draining connections. I changed the flow to set the old backend capacity scaler to zero, wait, then remove the backend.
- The regional MIG example used `managed update --zones`, but Google Cloud documentation states that a regional MIG's selected zones cannot be changed after creation, and the `managed update` command does not support `--zones`. I moved `--zones` to the create command and changed the update example to only modify `--target-distribution-shape`.
- The `--target-distribution-shape` example used uppercase `ANY`; Google Cloud CLI examples document lowercase values such as `any`. I changed the example to `--target-distribution-shape=any`.

## Review Notes
The manual snapshot commands are valid, but Google currently recommends `gcloud compute snapshots create` over `gcloud compute disks snapshot` for newer snapshot features. The post's `disks snapshot` examples remain technically valid, so I did not replace them.
