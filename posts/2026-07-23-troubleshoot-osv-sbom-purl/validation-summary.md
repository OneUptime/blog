# Validation Summary: Troubleshooting OSV-Scanner SBOM Parsing and Package URL Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OSV-Scanner v2
- OSV-Scalibr
- Software Bills of Materials (SBOMs)
- CycloneDX JSON and XML
- SPDX 2.x JSON, YAML, RDF/XML, and tag:value
- Package URL (purl)
- OSV ecosystems and vulnerability matching
- `jq`

## Sources Consulted
- [OSV-Scanner v2 project source scanning and SBOM filename detection](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner v2 usage and post-extraction flags](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner output formats and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner configuration](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner unscannable-package filtering source](https://github.com/google/osv-scanner/blob/83c195ff667760b6d78e6fdbc11dc11bcd95e677/pkg/osvscanner/filter.go)
- [OSV-Scanner purl-to-package conversion source](https://github.com/google/osv-scanner/blob/83c195ff667760b6d78e6fdbc11dc11bcd95e677/internal/utility/purl/purl_to_package.go)
- [OSV-Scalibr CycloneDX extractor source](https://github.com/google/osv-scalibr/blob/d06937f09bffff694d61cb31bc05c1388bb7b06f/extractor/filesystem/sbom/cdx/cdx.go)
- [OSV-Scalibr SPDX extractor source](https://github.com/google/osv-scalibr/blob/d06937f09bffff694d61cb31bc05c1388bb7b06f/extractor/filesystem/sbom/spdx/spdx.go)
- [OSV-Scalibr Package URL parser source](https://github.com/google/osv-scalibr/blob/d06937f09bffff694d61cb31bc05c1388bb7b06f/purl/purl.go)
- [Package URL specification (ECMA-427)](https://ecma-tc54.github.io/ECMA-427/)
- [Package URL type definitions](https://github.com/package-url/purl-spec/tree/main/types)
- [CycloneDX 1.5 JSON reference](https://cyclonedx.org/docs/1.5/json/)
- [CycloneDX recognized file patterns](https://cyclonedx.org/specification/overview/)
- [SPDX 2.3 conformance and filename conventions](https://spdx.github.io/spdx-spec/v2.3/conformance/)
- [SPDX 2.3 external repository identifiers](https://spdx.github.io/spdx-spec/v2.3/external-repository-identifiers/)

## Issues Found
- The post described `pkg:PyPI/...` as an invalid use of an OSV ecosystem label. Package URL types are case-insensitive, although their canonical form is lowercase, so `PyPI` is non-canonical rather than invalid. Changed the invalid-type example to `pkg:crates.io/...` versus the registered `pkg:cargo/...` type and retained `pkg:pypi/...` as the canonical-casing example.
- The package-count guidance implied that missing versions and nested CycloneDX components would cause components to be absent from `--all-packages` JSON. Current OSV-Scanner retains extracted but unscannable packages in that output, including entries without versions, and current OSV-Scalibr recursively traverses nested CycloneDX `components`. Updated the guidance to distinguish omitted components with absent or invalid purls from listed but unscannable entries with empty ecosystems or versions.

## Review Notes
Review performed against the OSV-Scanner v2 documentation and current OSV-Scanner and OSV-Scalibr source revisions available on 2026-07-23. The CycloneDX 1.5 example remains valid even though CycloneDX 1.7 is current. The CLI flags, JSON paths, SPDX external-reference fields, documented filename patterns, `.gitignore` behavior, output stream behavior, and exit codes were verified as correct.
