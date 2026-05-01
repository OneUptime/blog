# Validation Summary: How to Build Elemental OS Images

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elemental Toolkit
- SUSE Rancher Prime OS Manager / Elemental CRDs
- OCI container images
- Docker / Podman
- `zypper`
- `systemd`
- YAML

## Sources Consulted
- Elemental Toolkit getting started and CLI download guidance: https://rancher.github.io/elemental-toolkit/docs/getting-started/download/
- Elemental Toolkit bootable image workflow: https://rancher.github.io/elemental-toolkit/docs/creating-derivatives/creating_bootable_images/
- Elemental Toolkit `build-iso` usage: https://rancher.github.io/elemental-toolkit/docs/creating-derivatives/build_iso/
- Official Elemental Toolkit example Dockerfiles: https://github.com/rancher/elemental-toolkit/tree/main/examples
- Elemental Toolkit `build-iso` command source and flags: https://github.com/rancher/elemental-toolkit/blob/main/cmd/build-iso.go
- SUSE Rancher Prime OS Manager `ManagedOSVersion` reference: https://documentation.suse.com/cloudnative/os-manager/1.8/en/references/managedosversion-reference.html
- SUSE Rancher Prime OS Manager `ManagedOSVersionChannel` reference: https://documentation.suse.com/cloudnative/os-manager/1.8/en/references/managedosversionchannel-reference.html
- SUSE Rancher Prime OS Manager channels documentation: https://documentation.suse.com/cloudnative/os-manager/1.8/en/operator-operational-tasks/channels.html

## Issues Found
- The post claimed Elemental OS images are built specifically on SLE Micro or openSUSE MicroOS. I corrected this to match the toolkit docs: Elemental-compatible derivatives are built from OCI images, and the base image can be any compatible Linux distribution.
- The CLI installation section used an unsupported `zypper install elemental` example and an outdated `registry.suse.com/.../elemental-cli` image reference. I replaced these with the current official `ghcr.io/rancher/elemental-toolkit/elemental-cli` container usage and the documented source-build flow.
- The layer diagram described a non-documented "Elemental Agent Layer". I replaced it with a structure that reflects the documented bootable-image requirements: base OS, boot components, toolkit components, and customizations.
- The main Dockerfile example would not have produced a bootable Elemental image because it started from a plain base image and only installed a few user packages. I rewrote it to follow the documented derivative workflow: install the required boot packages, copy in the Elemental CLI, enable required services, and run `elemental init`.
- The original Dockerfile included an unverifiable `curl | sh` install step for a custom agent. I removed that because it was not backed by official documentation and would not be reviewable for correctness.
- The `ManagedOSVersion` example contained fields that do not match the current reference, including `cloudConfig` under `spec.metadata`, and it omitted the usual channel association label. I corrected the snippet to use documented metadata fields and added the channel label.
- The customization Dockerfile examples restarted from a non-Elemental base image, which broke the tutorial flow. I updated them to layer on the previously built Elemental image instead.
- The ISO build example used an outdated CLI image reference and a misleading `--local` usage. I updated it to the documented `build-iso` flow with the current CLI image and appropriate flags.

## Review Notes
- The `example.com` registry and repository values remain intentional placeholders. They are syntactically valid examples, but readers still need to replace them with real registry and repository endpoints.
- The CRD validation was checked against the current stable SUSE Rancher Prime OS Manager 1.8 documentation available on 2026-05-01.
