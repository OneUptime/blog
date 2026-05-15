# Validation Summary: How to Use talosctl upgrade for Node Upgrades

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- etcd
- Talos Image Factory

## Sources Consulted
- Talos Linux v1.7 upgrading guide: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Linux v1.7 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Talos Linux latest upgrading guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Linux v1.7 boot assets and Image Factory guide: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl uncordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_uncordon/

## Issues Found
- The post incorrectly stated that `talosctl upgrade` writes directly to an alternate partition. Updated the description to match Talos' documented A-B image upgrade scheme.
- The post used `talosctl health --wait-timeout`, but `--wait-timeout` is not an option for `talosctl health` in the Talos v1.7 CLI reference. Removed the invalid flag from all examples.
- The preserve section incorrectly stated that `talosctl upgrade` preserves machine configuration and data by default. Updated it to explain that Talos 1.7 does not preserve ephemeral data by default and that `--preserve` should be used when ephemeral data must be retained or for single-node control plane upgrades.
- The staging section incorrectly described `--stage` as downloading the image without rebooting and then applying on a later manual reboot. Updated it to match the Talos documentation: staged upgrades are applied from an early boot environment and involve a reboot flow.
- The rolling upgrade script did not stop on worker health-check failures. Updated the worker loop to exit if `talosctl health` fails, matching the control plane behavior.

## Review Notes
The examples use Talos v1.7.0 installer images, while the Talos v1.7 documentation now shows later v1.7 patch releases in some examples. The commands remain syntactically valid, but production upgrades should generally target the latest patch release for the chosen minor version.
