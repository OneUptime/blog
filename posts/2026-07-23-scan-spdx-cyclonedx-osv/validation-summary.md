# Validation Summary: How to Scan SPDX and CycloneDX SBOMs with OSV-Scanner

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OSV-Scanner v2
- SPDX 2.3 software bills of materials
- CycloneDX software bills of materials
- Package URL (purl)
- JSON, SARIF, HTML, and SPDX scan output
- `jq`

## Sources Consulted

- [OSV-Scanner project source scanning and SBOM support](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner v2 usage and CLI flags](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner v1-to-v2 migration guide](https://google.github.io/osv-scanner/migration-guide.html)
- [OSV-Scanner output formats and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2.4.0 release](https://github.com/google/osv-scanner/releases/tag/v2.4.0)
- [SPDX 2.3 conformance and suggested filenames](https://spdx.github.io/spdx-spec/v2.3/conformance/)
- [SPDX 2.3 package external references](https://spdx.github.io/spdx-spec/v2.3/package-information/#721-external-reference-field)
- [SPDX 2.3 purl external-reference definition](https://spdx.github.io/spdx-spec/v2.3/external-repository-identifiers/#f35-purl)
- [CycloneDX recognized file patterns](https://cyclonedx.org/specification/overview/#recognized-file-patterns)
- [Package URL specification](https://github.com/package-url/purl-spec)

## Issues Found

- The filename-detection introduction said detection follows each specification's conventions. OSV-Scanner's documented SPDX patterns are the operational requirement and do not exactly mirror every suggested SPDX filename, so the sentence now says detection relies on the patterns documented by OSV-Scanner.
- The post treated `--sbom` only as an old v1 flag. OSV-Scanner v2.4.0 still exposes it as a deprecated compatibility option, so the text now states that status and directs readers to `--lockfile` or `-L`.
- The SPDX purl guidance omitted the required external-reference category and referred broadly to SPDX 2.x. It now specifies SPDX 2.3, category `PACKAGE-MANAGER`, and reference type `purl`.
- The inventory section implied that `--all-packages` always returns every extracted package. The official usage documentation states that `PackageOverrides` entries using `ignore` take precedence, so the text now describes non-ignored packages and tells readers to account for the active configuration when reconciling counts.

## Review Notes

The commands were smoke-tested with the official OSV-Scanner v2.4.0 macOS binary and official SPDX and CycloneDX test fixtures. The tests confirmed repeated `-L` support, `--all-packages` JSON structure, source paths with source type `sbom`, the two `jq` selectors, exit code `128` for a recognized SBOM containing no packages, and exit code `1` with SPDX inventory output containing no vulnerability data when vulnerabilities were detected. An unversioned purl was also tested in both formats; OSV-Scanner reported an empty package version and treated the package as unscannable, supporting the post's recommendation to use versioned purls.
