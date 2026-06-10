# Validation Summary: How to Build Trivy License Scanning

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Trivy (Aqua Security vulnerability and license scanner)
- SPDX (Software Package Data Exchange) license identifiers
- GitHub Actions (aquasecurity/trivy-action, github/codeql-action/upload-sarif)
- SARIF output format
- CycloneDX and SPDX SBOM formats
- jq (JSON processor)
- YAML configuration

## Sources Consulted
- Trivy License Scanning documentation: https://trivy.dev/latest/docs/scanner/license/
- Trivy configuration file reference: https://trivy.dev/latest/docs/references/configuration/config-file/
- Trivy filesystem command reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_filesystem/
- aquasecurity/trivy-action GitHub repository (action inputs): https://github.com/aquasecurity/trivy-action
- SPDX License List (for verifying license identifiers): https://spdx.org/licenses/

## Issues Found

1. **Invented `--license-policy` CLI flag.** The post repeatedly used `trivy fs --license-policy <file>`. This flag does not exist in Trivy. Fixed by replacing it with the actual `--config` flag (which is how Trivy loads a `trivy.yaml` configuration file). Updated three command invocations in the "Running Scans with Policy Enforcement" section.

2. **Invented YAML policy file schema (`allowlist` / `denylist` / `flaglist` with nested `licenses` and `packages`).** The "Creating a License Policy File" section presented a YAML schema that Trivy does not understand. Trivy's actual `trivy.yaml` uses a `license:` section with the categories `forbidden`, `restricted`, `reciprocal`, `notice`, `permissive`, `unencumbered`, and `ignored`, plus `full` and `confidenceLevel`. Rewrote the example to use the real schema, mapping the original intent (deny list / flag list / allow list) to the corresponding Trivy categories. Removed `packages:` entries (no such feature exists in the license config).

3. **`--severity HIGH` example was misleading.** The original example said "Only fail on high-severity (denied) licenses" — but in Trivy's classification, `forbidden` licenses map to CRITICAL, not HIGH. Updated the example to `--severity CRITICAL,HIGH` so that forbidden and restricted licenses are both caught.

4. **"Handling Unknown Licenses" allowlist example used the invented schema.** Rewrote the example to use Trivy's actual `license.ignored:` list and added an equivalent `--ignored-licenses` CLI example for inline use.

5. **GitHub Action `trivy-config` path updated** from `trivy-license-policy.yaml` to `trivy.yaml` so it matches Trivy's expected config filename (the `trivy-config` input is described as "Path to trivy.yaml config"). Also updated the corresponding reference in best practice #2.

## Review Notes

- The SPDX identifier table is accurate. All identifiers shown (`MIT`, `Apache-2.0`, `BSD-3-Clause`, `GPL-3.0-only`, `AGPL-3.0-only`, `LGPL-2.1-only`, `MPL-2.0`, `CDDL-1.0`, `Unlicense`, `BUSL-1.1`, `SSPL-1.0`, `CC0-1.0`, `0BSD`, `ISC`, `EPL-2.0`) are valid SPDX license identifiers.
- The `aquasecurity/trivy-action@master` usage is conventional, though pinning to a specific release tag is generally considered better practice for CI/CD reproducibility. Left as-is since this is a stylistic preference, not a correctness issue.
- `github/codeql-action/upload-sarif@v3` is the current correct version (v3 is the GA stable release).
- The Trivy classification system maps `forbidden` → CRITICAL, `restricted` → HIGH, `reciprocal` → MEDIUM, `notice`/`permissive`/`unencumbered` → LOW. The post's risk-level table and the policy file's category comments are aligned with this mapping after the fixes.
- The `jq` filter `'.Results[].Licenses[] | select(.Name == "Unknown" or .Name == "")'` matches Trivy's JSON output structure for license findings (top-level `Results` array, each result has a `Licenses` array with `Name` fields).
- The CycloneDX and SPDX (`--format cyclonedx`, `--format spdx-json`) output formats are correctly named and supported by Trivy.
- The `@contrib/html.tpl` template path is a built-in template shipped with Trivy and is the documented way to produce HTML reports.
- Future caveat: Trivy's license categorization is sourced from the Google License Classification list, so unusual or newer SPDX identifiers may land in `unknown` until the classification is updated. Teams relying on this should pin a Trivy version and review classifications when upgrading.
