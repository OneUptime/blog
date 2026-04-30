# Validation Summary: How to Set Up GCP Persistent Disks with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Google Compute Engine Persistent Disk
- Regional Persistent Disk
- OpenTofu
- HashiCorp Google provider
- HCL

## Sources Consulted
- Google Cloud: Persistent Disk overview: https://cloud.google.com/compute/docs/disks/persistent-disks
- Google Cloud: Create and manage regional disks: https://cloud.google.com/compute/docs/disks/regional-persistent-disk
- Google Cloud: About synchronous disk replication: https://cloud.google.com/compute/docs/disks/about-regional-persistent-disk
- Google Cloud: OS images: https://cloud.google.com/compute/docs/images
- Google provider docs: `google_compute_disk`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk
- Google provider docs: `google_compute_region_disk`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_region_disk
- Google provider docs: `google_compute_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The `network_interface` block in the VM example referenced `google_compute_subnetwork.subnet.self_link`, but no subnet resource was defined anywhere in the post. I changed it to `network = "default"` so the example uses a valid documented field and is self-contained.
- The snapshot restore example referenced `google_compute_snapshot.daily_snapshot.self_link`, but that snapshot resource was not defined in the post. I changed it to `snapshot = "global/snapshots/daily-snapshot"`, which matches the documented snapshot identifier formats for `google_compute_disk`.

## Review Notes
- The disk type descriptions and resource names are current for Persistent Disk: `pd-standard`, `pd-balanced`, `pd-ssd`, and `pd-extreme`.
- Regional Persistent Disk does replicate across two zones in the same region, but it only provides disk-level high availability. VM failover still requires instance-level design.
- `pd-extreme` remains available only for a limited set of supported machine types, so readers should verify machine type compatibility before attaching one in production.
