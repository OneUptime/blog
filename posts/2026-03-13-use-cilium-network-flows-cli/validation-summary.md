# Validation Summary: How to Set Up Cilium Network Flows with the CLI

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Cilium
- Hubble
- Hubble CLI
- Kubernetes
- jq
- Mermaid

## Sources Consulted
- Cilium documentation: Inspecting Network Flows with the CLI, https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium documentation: Setting up Hubble Observability, https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Network Observability with Hubble, https://docs.cilium.io/en/stable/observability/hubble/
- Cilium documentation: cilium hubble command reference, https://docs.cilium.io/en/latest/cmdref/cilium_hubble/
- Hubble CLI v1.19.3 `hubble observe --help` output from the official cilium/hubble release
- Hubble GitHub repository README, https://github.com/cilium/hubble

## Issues Found
- The Hubble CLI install snippet used `https://raw.githubusercontent.com/cilium/hubble/master/stable.txt`. Official docs now use the `main` branch. Updated the URL to `https://raw.githubusercontent.com/cilium/hubble/main/stable.txt`.
- The Hubble CLI install snippet downloaded only the amd64 tarball and did not verify the checksum. Updated it to follow the official Linux install pattern with `HUBBLE_ARCH`, `curl --fail`, `.sha256sum` download, checksum verification, direct extraction to `/usr/local/bin`, and cleanup.
- The HTTP status filter used `hubble observe --http-status-code 500`, which is not a valid flag in Hubble CLI v1.19.3. Updated it to `hubble observe --http-status 500`.

## Review Notes
- The remaining `hubble observe` filters in the post were checked against Hubble CLI v1.19.3 help output and accepted by `--print-raw-filters`.
- Hubble HTTP method and path visibility depends on L7 visibility being configured for the relevant traffic; the post already scopes HTTP metadata to L7-monitored traffic.
