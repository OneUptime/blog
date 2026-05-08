# Validation Summary: Validate Cilium CLI Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium CLI
- Cilium on Kubernetes
- kubectl
- Hubble
- CiliumEndpoint CRD

## Sources Consulted
- Cilium Quick Installation documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `version` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_version/
- Cilium Hubble command reference: https://docs.cilium.io/en/latest/cmdref/cilium_hubble.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium CLI stable version file: https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt
- Cilium CLI GitHub releases: https://github.com/cilium/cilium-cli/releases

## Issues Found
- `cilium version --verbose` is not documented as a valid Cilium CLI option. Replaced it with `cilium version --client`, which is documented and verifies the local client version without requiring cluster access.
- The post implied that the Cilium CLI version should match the Cilium cluster version. Cilium CLI uses a separate `v0.x` version stream from Cilium agent `v1.x` releases, so the guidance was changed to use a current CLI release that supports the cluster.
- The example for installing a "matching" CLI release hard-coded `v0.15.23` while setting an unused `CILIUM_VERSION="v1.15.5"`. Replaced it with checking the latest stable CLI version from the official `stable.txt` file.
- `cilium hubble status` is not listed in the current `cilium hubble` command reference. Replaced it with `cilium hubble port-forward --help`, a documented Hubble subcommand.
- `cilium endpoint list` is not a current top-level Cilium CLI command. Replaced it with `kubectl get ciliumendpoints --all-namespaces`, which matches the documented way to list CiliumEndpoint CRDs across namespaces.

## Review Notes
- The Linux installation snippet is close to the official Cilium documentation, but the official example also downloads and verifies the `.sha256sum` file. The post remains technically workable, but checksum verification would be a useful future hardening improvement.
