# Validation Summary: How to Build Custom Disk Images for Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Sidero Labs `imager` container tool
- Talos Image Factory (factory.talos.dev)
- QEMU / KVM / libvirt / `qemu-img` / `virt-install`
- Disk image formats: raw, QCOW2, VMDK, VHD, OVA
- AWS EC2 (import-image, S3)
- Google Cloud Platform (Compute Engine images, GCS, gsutil/gcloud)
- Azure (Blob Storage, az CLI)
- `talosctl` (gen config, apply-config)
- Docker (running the imager container)
- GitHub Actions (CI/CD example)

## Sources Consulted
- Talos v1.7 boot assets guide: https://www.talos.dev/v1.7/talos-guides/install/boot-assets/
- Imager CLI source (v1.7.0): https://github.com/siderolabs/talos/blob/v1.7.0/cmd/installer/cmd/imager/root.go
- Default profile definitions (v1.7.0): https://github.com/siderolabs/talos/blob/v1.7.0/pkg/imager/profile/default.go
- Talos v1.7.0 Makefile: https://github.com/siderolabs/talos/blob/v1.7.0/Makefile
- Image Factory API docs: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- `qemu-img` documentation: https://www.qemu.org/docs/master/tools/qemu-img.html
- GCP `guest-os-features` reference: https://cloud.google.com/compute/docs/images/create-custom#guest-os-features
- AWS `ec2 import-image` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-image.html
- Azure Blob upload reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob

## Issues Found

1. **Invalid `--image-disk-format qcow2` flag in the QCOW2 section.** The Talos v1.7.0 imager has no `--image-disk-format` flag — the disk format is determined by the profile name. The `metal` profile always produces a raw image (`metal-amd64.raw.xz`). Removed the invalid flag and rewrote the QCOW2 section to use only the `qemu-img convert` path (which is the actual correct approach). Also added the missing `xz -d` decompression step before the conversion.

2. **Missing decompression step in the VMDK section.** The post called `qemu-img convert` against `/tmp/out/metal-amd64.raw` immediately after running the imager, but the imager produces `metal-amd64.raw.xz`. Added the `xz -d` step before the convert.

3. **Missing decompression step in the Azure section.** The post referenced `/tmp/out/azure-amd64.vhd`, but the `azure` profile produces `azure-amd64.vhd.xz`. Added the `xz -d /tmp/out/azure-amd64.vhd.xz` decompression before uploading.

4. **Missing S3 upload + decompression in the AWS section.** The `aws ec2 import-image` command references an S3 object, but the post never decompressed `aws-amd64.raw.xz` or uploaded it to S3. Added the decompression and `aws s3 cp` step before the import-image call.

## Review Notes
- `--output-kind image` is technically a valid flag in v1.7.0 (it can override the profile's default output kind), and it matches the `metal`/`aws`/`gcp`/`azure` profiles' defaults. It is redundant in every example shown, but not incorrect — left as-is to preserve the author's style.
- Extension image tags referenced (`iscsi-tools:v0.1.4`, `qemu-guest-agent:v8.2.0`, `tailscale:v1.62.0`) are plausible for the Talos v1.7 timeframe; readers should check the official extensions repo for the version matching their Talos release.
- The `aws ec2 import-image` approach works but is not the workflow Sidero documents for Talos AMI registration — they typically recommend uploading a raw image to S3, creating an EBS snapshot via `import-snapshot`, then registering the AMI with `register-image`. The `import-image` path is still valid AWS tooling and the post's command syntax is correct.
- For Azure, production usage typically requires the VHD to be fixed-size and uploaded as a page blob; `az storage blob upload` defaults to block blob. Readers deploying to Azure may need `--type page` and additional VHD prep steps.
- `make image-metal` (and `image-aws`, `image-gcp`, `image-azure`) are valid Talos Makefile targets at v1.7.0.
- Image Factory endpoints (`POST /schematics`, `GET /image/{id}/{version}/{file}`) and URL/file naming are correct.
