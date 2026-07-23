# Validation Summary: What Is OSV? A Practical Guide to the Schema, Database, and Scanner

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenSSF Open Source Vulnerability (OSV) schema
- OSV.dev database, API, and data exports
- Package URL (purl)
- OSV-Scanner v2
- SPDX and CycloneDX SBOMs
- SemVer and Git vulnerability ranges
- `curl` and `jq`

## Sources Consulted

- [OSV FAQ and component overview](https://google.github.io/osv.dev/faq/)
- [OpenSSF OSV schema specification](https://ossf.github.io/osv-schema/)
- [OSV.dev `POST /v1/query` API reference](https://google.github.io/osv.dev/post-v1-query/)
- [OSV.dev API quickstart](https://google.github.io/osv.dev/quickstart/)
- [OSV.dev data sources and downloads](https://google.github.io/osv.dev/data/)
- [OSV-Scanner v2 usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner project source scanning](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner output and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner offline mode](https://google.github.io/osv-scanner/usage/offline-mode/)
- [OSV-Scanner v2.4.0 release](https://github.com/google/osv-scanner/releases/tag/v2.4.0)

## Issues Found

- The record-requirements explanation mentioned only `id` and `modified`. Added that `schema_version` is required for schema versions above `1.0.0`, while omission means consumers assume schema `1.0.0`.
- Several schema-field descriptions were too narrow. Clarified that `affected[].ranges` covers version intervals and Git commit ranges, `affected[].versions` enumerates affected versions rather than necessarily releases, and `severity` can contain severity assessments rather than only scoring vectors.
- The troubleshooting paragraph referred to records in the “selected data source,” which could be confused with OSV-Scanner's `--data-source` option for package-information resolution. Changed it to refer specifically to the vulnerability data used for the scan.
- The reachability explanation used “finding” generically even though OSV-Scanner can produce non-vulnerability findings. Qualified it as a “vulnerability finding.”

## Review Notes

- Both API examples were executed successfully against `https://api.osv.dev/v1/query`: the name/ecosystem query and versioned-purl query returned HTTP 200, while supplying both a versioned purl and top-level `version` returned HTTP 400 as documented.
- The scanner commands and flags were checked against the official documentation and the `scan source --help` output from OSV-Scanner v2.4.0. The repeated `--lockfile` flags, `--recursive`, `--format`, and `--output-file` usages are valid.
- The listed return codes (`0`, `1`, `127`, and `128`) match the official OSV-Scanner v2 output documentation.
- All six links in the post's Official Documentation section returned HTTP 200 at review time.
- Go call analysis is enabled by default in current OSV-Scanner v2 documentation; Rust call analysis remains experimental and may execute dependency build scripts. The post's broader statement that call analysis supports selected languages remains accurate.
