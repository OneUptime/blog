# Validation Summary: How to Configure Trivy in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy (Aqua Security vulnerability scanner)
- GitHub Actions (aquasecurity/trivy-action, docker/build-push-action, github/codeql-action/upload-sarif, actions/cache)
- GitLab CI (container_scanning / dependency_scanning reports, `aquasec/trivy` image, gitlab.tpl template)
- Jenkins (declarative pipeline, shared libraries, `docker run` invocation pattern)
- Azure DevOps Pipelines (Docker@2, PublishBuildArtifacts@1, apt-based Trivy install)
- SARIF, CycloneDX, SPDX (output formats and SBOMs)
- Rego / OPA (ignore policies)
- Mermaid (diagrams)

## Sources Consulted
- Trivy filtering & ignore file docs: https://trivy.dev/latest/docs/configuration/filtering/
- Trivy config-file reference: https://trivy.dev/latest/docs/references/configuration/config-file/
- Trivy `image` CLI reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- aquasecurity/trivy-action README: https://github.com/aquasecurity/trivy-action
- Trivy `contrib/` templates directory: https://github.com/aquasecurity/trivy/tree/main/contrib
- GitLab Secure / container scanning report format: https://docs.gitlab.com/ee/user/application_security/container_scanning/

## Issues Found
1. **`trivy.yaml` – `severity` was nested under `vulnerability`.** Per the official config-file reference, `severity` is a top-level field that applies across scanners. Moved `severity:` to top level and removed the redundant `misconfiguration.severity` block (no such nested key exists in the schema).
2. **YAML ignore file used wrong filename and field name.** The post referenced `.trivy-policy.yaml` with an `expiry:` field. Trivy's actual file is `.trivyignore.yaml`, the date field is `expired_at` (underscore), and it must be loaded with `--ignorefile`. Renamed the file, switched `expiry:` → `expired_at:`, and added a one-line note about `--ignorefile`.
3. **Misconfiguration entry used a non-existent `avd-id:` field.** Removed it; the AVD ID is supplied directly as `id:` (e.g. `id: AVD-DS-0002`).
4. **Misleading comment for `--ignore-policy`.** The post claimed the flag is used to "Scan only specific layers." Per Trivy docs, `--ignore-policy` evaluates a Rego file against each vulnerability — it has nothing to do with layer selection. Updated the comment and the example filename.

## Review Notes
- The post pins `aquasecurity/trivy-action@master`. Pinning to a tagged release (e.g. `@0.24.0`) or commit SHA is generally safer for reproducible builds and supply-chain hardening. Did not change — author's call.
- `trivy fs --skip-files "**/*.tar.gz,**/*.zip"` works (the `--skip-files` flag accepts comma-separated globs), but Trivy also accepts the flag repeated, which is sometimes clearer.
- The Jenkins shared library snippet calls `sh trivyCmd` with an unquoted string built via `+=`. Functionally fine, but it does not escape any user-supplied values — worth noting if `imageRef` ever comes from untrusted input.
- The `trivy.yaml` example does not exhaustively document every field; readers should consult the official config-file reference for the full schema (e.g. `scan.parallel`, `scan.offline`, `secret.config`).
- Trivy's vulnerability DB is published to both `mirror.gcr.io/aquasec/trivy-db:2` and `ghcr.io/aquasecurity/trivy-db:2`; teams running in air-gapped environments may want to mirror one of these via `--db-repository`.
