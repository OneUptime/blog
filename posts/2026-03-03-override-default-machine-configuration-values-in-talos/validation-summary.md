# Validation Summary: How to Override Default Machine Configuration Values in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration system)
- `talosctl` CLI (`gen config`, `patch machineconfig`, `get machineconfig`)
- Strategic merge patches (Talos config patch format)
- JSON Patches (RFC 6902)
- Kubernetes (API server, kubelet, etcd, scheduler, controller manager configuration)

## Sources Consulted
- Talos CLI reference (`talosctl gen config` flags): https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos configuration patching guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos v1alpha1 configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/v1alpha1/config/
- Siderolabs GitHub issue on JSON Patch vs Strategic Merge behavior: https://github.com/siderolabs/talos/issues/12005
- Kubernetes KubeletConfiguration / TLS bootstrapping docs: https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/
- RFC 6902 (JSON Patch): https://datatracker.ietf.org/doc/html/rfc6902

## Issues Found
No technical issues found.

The following claims were specifically verified and are accurate:
- `talosctl gen config` accepts `--config-patch`, `--config-patch-control-plane`, and `--config-patch-worker` flags, all `stringArray`, with `@file` syntax for reading patches from files.
- Patch format (strategic merge YAML vs JSON Patch RFC 6902) is auto-detected.
- `cluster.network.podSubnets` and `cluster.network.serviceSubnets` are overwritten on merge (not appended), which matches the intent of the strategic merge examples.
- `cluster.network.dnsDomain`, `cluster.coreDNS`, `cluster.apiServer.extraArgs`, `cluster.apiServer.certSANs`, `cluster.etcd.extraArgs`, `cluster.scheduler.extraArgs`, `cluster.controllerManager.extraArgs` are valid field paths.
- The distinction between `machine.kubelet.extraArgs` (command-line flags) and `machine.kubelet.extraConfig` (KubeletConfiguration fields, e.g. `serverTLSBootstrap: true`) is correct.
- `talosctl patch machineconfig --nodes <ip> --patch <inline-or-@file>` accepts both strategic merge and JSON Patch payloads.
- `talosctl get machineconfig --nodes <ip> -o yaml` is the correct command to view the effective configuration.
- JSON Patch operations (add, remove, replace, move, copy, test) are correctly enumerated per RFC 6902.

## Review Notes
- The post is written generically without pinning a specific Talos version. The verified behavior is consistent with Talos v1.x (checked against v1.12 documentation). Field names and CLI flags shown have been stable across recent Talos releases.
- JSON Patches do not support multi-document machine configurations (a known limitation tracked in siderolabs/talos#12005). The examples in this post target single-document outputs from `gen config` or a specific node's running config, so this limitation does not affect any example shown.
- The example removing `/cluster/coreDNS` via JSON Patch removes the section from the generated YAML; Talos still applies its built-in CoreDNS defaults at runtime, which matches the inline comment ("reverts to built-in default").
- Some `extraArgs` values shown (e.g. enabling the `PodSecurity` admission plugin, OIDC flags) are passed through to upstream Kubernetes components; the Talos schema accepts them as `map[string]string` without further validation, so any change in upstream Kubernetes flag naming is the user's responsibility.
