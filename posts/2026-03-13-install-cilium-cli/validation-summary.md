# Validation Summary: Install Cilium CLI

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Cilium CLI
- Cilium
- Kubernetes
- Hubble
- Linux shell commands
- macOS/Homebrew
- Windows PowerShell

## Sources Consulted
- Cilium Quick Installation documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium install command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium upgrade command reference: https://docs.cilium.io/en/latest/cmdref/cilium_upgrade/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui.html
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup.html
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI GitHub repository and release assets: https://github.com/cilium/cilium-cli

## Issues Found
- The post used Cilium `1.15.0` and `1.15.1` in install and upgrade examples. The current Cilium CLI stable release documented in the repository is compatible with Cilium 1.16 and newer, while current stable Cilium documentation uses `1.19.3`. Updated the examples to `1.19.3`.
- The best practices section said to pin the Cilium CLI version to match the cluster's Cilium version. Cilium CLI releases use a separate `v0.x` version scheme from Cilium's `v1.x` releases, so exact matching is not correct. Changed this to recommend using a Cilium CLI release compatible with the cluster's Cilium version.

## Review Notes
- The Linux and macOS install commands match the official Cilium quick installation documentation.
- The Windows ZIP artifact names were verified against the latest Cilium CLI GitHub release assets.
- The listed commands and flags, including `cilium install --set`, `cilium status --wait`, `cilium connectivity test`, `cilium hubble enable`, `cilium hubble ui`, `cilium upgrade --version`, `cilium config view`, `cilium sysdump --output-filename`, and `cilium uninstall`, are present in current official command references.
