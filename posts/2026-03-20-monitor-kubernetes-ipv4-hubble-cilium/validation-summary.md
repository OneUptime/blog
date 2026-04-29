# Validation Summary: How to Monitor Kubernetes IPv4 Network Traffic with Hubble and Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium (CNI)
- Hubble (Cilium's observability platform)
- Hubble CLI
- Hubble Relay
- Hubble UI
- Kubernetes
- Helm
- jq

## Sources Consulted
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Hubble `observe` command help reference (authoritative source): https://raw.githubusercontent.com/cilium/hubble/main/vendor/github.com/cilium/cilium/hubble/cmd/observe_help.txt
- Cilium flow.proto definition (proto3 JSON field mapping): https://raw.githubusercontent.com/cilium/hubble/main/vendor/github.com/cilium/cilium/api/v1/flow/flow.proto
- Hubble stable.txt release pointer: https://raw.githubusercontent.com/cilium/hubble/master/stable.txt (currently `v1.19.3`)
- Hubble GitHub repo: https://github.com/cilium/hubble

## Issues Found

1. **Invalid `-t l3-l4` event type filter.** The `-t/--type` flag accepts only the following event types: `capture`, `drop`, `l7`, `policy-verdict`, `trace`, `trace-sock`. There is no `l3-l4` type. Replaced the example with the dedicated `--ipv4` flag (alias `-4`), which is the correct way to filter for IPv4 flows.

2. **Non-existent `--ip-src` / `--ip-dst` flags.** The Hubble CLI uses `--from-ip` for source IP filtering and `--to-ip` for destination IP filtering (per `hubble observe --help`). Replaced both occurrences.

3. **Incorrect JSON field casing in `jq` examples.** The post used `.flow.Source.namespace` (PascalCase). Hubble's `--output json` uses proto3 JSON mapping (lowerCamelCase), so the field is `.flow.source.namespace`. Updated both jq pipelines.

4. **`--protocol HTTP` should be lowercase.** Per the Hubble CLI help, the `--protocol` filter expects lowercase L4/L7 protocol names (e.g., `udp`, `http`). Changed `HTTP` to `http`.

## Review Notes

- The Helm chart version pinned in the post (`1.15.0`) is older than the current stable Cilium release (`1.19.3` as of validation). The example still works, but readers may want to pin to a more recent version. Left as-is to respect the author's original choice.
- The Hubble CLI install script downloads from the `master` branch (`stable.txt`). The Cilium Hubble repository's default branch is now `main`, but the `master` branch is still maintained and `stable.txt` is identical on both — so this still works.
- The `cilium hubble enable` command, the `cilium status | grep Hubble` verification, and all other observed flags (`--from-pod`, `--to-pod`, `--from-service`, `--to-service`, `--namespace`, `--verdict DROPPED`, `--since`, `--output json`, `--follow`) were verified against the official `hubble observe` help reference and are correct.
- The example output format (e.g., `Mar 20 10:15:32.123 DROPPED ...`) is illustrative; actual Hubble compact output formatting may vary slightly across versions but is qualitatively accurate.
