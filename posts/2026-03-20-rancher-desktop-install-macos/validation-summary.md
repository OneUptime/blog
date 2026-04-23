# Validation Summary: How to Install Rancher Desktop on macOS

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Desktop
- macOS
- Kubernetes
- k3s
- `rdctl`
- `kubectl`
- `nerdctl`
- Docker / Moby
- Helm

## Sources Consulted
- Rancher Desktop Installation docs: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Kubernetes preferences docs: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop Troubleshooting docs: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop release notes covering `rdctl info` and `rdctl reset`: https://github.com/rancher-sandbox/rancher-desktop/releases
- Bitnami Helm charts repository README: https://github.com/bitnami/charts

## Issues Found
- The prerequisites section was not macOS-specific and treated recommended resources as hard requirements. It was updated to match the current Rancher Desktop macOS installation requirements and recommendations.
- The post title promises installation instructions, but the original Step 1 only verified an existing installation. Step 1 was corrected to the official macOS DMG installation flow and then retained the post-install verification commands.
- The post used stale or incorrect Rancher Desktop CLI examples. `rdctl status` was replaced with `rdctl info`, and deprecated `rdctl factory-reset` examples were updated to `rdctl reset --k8s` for Kubernetes reset and `rdctl reset --factory` for a full reset.
- The `rdctl list-settings | grep kubernetesVersion` and `rdctl list-settings | grep -i vm` examples were inaccurate for current JSON output. They were replaced with `rdctl list-settings`.
- The hard-coded Kubernetes version examples (`v1.28.0` and `v1.29.0`) were outdated. They were replaced with `<supported-version>` placeholders and current flag names.
- The overview implied Docker CLI availability unconditionally. It was clarified that Docker CLI applies when the Moby container engine is selected.

## Review Notes
- No remaining technical issues found after the corrections above.
- Bitnami currently recommends OCI-based chart installation in its repository README, but the `helm repo add bitnami https://charts.bitnami.com/bitnami` workflow remains supported for backward compatibility.
- Rancher Desktop documents `rdctl` as experimental, so exact subcommands and flags may change across future releases.
