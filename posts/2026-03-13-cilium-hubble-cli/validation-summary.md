# Validation Summary: Hubble CLI for Cilium

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Cilium
- Hubble CLI
- Hubble Relay
- Kubernetes
- kubectl port-forward
- jq
- Mermaid

## Sources Consulted
- Cilium documentation: Setting up Hubble Observability - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Inspecting Network Flows with the CLI - https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium command reference: cilium hubble port-forward - https://docs.cilium.io/en/latest/cmdref/cilium_hubble_port-forward/
- Cilium Hubble GitHub repository and release information - https://github.com/cilium/hubble
- Hubble CLI v1.19.3 `hubble observe --help` and `hubble status --help` output from the official Linux AMD64 release artifact
- Homebrew Formulae: hubble - https://formulae.brew.sh/formula/hubble

## Issues Found
- The Linux install snippet used `https://raw.githubusercontent.com/cilium/hubble/master/stable.txt`. The official Cilium documentation uses `main/stable.txt`, so the post was updated to use the current official branch path.
- The Linux install snippet downloaded only the tarball and moved the extracted binary manually. The official install flow downloads the `.sha256sum`, verifies it with `sha256sum --check`, and extracts directly into `/usr/local/bin` with `sudo tar xzvfC`. The snippet was updated to match the official current installation flow.

## Review Notes
- The Hubble CLI filtering examples were checked against `hubble observe --help` from Hubble v1.19.3. The flags shown in the post are valid: `--follow`, `--last`, `--since`, `--until`, `--namespace`, `--from-pod`, `--to-pod`, `--verdict`, `--protocol`, `--to-port`, `--output`, `--http-status`, and `--http-path`.
- The `kubectl -n kube-system port-forward service/hubble-relay 4245:80` and `cilium hubble port-forward` approaches are both documented by Cilium.
- Hubble CLI's default output format is `compact`, so the post's "Default human-readable format" and explicit `--output compact` examples are both technically valid.
