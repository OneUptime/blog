# Validation Summary: How to Create Hetzner Cloud Volumes with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Hetzner Cloud (hcloud) Terraform provider
- `hcloud_volume` and `hcloud_volume_attachment` resources
- `hcloud_server` resource
- ext4 and xfs filesystems
- `resize2fs` and `xfs_growfs` Linux utilities

## Sources Consulted
- Hetzner Cloud Terraform provider docs — `hcloud_volume`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/volume.md
- Hetzner Cloud Terraform provider docs — `hcloud_volume_attachment`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/volume_attachment.md
- Hetzner Cloud Volumes overview: https://docs.hetzner.com/cloud/volumes/overview/
- Hetzner Cloud Volumes FAQ: https://docs.hetzner.com/cloud/volumes/faq
- Hetzner Cloud Block Storage product page: https://www.hetzner.com/cloud/block-storage/
- Hetzner Cloud pricing (May 2026): https://costgoat.com/pricing/hetzner
- Hetzner price adjustment notice (April 2026): https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/

## Issues Found
1. **Storage technology mischaracterized.** The post described volumes as "NVMe SSD block storage." Hetzner's own product pages describe Cloud Volumes only as "SSD-based block storage" / "Highly available SSD storage" (networked block storage with triple replication). They do not advertise the underlying medium as NVMe. Changed both occurrences of "NVMe SSD" to "SSD-based" / "SSD-based block storage" in the introduction and conclusion.
2. **Pricing was incorrect.** The post claimed €0.0119/GB/month. Hetzner Cloud Volume pricing was €0.044/GB/month before the April 1, 2026 price adjustment and is currently €0.0572/GB/month (post-adjustment, May 2026). Updated the conclusion to "around €0.0572/GB/month" to reflect the current published price.

## Review Notes
- All `hcloud_volume` arguments used in the examples (`name`, `size`, `location`, `server_id`, `format`, `automount`, `labels`) are valid per the Hetzner Cloud Terraform provider docs.
- Size range `10` to `10240` GB matches Hetzner's documented minimum (10 GB) and maximum (10 TB) volume sizes.
- Supported `format` values (`ext4`, `xfs`) match the provider docs.
- `hcloud_volume_attachment` arguments (`volume_id`, `server_id`, `automount`) are correct.
- Mount path `/mnt/HC_Volume_<id>` and device path `/dev/disk/by-id/scsi-0HC_Volume_<volume-id>` match Hetzner's documented automount and device-naming conventions.
- The `server_type = "cx22"` and `image = "ubuntu-24.04"` references are valid current Hetzner Cloud identifiers.
- The post references `hcloud_ssh_key.default.id` without showing that resource defined; this is a common tutorial shorthand and not a technical error.
- Hetzner pricing is volatile (a 30%+ increase took effect April 1, 2026); the price quoted in the conclusion may need re-validation if Hetzner adjusts again.
