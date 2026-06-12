# Validation Summary: How to Use Trivy for Container Image Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy (Aqua Security vulnerability scanner)
- Docker / Container images
- GitHub Actions (aquasecurity/trivy-action, github/codeql-action/upload-sarif)
- GitLab CI (container scanning report integration)
- Jenkins pipelines (declarative pipeline)
- AWS ECR, Google Container Registry / Artifact Registry, Azure Container Registry
- SARIF, CycloneDX, SPDX output formats
- APT, YUM, Homebrew package management
- .trivyignore and .trivyignore.yaml ignore files
- trivy.yaml configuration

## Sources Consulted
- Official Trivy installation docs: https://trivy.dev/latest/docs/getting-started/installation/
- Official Trivy filtering / ignore docs: https://trivy.dev/latest/docs/configuration/filtering/
- Official Trivy private registry docs: https://trivy.dev/latest/docs/advanced/private-registries/
- Official Trivy config file reference: https://trivy.dev/latest/docs/references/configuration/config-file/

## Issues Found

1. **Deprecated `apt-key add` usage in Debian/Ubuntu install instructions.**
   The original snippet used `sudo apt-key add -` plus `$(lsb_release -sc)` as
   the repository codename. `apt-key` is deprecated in modern Debian/Ubuntu, and
   the official Trivy repo uses the codename `generic` rather than per-distro
   codenames. Replaced with the current recommended `gpg --dearmor` + keyring
   in `/usr/share/keyrings/trivy.gpg` and `[signed-by=...]` syntax, matching
   the official Trivy docs.

2. **Wrong flag for YAML ignore file.**
   The post showed `trivy image --config .trivy.yaml my-app:latest` to consume
   the YAML-format ignore file. `--config` points at a general Trivy config
   file, not an ignore file; the YAML ignore file must be passed via
   `--ignorefile` per the official docs. Also renamed the example file from
   `.trivy.yaml` to `.trivyignore.yaml` for clarity and consistency with the
   docs.

3. **Incorrect Trivy config YAML schema for registry credentials.**
   The original example used a non-existent `registry.credentials` array of
   `{registry, username, password, token}` objects stored at
   `~/.trivy/config.yaml`. The actual schema (per the Trivy config-file
   reference) has `registry.username`, `registry.password`, and
   `registry.token` as direct fields (arrays for username/password, string for
   token), and Trivy reads `trivy.yaml` from the current working directory by
   default — not from `~/.trivy/`. Updated the example to the real schema and
   noted that `trivy registry login` is the recommended approach for storing
   per-registry credential pairs.

4. **Missing leading slash on Jenkins template path.**
   The Jenkins pipeline used `--template "@contrib/html.tpl"` while the Trivy
   container image ships its contrib templates under `/contrib/`. The GitLab
   example correctly used `@/contrib/gitlab.tpl`. Updated Jenkins to
   `@/contrib/html.tpl` for consistency and correctness.

## Review Notes

- The `gpgcheck=0` in the RHEL/CentOS YUM repo snippet is technically valid but
  weaker than the official guidance, which enables GPG checking. Left as-is
  since it's a defensible simplification commonly seen in tutorials and is not
  factually wrong.
- The post says ignore-file expiration uses the `CVE-ID exp:YYYY-MM-DD` syntax
  in `.trivyignore` and is available in "Trivy 0.50+". This matches the
  documented behavior.
- The example CVE IDs (CVE-2024-XXXXX, CVE-2024-12345, etc.) are intentionally
  illustrative; left untouched.
- Format values for output (`json`, `sarif`, `template`, `cyclonedx`,
  `spdx-json`) and the `--ignore-unfixed`, `--severity`, `--exit-code`,
  `--download-db-only`, `TRIVY_USERNAME`/`TRIVY_PASSWORD` flags/env vars all
  match the official CLI surface.
- The GitHub Actions step uses `aquasecurity/trivy-action@master`; pinning to a
  specific tag would be a stylistic improvement but is not technically
  incorrect.
