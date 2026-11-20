# Validation summary

Reviewed 20 November 2026 using Grafana 13.3.1 defaults and the official Clock 3.2.5 release archive.

## Checks performed

- Downloaded exact official Clock 3.2.5 ZIP and recorded SHA-256
- ZIP CRC integrity check passed; archive paths are relative without traversal
- Executed article Python inspection snippet against downloaded ZIP; documented output matches
- Extracted archive locally and confirmed expected directory layout
- All 52 file hashes listed in manifest match archive contents; PGP signature not verified
- INI example parsed and keys checked against Grafana v13.3.1 defaults
- All bash examples pass bash -n; privileged install and service commands not executed
- Mermaid node and edge references checked structurally
- Social image is 1280x720 and visually inspected; full title readable

Archive SHA-256: `a5210820c4e735d2fb8d546ed9be72a30728a62749fad4e96510d7dbd1b919b9`. Matching file hashes are an integrity check, not authentication of the manifest signer.

## Limitations

- No Grafana runtime available: plugin loading, cryptographic signature verification, UI behavior and offline egress not tested
- No privileged installation, container build, service restart, or backend plugin test
- Mermaid not browser-rendered

## Official sources

- https://grafana.com/grafana/plugins/grafana-clock-panel/
- https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/
- https://grafana.com/developers/plugin-tools/reference/plugin-json
- https://github.com/grafana/grafana/blob/v13.3.1/conf/defaults.ini
- https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#public_key_retrieval_disabled
- https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-sign/
- https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
