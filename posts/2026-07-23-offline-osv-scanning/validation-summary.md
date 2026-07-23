# Validation Summary: Offline OSV Scanning: Keeping Dependency Data Private in Restricted Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OSV-Scanner v2
- OSV.dev vulnerability database exports
- Offline and air-gapped dependency vulnerability scanning
- OSV ecosystem database archives
- Shell-based database staging, transfer verification, and scanning

## Sources Consulted
- [OSV-Scanner offline mode](https://google.github.io/osv-scanner/usage/offline-mode/)
- [OSV-Scanner usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner output formats and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner v1-to-v2 migration guide](https://google.github.io/osv-scanner/migration-guide.html)
- [OSV.dev data sources and downloadable database exports](https://google.github.io/osv.dev/data/)
- [OSV-Scanner v2.4.0 flag implementation](https://github.com/google/osv-scanner/blob/v2.4.0/cmd/osv-scanner/internal/helper/flags.go)
- [OSV-Scanner v2.4.0 local database matcher](https://github.com/google/osv-scanner/blob/v2.4.0/internal/clients/clientimpl/localmatcher/localmatcher.go)
- [OSV-Scanner v2.4.0 local archive retrieval implementation](https://github.com/google/osv-scanner/blob/v2.4.0/internal/clients/clientimpl/localmatcher/zip.go)
- [Public OSV vulnerability bucket](https://osv-vulnerabilities.storage.googleapis.com/)
- [Current OSV ecosystem list](https://osv-vulnerabilities.storage.googleapis.com/ecosystems.txt)

## Issues Found
- The opening description and flag comparison stated the no-download behavior of `--offline` without qualifying the explicit `--download-offline-databases` override. OSV-Scanner v2.4.0 permits those flags together and then downloads or updates the required ecosystem archives. The wording now scopes the no-network and no-update guarantees to scans that do not include the download flag.

## Review Notes
- Reviewed against OSV-Scanner v2.4.0, the current release on 2026-07-23.
- The documented cache environment variable, per-ecosystem `all.zip` layout, fallback cache locations, CLI flags, JSON output command, and manual download URLs are correct.
- Full `--offline` mode disables network-backed features, including documented manifest transitive resolution, while `--offline-vulnerabilities` only makes vulnerability matching local and may leave other features able to make network requests.
- Commit-level matching is documented as unsupported offline. Missing required local databases are reported as errors; automated consumers should preserve and evaluate the scanner's nonzero exit status rather than treating an empty result as a clean scan.
