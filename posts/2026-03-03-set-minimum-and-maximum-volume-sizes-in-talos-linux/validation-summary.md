# Validation Summary: How to Set Minimum and Maximum Volume Sizes in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, VolumeConfig document, disks/partitions)
- talosctl CLI
- Kubernetes (control plane / worker node roles, etcd)
- Prometheus (node_exporter filesystem metrics, alerting rules)
- CEL (Common Expression Language) used in Talos diskSelector expressions

## Sources Consulted
- Talos VolumeConfig reference: https://www.talos.dev/v1.11/reference/configuration/block/volumeconfig/
- Talos UserVolumeConfig reference: https://www.talos.dev/v1.11/reference/configuration/block/uservolumeconfig/
- Talos disk management guide: https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/
- Talos v1alpha1 MachineConfig reference (disks/partitions): https://www.talos.dev/v1.10/reference/configuration/v1alpha1/config/
- Sibling validated post in this repo using the same VolumeConfig pattern: `posts/2026-03-03-use-disk-selectors-with-cel-expressions-in-talos-linux/README.md`

## Issues Found
1. **Invalid `machine.volumes` schema** — Every YAML snippet that configured the EPHEMERAL volume nested `volumes` under `machine:`. This field does not exist in v1alpha1 MachineConfig. EPHEMERAL is configured via a separate top-level document with `apiVersion: v1alpha1` and `kind: VolumeConfig`. Rewrote all six affected snippets (Setting Minimum Size, Setting Maximum Size, two Grow Flag examples, Scenario 1, Scenario 2, Scenario 3) to use the proper `VolumeConfig` document form, joined to `machine:` blocks via `---` where both are shown.
2. **Incorrect CEL size syntax for minSize/maxSize** — The "Size Units" section showed `minSize: 50u * GB` as if the CEL `<integer>u * <unit>` form were valid for sizing fields. That form is only legal inside CEL expressions such as `diskSelector.match`. Replaced the example with a `diskSelector.match: disk.size > 100u * GB` snippet and added a clarifying sentence that `minSize`/`maxSize` are always plain size strings.
3. **Wrong talosctl resource name** — `talosctl get volumes` is not the canonical resource. Changed to `talosctl get volumeconfigs` in the "What Happens When Sizes Cannot Be Satisfied" section. `talosctl get volumestatus` in the Monitoring section was already correct and was left as-is.

## Review Notes
- The Prometheus alert example is generic node_exporter syntax and is correct.
- The `machine.disks[].partitions[]` legacy block with `size: 100GB` / `size: 0` (remainder) is valid and was left unchanged.
- Talos also exposes a newer `UserVolumeConfig` document (separate from `VolumeConfig`) for user-defined volumes; this post focuses on the EPHEMERAL system volume and legacy disks/partitions, which is still valid. No change needed but worth knowing for future deeper coverage of user-volume sizing.
- The 100GB-node example claim "EPHEMERAL gets about 40-60GB (after system partitions)" is approximate; actual leftover depends on installed system extensions and the META/STATE partitions but is reasonable order-of-magnitude.
