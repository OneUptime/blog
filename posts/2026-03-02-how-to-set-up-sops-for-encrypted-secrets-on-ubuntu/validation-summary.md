# Validation Summary: How to Set Up SOPS for Encrypted Secrets on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- SOPS (Secrets OPerationS) v3.9.1
- age (modern encryption tool)
- GPG (alternative key backend)
- AWS KMS (cloud key management)
- YAML / JSON / ENV / INI file formats
- GitHub Actions CI/CD
- Ansible
- Ubuntu 20.04 / 22.04

## Sources Consulted
- SOPS official documentation: https://getsops.io/docs/
- SOPS GitHub repository: https://github.com/getsops/sops
- SOPS releases: https://github.com/getsops/sops/releases (confirmed v3.9.1 exists, released Oct 2024)
- SOPS `cmd/sops/main.go` source (verified `--set` flag and `set` subcommand syntax, `updatekeys` flags)
- CNCF Sandbox project page for SOPS: https://www.cncf.io/projects/sops/
- age project documentation: https://github.com/FiloSottile/age
- age-keygen manpage (Ubuntu): https://manpages.ubuntu.com/manpages/jammy/man1/age-keygen.1.html

## Issues Found

1. **Outdated project attribution (fixed).** The post described SOPS as "a tool from Mozilla." Mozilla archived the project; it was donated to the CNCF as a Sandbox project in May 2023 and is now maintained by the `getsops` organization. Updated the intro to reflect the current CNCF/getsops status while preserving the historical Mozilla connection.

2. **Missing `mkdir` before `age-keygen` (fixed).** `age-keygen -o ~/.config/sops/age/keys.txt` fails if the parent directory does not exist, because `age-keygen` does not create parent directories. Added a `mkdir -p ~/.config/sops/age` step before the keygen call.

## Review Notes

- **SOPS version 3.9.1** is a valid release (Oct 2024), but newer versions exist (v3.9.4, v3.10.x, v3.11.0, v3.12.x, v3.13.x as of May 2026). The post correctly tells readers to check the releases page for the latest version, so the example pin is reasonable.
- **`sops --set` syntax** (`sops --set '["database"]["password"] "new-password"' file.yaml`) is correct — the `--set` flag accepts a single string with the JSON path and JSON-encoded value separated by whitespace. SOPS also offers an equivalent `set` subcommand, but the flag form used here is valid.
- **Multi-key age recipients** via a YAML folded block scalar (`>-`) with comma-separated entries is supported by SOPS, which trims whitespace when parsing. A single-line comma-separated string or a YAML list would also work.
- **`sops updatekeys --input-type yaml`** is valid — the flag is defined on the `updatekeys` subcommand in the source, though it's omitted from some docs pages.
- **`--output-type=dotenv`** and **`encrypted_regex`** are both valid and documented features.
- **AWS KMS ARN** with `mrk-` prefix is a valid Multi-Region Key ARN format.
- The `git filter-branch` example in Troubleshooting works but is deprecated by Git in favor of `git filter-repo`; left unchanged as the original command is technically correct and Git still ships it with a warning.
