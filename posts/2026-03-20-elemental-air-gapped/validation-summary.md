# Validation Summary: How to Configure Elemental for Air-Gapped Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime: OS Manager (Elemental)
- Rancher / Helm
- Kubernetes
- K3s
- RKE2
- Kubernetes CRDs (`MachineRegistration`, `SeedImage`)
- OCI/container registries
- NGINX

## Sources Consulted
- SUSE® Rancher Prime: OS Manager air-gap installation docs: https://documentation.suse.com/cloudnative/os-manager/1.8/en/operator-operational-tasks/airgap.html
- SUSE® Rancher Prime: OS Manager `SeedImage` reference: https://documentation.suse.com/cloudnative/os-manager/1.8/en/references/seedimage-reference.html
- SUSE® Rancher Prime: OS Manager `MachineRegistration` reference: https://documentation.suse.com/external-tree/en-us/cloudnative/os-manager/1.5/en/machineregistration-reference.html
- SUSE® Rancher Prime: OS Manager cloud-config reference: https://documentation.suse.com/cloudnative/os-manager/1.8/en/references/cloud-config-reference.html
- K3s private registry configuration: https://documentation.suse.com/cloudnative/k3s/latest/en/installation/private-registry.html
- K3s configuration options: https://documentation.suse.com/cloudnative/k3s/latest/en/installation/configuration.html
- RKE2 private registry configuration: https://docs.rke2.io/install/private_registry
- RKE2 configuration options: https://docs.rke2.io/install/configuration
- Official `elemental-airgap.sh` helper script: https://raw.githubusercontent.com/rancher/elemental-operator/main/scripts/elemental-airgap.sh
- Elemental Toolkit build ISO docs: https://rancher.github.io/elemental-toolkit/docs/creating-derivatives/build_iso/

## Issues Found
- Step 1 manually mirrored an incomplete and partly incorrect image set. I replaced it with the official `elemental-airgap.sh` workflow because the official docs and script collect the required charts, operator images, OS images, and a private-registry channel image together.
- Step 2 used a non-official chart source, the wrong namespace, and incorrect Helm values for the documented air-gap install flow. I replaced it with the documented `rancher-load-images.sh` plus `helm upgrade` commands for `elemental-operator-crds` and `elemental-operator` in `cattle-elemental-system`, using `registryUrl` and the generated channel.
- Step 3 wrote only `/etc/rancher/k3s/registries.yaml` while claiming the snippet covered both K3s and RKE2. I added separate K3s and RKE2 registry files, included the CA file referenced by `ca_file`, and added `disable-default-registry-endpoint: true` drop-ins for true air-gapped behavior.
- Step 4 described a local `docker build` and `elemental-cli build-iso` flow as seed-image generation. That was not the correct OS Manager onboarding flow because official seed media are built via the `SeedImage` CR and include `MachineRegistration` data. I replaced this section with verified `SeedImage` examples for both ISO and RAW output.
- The original Step 4 command pattern implied `build-iso` would cover both ISO and RAW use cases and used a `--config` style invocation. Official toolkit docs use `--config-dir` for manifest-based config, and RAW images are a separate workflow. This was resolved by switching the post to the documented `SeedImage` flow.
- Step 5 copied `elemental-seed.raw` without any earlier step generating a RAW artifact. I added explicit RAW `SeedImage` creation and download commands before the NGINX distribution example.

## Review Notes
- The post now follows the current official OS Manager air-gap workflow, which relies on `elemental-airgap.sh` and a custom mirrored channel image instead of a hand-maintained list of images.
- `SeedImage` base image tags are version-specific. Readers should use tags that exist in the mirrored artifact set produced in Step 1.
- `--disable-default-registry-endpoint` is only available in January 2024 or later K3s and RKE2 releases. The updated post uses that setting for true air-gapped behavior because the official docs recommend it when upstream registries must not be contacted.
