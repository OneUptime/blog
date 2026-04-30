# Validation Summary: How to Create GCP Snapshots and Snapshot Schedules with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform (GCP)
- Google Compute Engine Persistent Disk snapshots
- Google Compute Engine snapshot schedules and resource policies
- OpenTofu
- HashiCorp Google provider
- HCL

## Sources Consulted
- Google provider: `google_compute_snapshot` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_snapshot
- Google provider: `google_compute_resource_policy` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_resource_policy
- Google provider: `google_compute_disk_resource_policy_attachment` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk_resource_policy_attachment
- Google provider: `google_compute_disk` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk
- Google Cloud: About snapshot schedules for disks - https://cloud.google.com/compute/docs/disks/about-snapshot-schedules
- Google Cloud: Set default storage locations for globally scoped snapshots - https://cloud.google.com/compute/docs/disks/snapshot-settings
- Google Cloud: Create Linux application consistent disk snapshots - https://cloud.google.com/compute/docs/disks/creating-linux-application-consistent-pd-snapshots
- Google Cloud: Restore a disk from a snapshot - https://cloud.google.com/compute/docs/disks/restore-snapshot

## Issues Found
- The daily snapshot example used `daily_schedule.start_time = "02:00"`, but the provider documentation for `daily_schedule` restricts valid values to `00:00`, `04:00`, `08:00`, `12:00`, `16:00`, or `20:00`. I changed the example and comment to `04:00` so the snippet matches the documented schema.
- The manual snapshot comment said the default storage location is "multi-region". Google Cloud actually uses the project's snapshot settings or its predefined storage location policy, so I changed the comment to say that the example overrides the project's default snapshot storage location.
- The `guest_flush` comment and summary implied that setting `guest_flush = true` by itself ensures application-consistent snapshots. Official Google Cloud documentation requires guest environment configuration and pre/post snapshot scripts for application consistency, so I updated the wording to reflect that prerequisite.
- The hourly snapshot retention comment said "Keep only 72 hourly snapshots". Snapshot retention is time-based, and automatic deletion depends on retention-policy behavior and the presence of newer snapshots, so I changed the comment to "Retain hourly snapshots for up to 3 days."
- The restore example hard-coded `size = 200`, which is only valid if the source snapshot is no larger than 200 GB. Because restored disks must be at least as large as the source snapshot, I changed the example to use `google_compute_disk.app_disk.size`.

## Review Notes
- The snippets are partial examples and assume existing `google_compute_disk.app_disk` and `google_compute_disk.ssd_disk` resources.
- The attachment resource shown is correct for zonal disks. Regional disks require `google_compute_region_disk_resource_policy_attachment`.
