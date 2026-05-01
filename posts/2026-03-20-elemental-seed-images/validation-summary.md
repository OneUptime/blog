# Validation Summary: How to Create Elemental Seed Images

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime: OS Manager / Elemental
- Kubernetes
- `kubectl`
- Rancher `MachineRegistration`
- Rancher `SeedImage`
- SUSE Linux Micro container and ISO images
- Docker
- QEMU / OVMF

## Sources Consulted
- SUSE Rancher Prime: OS Manager SeedImage reference: https://documentation.suse.com/cloudnative/os-manager/1.9/en/references/seedimage-reference.html
- SUSE Rancher Prime: OS Manager MachineRegistration reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineregistration-reference.html
- SUSE Rancher Prime: OS Manager Certificate Authority Verification: https://documentation.suse.com/cloudnative/os-manager/latest/en/operator-operational-tasks/certificate-authority.html
- SUSE Rancher Prime: OS Manager quickstart CLI guide: https://documentation.suse.com/cloudnative/os-manager/1.6/en/quickstart-cli.html
- SUSE Rancher Prime: OS Manager custom OS image guide: https://documentation.suse.com/cloudnative/os-manager/1.7/en/operator-operational-tasks/custom-images.html
- Rancher TLS secret documentation: https://ranchermanager.docs.rancher.com/v2.10/getting-started/installation-and-upgrade/resources/add-tls-secrets
- SUSE container registry image families and tags in `registry.suse.com` for `suse/sl-micro/6.1/baremetal-iso-image` and `suse/sl-micro/6.1/baremetal-os-container`

## Issues Found
- The post used a manual `elemental-cli` `build-iso` / `build-disk` flow to inject registration settings. I replaced that with the current supported `SeedImage` resource workflow, which is the documented way to generate Elemental seed ISOs and raw images from a `MachineRegistration`.
- The post pulled CA data from the `tls-rancher-internal-ca` secret. I removed that because the current Rancher and OS Manager documentation describes CA trust via Rancher `cacerts` / `tls-ca`, and the supported `SeedImage` workflow does not require manually extracting that secret for image generation.
- The YAML example mixed registration, install, and cloud-config data into a standalone `seed-image-config.yaml`. I replaced it with a valid `SeedImage` spec and clarified that installation and registration settings remain on the referenced `MachineRegistration`.
- The sample cloud-config enabled `elemental-agent`, which is not the current documented agent flow. I removed that and kept the example to supported cloud-config customizations.
- The build examples referenced outdated image/registry patterns such as `registry.suse.com/rancher/sle-micro:latest`. I updated them to the current documented SL Micro image families under `registry.suse.com/suse/sl-micro/...` and verified the example repositories expose `latest` tags.
- The customization Dockerfile was incomplete for current Elemental images. I replaced it with a documented customization flow that updates `/etc/os-release`, runs `elemental init`, and builds a custom ISO container image suitable for use as a `SeedImage` base image.
- The VM verification section omitted key boot requirements and an install target disk. I corrected it to mention TPM or `emulate-tpm`, require UEFI boot on x86_64, create a QCOW2 disk, and use OVMF in the QEMU example.

## Review Notes
- The post now reflects the current `SeedImage`-based workflow rather than older manual image baking patterns.
- The examples use `SL Micro 6.1` image families with `latest` tags for readability. For production use, pinning immutable image tags is safer for reproducibility.
- `SeedImage` artifacts are temporary by default. If readers need the generated download to persist longer, they should review the `cleanupAfterMinutes` behavior in the official `SeedImage` reference.
