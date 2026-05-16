# Validation Summary: How to Schedule Kernel Updates on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9.x)
- talosctl CLI
- Kubernetes (kubectl drain/uncordon, CronJob)
- etcd (snapshot/backup)
- Linux kernel parameters (sysctls, kernel modules)
- GitHub Releases API (for update detection)

## Sources Consulted
- Talos v1.9 CLI reference: https://www.talos.dev/v1.9/reference/cli/
- Talos v1.9 machine config schema (v1alpha1): https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos v1.9 upgrade documentation: https://www.talos.dev/v1.9/talos-guides/upgrading-talos/
- Talos etcd maintenance docs: https://www.talos.dev/v1.9/advanced/etcd-maintenance/
- Siderolabs installer image registry: ghcr.io/siderolabs/installer
- Kubernetes CronJob reference (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
No technical issues found.

All `talosctl` subcommands and flags used in the post (`dmesg`, `read`, `version`, `upgrade --image`, `health --wait-timeout`, `etcd snapshot`, `rollback`) are valid in Talos v1.9. The installer image path `ghcr.io/siderolabs/installer` is the current/correct registry (the older `ghcr.io/talos-systems/installer` and `docker.io/autonomy/installer` paths are deprecated). The machine config keys `machine.sysctls` (map of string→string) and `machine.kernel.modules[].name` match the v1alpha1 schema exactly. The Kubernetes CronJob manifest uses the current stable `batch/v1` apiVersion. The A-B partition rollback model described in the Rollback section accurately reflects Talos behavior.

## Review Notes
- The `talosctl etcd snapshot <path>` command writes the snapshot to the **local client filesystem** (where talosctl runs), not to the node. The post's example (`/backup/etcd-pre-upgrade.db`) is syntactically correct but readers may incorrectly assume the path is on the control-plane node. A brief clarification would be a nice-to-have but is not strictly a technical error.
- The post pins examples to `v1.9.1`. The latest v1.9 patch at review time was v1.9.5; `v1.9.1` is a valid published tag, so the examples still work, but readers should substitute the current release when applying.
- The CronJob's shell pipeline parses the GitHub API response with `grep`/`cut` rather than `jq`. This works but is fragile if the JSON key ordering ever changes; not incorrect, just brittle. The `curlimages/curl` image does not include `jq`, so the simpler approach is reasonable for the example.
- The post correctly describes the immutable, image-based update model and the absence of independent kernel-package upgrades on Talos.
