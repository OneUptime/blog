# Validation Summary: How to Configure Elemental Reset Plans

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime: OS Manager / Elemental
- Kubernetes
- `MachineRegistration` and `MachineInventory`
- `kubectl`
- `journalctl`

## Sources Consulted
- SUSE Rancher Prime: OS Manager MachineRegistration reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineregistration-reference.html
- SUSE Rancher Prime: OS Manager Troubleshooting reset: https://documentation.suse.com/cloudnative/os-manager/latest/en/troubleshooting/troubleshooting-reset.html
- SUSE Rancher Prime: OS Manager Machine Reset: https://documentation.suse.com/cloudnative/os-manager/1.7/en/node-operational-tasks/reset.html
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post originally described reset as being triggered by `elemental.cattle.io/reset="true"` and a user-authored `upgrade.cattle.io/v1 Plan`. Current OS Manager reset is enabled via `spec.config.elemental.reset.enabled` or the `elemental.cattle.io/resettable: "true"` annotation, and the reset workflow begins when the related `MachineInventory` is deleted. I replaced the trigger commands and removed the unsupported `Plan` example.
- The `MachineRegistration` examples incorrectly nested `cloud-config` under `spec.config.elemental.reset`. Current documentation defines reset settings under `spec.config.elemental.reset`, while cloud-init content belongs under `spec.config.cloud-config` and is applied again during reset. I moved the configuration to the correct location and used the supported `config-urls` field for additional reset-time config.
- The reset workflow explanation incorrectly said the node reinstalls from the original OS image. The documented workflow reboots into recovery mode, runs `elemental-register-reset`, applies the reset settings from the same `MachineRegistration`, and creates a new `MachineInventory` without reinstalling the machine. I corrected the explanation accordingly.
- One example set `reset-oem: false` while the comment said the OEM partition would be wiped. I changed it to `true` to match the stated behavior and the documented reset options.
- The monitoring and bulk reset sections were tied to the removed `Plan` workflow and the wrong annotation key. I updated them to inspect `MachineInventory` deletion state, the operator-created reset plan secret, and node-side `elemental-system-agent` logs, and to use deletion-based bulk reset commands.

## Review Notes
- The public OS Manager references and troubleshooting docs are current as of May 1, 2026 and align on the reset behavior used in the revised post.
- `kubectl` was not installed in the local review environment, so command syntax was checked against the official Kubernetes generated reference pages instead of local `--help` output.
