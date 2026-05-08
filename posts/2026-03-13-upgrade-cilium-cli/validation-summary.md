# Validation Summary: Upgrade the Cilium CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium CLI
- Cilium
- Kubernetes
- Hubble CLI
- Linux and macOS shell commands
- GitHub Releases
- Homebrew

## Sources Consulted
- Cilium Quick Installation documentation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium CLI command reference for `cilium version`: https://docs.cilium.io/en/latest/cmdref/cilium_version/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium CLI GitHub releases and stable version pointer: https://github.com/cilium/cilium-cli/releases and https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt

## Issues Found
- The post said the CLI version should match the cluster Cilium version. Cilium CLI uses its own `v0.x` release stream, so I changed the guidance to say the CLI should be a maintained release compatible with the cluster Cilium version.
- The `cilium status | grep "cilium image"` command did not match current documented `cilium status` output, which uses `Image versions`. I updated the command to grep for `Image versions`.
- The Linux and macOS direct-download examples renamed the archive to `/tmp/cilium.tar.gz`, but the downloaded `.sha256sum` file refers to the original release asset filename. That would make checksum verification fail. I updated the commands to download the archive and checksum with their original filenames, matching the official Cilium install documentation.
- The direct-download examples hard-coded `v0.15.23`, which is outdated. I changed them to use Cilium's official `stable.txt` version pointer and updated the example release-filter command to use the current `v0.19` release stream.
- The post used `cilium version` when only the local CLI version was being verified. I changed those commands to `cilium version --client`, which is the documented flag for client-only version output.

## Review Notes
The Hubble and connectivity-test commands are valid, but they may require cluster permissions and test resources. Running `cilium hubble enable` can change cluster configuration, so operators should use it intentionally in production environments.
