# Validation Summary: How to Upgrade the Talos Linux Installer Image

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos installer OCI images
- Talos Image Factory
- Talos system extensions
- crane
- Docker
- cosign
- Container registries

## Sources Consulted
- Sidero Labs Talos upgrade documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Sidero Labs Talos v1.7 boot assets documentation: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets
- Sidero Labs Image Factory documentation: https://docs.siderolabs.com/talos/v1.11/learn-more/image-factory
- Sidero Labs system extensions documentation: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/system-extensions
- Sidero Labs machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Sidero Labs MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Sidero Labs image verification documentation: https://docs.siderolabs.com/talos/v1.12/security/verifying-images
- Sidero Labs extensions repository/package metadata: https://github.com/siderolabs/extensions
- GHCR container manifests for referenced Sidero Labs extension images.

## Issues Found
- The `talosctl get machineconfig` example omitted the `v1alpha1` resource ID used by the documented command. Updated it to `talosctl get machineconfig v1alpha1`.
- The first custom image example described the NVIDIA extension as "NVIDIA drivers" while only adding `nvidia-container-toolkit`. Changed the wording to "NVIDIA container toolkit".
- The `gasket-driver` extension tag `1.0-v1.7.0` does not exist in GHCR. Replaced it with the valid v1.7.0 tag `09385d4-v1.7.0`.
- The Docker retag example assumed a fixed image name after `docker load`. Updated it to capture the loaded image name or ID from Docker before tagging it.
- The Image Factory schematic example did not show the required upload step to obtain the schematic ID. Added the documented `curl -X POST --data-binary @schematic.yaml https://factory.talos.dev/schematics | jq -r '.id'` command.
- The CI shell array stored each flag and value as one string, which would pass invalid arguments to `imager`. Split the flags and values into separate array elements and quoted `"${EXTENSIONS[@]}"`.
- The image verification section described `crane ls` as checking image size and layers, but `crane ls` lists repository tags. Updated the comment.
- The cosign example used `--key <key-file>`, but Sidero Labs documents keyless verification with certificate identity and OIDC issuer checks. Updated the command accordingly.

## Review Notes
The post focuses on Talos v1.6/v1.7 examples. Those versions are older than the current Talos documentation, so future updates could refresh examples to the latest Talos release and platform-specific Image Factory installer paths.
