# Validation Summary: How to Add System Extensions to Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7-era examples)
- talosctl CLI
- Image Factory (factory.talos.dev)
- Sidero Labs system extensions (iSCSI tools, QEMU guest agent, Tailscale, NVIDIA GPU, gVisor, ZFS)
- crane (OCI registry CLI from go-containerregistry)
- Kubernetes (cluster context)

## Sources Consulted
- Talos system extensions guide: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/system-extensions
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.7/learn-more/image-factory/
- siderolabs/extensions GitHub repository: https://github.com/siderolabs/extensions
- Tailscale extension docs in siderolabs/extensions
- Talos v1.5 release notes (where `.machine.install.extensions` was deprecated)
- Community references confirming `.machine.install.extensions` has no effect starting in Talos v1.10

## Issues Found
1. **Deprecated primary method.** The post presented `.machine.install.extensions` as the primary install mechanism. This field was deprecated in Talos v1.5 and has no effect starting in Talos v1.10. Rewrote the "Adding Extensions During Installation" and "Adding Extensions to an Existing Cluster" sections to use a custom installer image generated via Image Factory (`factory.talos.dev/installer/<schematic-id>:<version>`), which is the current recommended workflow. Added a one-sentence deprecation note up front so readers on newer Talos versions are not misled.
2. **Wrong upgrade image.** The original upgrade commands used the stock installer (`ghcr.io/siderolabs/installer:v1.7.0`), which does NOT contain the configured extensions. Replaced with the custom Image Factory installer URL, which is what actually carries the extensions onto the node during upgrade. Applied to both the "Adding Extensions to an Existing Cluster" and "Removing Extensions" sections.
3. **Outdated Tailscale configuration.** The post configured Tailscale by writing `TS_AUTHKEY` / `TS_ROUTES` to `/var/etc/tailscale/auth.env` via `machine.files`. The current canonical mechanism is an `ExtensionServiceConfig` document (`apiVersion: v1alpha1`, `kind: ExtensionServiceConfig`, `name: tailscale`, with `environment:` entries). Replaced the example accordingly.
4. **Stale NVIDIA extension names.** The original used `ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules` and `nvidia-container-toolkit` with `:535.x` tags. These extensions are now published only in `-production` and `-lts` variants (e.g. `nvidia-open-gpu-kernel-modules-production`, `nvidia-container-toolkit-production`). Updated example image names and the inline comment in the "Finding Available Extensions" code block. Folded the configuration example into the Image Factory workflow rather than the deprecated install-list workflow.
5. **Extension Load Order section.** Replaced with an "Extension Dependencies" section. Image Factory composes extensions into a single installer image, so the original "loaded in the order they appear in the configuration" claim was no longer accurate; dependency information is still useful but the ordering mechanic was specific to the deprecated `machine.install.extensions` list.
6. **Removing Extensions section.** Updated to instruct submitting a new Image Factory schematic without the unwanted extension and upgrading to the new custom installer, matching how removal actually works under the Image Factory model.

## Review Notes
- The verification commands in the "Verifying Extensions" section (`talosctl get extensions`, `talosctl read /proc/modules`, `talosctl dmesg`, `talosctl logs machined`) are all valid talosctl subcommands and were left as-is. The two-`VERSION`-column output for `talosctl get extensions` (resource version and extension version) is correct.
- The Image Factory schematic format used in the post (`customization.systemExtensions.officialExtensions`) matches the documented format, and the `curl -X POST --data-binary @schematic.yaml https://factory.talos.dev/schematics` invocation is correct (the `Content-Type: application/yaml` header is optional but harmless).
- The post still references Talos v1.7.x (e.g. `v1.7.6` in the new examples). Readers on much newer versions should substitute their installed Talos version when copying the snippets.
- `crane` (from google/go-containerregistry) is assumed to be installed; the post does not explain installation but the commands are syntactically correct.
- The `talosctl apply-config --insecure` flow remains valid for initial bootstrap of a node that does not yet have a PKI configured.
