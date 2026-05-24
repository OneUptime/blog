# Validation Summary: How to Create GCP Filestore Instances with Terraform

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- Google Cloud Filestore (managed NFS)
- Google Cloud Platform (`google_project_service`, `google_filestore_instance`, `google_filestore_snapshot`, `google_filestore_backup`, `google_compute_instance`)
- Kubernetes (PersistentVolume, PersistentVolumeClaim) for GKE
- NFS (mount, fstab, nfs-common)

## Sources Consulted
- Google Cloud Filestore service tiers documentation — https://cloud.google.com/filestore/docs/service-tiers
- Google Cloud Filestore snapshots documentation — https://cloud.google.com/filestore/docs/snapshots
- Terraform Google provider docs for `google_filestore_instance`, `google_filestore_snapshot`, `google_filestore_backup` — https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Issues Found
- **Snapshots example used an unsupported tier.** The original "Filestore with Snapshots" section provisioned a `BASIC_SSD` instance and then created a `google_filestore_snapshot` against it. Per Google Cloud's official snapshots table, snapshots are *not* supported on the Basic HDD or Basic SSD service tiers — only Zonal, Regional, and Enterprise. The example would fail at apply time. Fixed by switching the production instance to the `ENTERPRISE` tier (regional, with `location = var.region`), adjusting `capacity_gb` to the 1 TiB Enterprise minimum, updating the snapshot's `location` to `var.region` to match, and adding a short sentence at the top of the section calling out the tier requirement.

## Review Notes
- Tier minimums in the post are correct: Basic HDD = 1 TiB (1024 GiB), Basic SSD = 2.5 TiB (2560 GiB), Enterprise = 1 TiB.
- Basic HDD and Basic SSD are now classified by Google as legacy tiers; the current primary tiers are Zonal, Regional, and Enterprise (Multishares for GKE). The post still using `BASIC_HDD`/`BASIC_SSD` is technically valid and these tier strings continue to work in the provider, but a future revision could mention Zonal/Regional as the modern alternatives.
- The Enterprise tier requires a `/26` reserved IP range (vs `/29` for Basic tiers). The post's Enterprise example omits `reserved_ip_range` so Google picks one automatically, which is correct, but worth noting for readers who want to pin the range.
- The `google_filestore_backup` `source_instance` accepts the instance `.id` (full resource name) as shown — correct usage.
- The startup-script mount uses `networks[0].ip_addresses[0]` and `file_shares[0].name`, which are valid computed attributes on `google_filestore_instance`.
- The GKE `PersistentVolume` example hard-codes the NFS path as `/data`, which matches the `name = "data"` file share in the Basic example — consistent.
- The "Multiple File Shares" section's claim that Enterprise can host multiple shares per instance is accurate (Filestore Multishares feature for Enterprise/GKE workloads).
