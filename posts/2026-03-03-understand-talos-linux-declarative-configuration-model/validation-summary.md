# Validation Summary: How to Understand Talos Linux Declarative Configuration Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos machine configuration
- talosctl
- Kubernetes
- YAML
- GitOps

## Sources Consulted
- Talos v1.12 MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos v1.12 configuration overview: https://docs.siderolabs.com/talos/v1.12/reference/configuration/overview
- Talos v1.12 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1.12 editing machine configuration guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos v1.12 acquiring machine configuration guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/acquire
- Talos v1.12 configuration patches guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos v1.12 Hostname configuration guide: https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- Talos v1.12 LinkConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/linkconfig
- Talos v1.12 DHCPv4Config reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/dhcpv4config
- Talos v1.12 ResolverConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/resolverconfig

## Issues Found
- The post described Talos configuration as a single YAML document. Current Talos documentation describes a single machine configuration YAML file that may contain multiple documents. Updated the wording and examples accordingly.
- Network examples used legacy `.machine.network.hostname`, `.machine.network.interfaces`, and `.machine.network.nameservers` fields. Updated examples and patches to current multi-document `HostnameConfig`, `LinkConfig`, `DHCPv4Config`, and `ResolverConfig` forms.
- Version examples used older Talos and Kubernetes image versions. Updated examples to Talos v1.12.1 and Kubernetes v1.35.0 to match the current `talosctl gen config` defaults reviewed.
- The live patch example changed `/machine/network/hostname`, which is no longer the right current model for hostname configuration. Replaced it with a `HostnameConfig` patch.
- The `talosctl get machineconfig -o yaml` diff example returned the full resource, not just the raw machine configuration accepted by `apply-config`. Updated it to retrieve `.spec` with `talosctl get machineconfig v1alpha1 -o jsonpath='{.spec}'`.
- The per-node generation command wrote one worker file while leaving the default multiple output types enabled. Added `--output-types worker` so `--output worker-01.yaml` is valid.
- The initial configuration acquisition list included a DHCP-discovered configuration server. Updated it to documented current acquisition methods, including embedded boot-asset configuration.
- The reboot/immediate-change section overstated which changes require reboot. Updated it to reflect Talos apply modes and current no-reboot fields.

## Review Notes
Validated the generated worker configuration and patched worker configuration with `talosctl validate --mode metal` using Talos v1.12.1. The post remains a conceptual guide; future updates should revisit version examples as Talos and Kubernetes defaults advance.
