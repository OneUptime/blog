# Validation Summary: How to Download, Mirror, and Incrementally Update the OSV Database

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OSV.dev vulnerability data exports
- Google Cloud Storage (GCS)
- OSV JSON schema
- Incremental synchronization with `modified_id.csv`
- Bash, `curl`, and `unzip`
- Google Cloud CLI (`gcloud storage cp`)

## Sources Consulted
- [OSV.dev data sources and data dumps](https://google.github.io/osv.dev/data/)
- [OSV.dev FAQ](https://google.github.io/osv.dev/faq/)
- [Public OSV vulnerability bucket](https://storage.googleapis.com/osv-vulnerabilities/index.html)
- [Current top-level `modified_id.csv`](https://storage.googleapis.com/osv-vulnerabilities/modified_id.csv)
- [Current ecosystem list](https://storage.googleapis.com/osv-vulnerabilities/ecosystems.txt)
- [OSV exporter implementation](https://github.com/google/osv.dev/blob/c05b41a7d0323c52a6453812578479ecf9849094/go/cmd/exporter/worker.go)
- [OSV exporter output documentation](https://github.com/google/osv.dev/blob/c05b41a7d0323c52a6453812578479ecf9849094/go/cmd/exporter/README.md)
- [OpenSSF OSV schema 1.8.0](https://ossf.github.io/osv-schema/)
- [RFC 3339: Date and Time on the Internet](https://www.rfc-editor.org/rfc/rfc3339)
- [Google Cloud CLI: `gcloud storage cp`](https://cloud.google.com/sdk/gcloud/reference/storage/cp)
- [Google Cloud Storage object metadata](https://cloud.google.com/storage/docs/metadata)
- [curl command-line documentation](https://curl.se/docs/manpage.html)
- Installed `unzip` extended help for the `-t`, `-q`, and `-d` options

## Issues Found
- The initial full-download example would run `unzip` even if `curl` failed. Changed the command list to use `&&`, so extraction occurs only after a successful download.
- The atomic-bootstrap example would continue to extraction after a failed archive integrity test when run as a script. Added `set -euo pipefail` so a failed download or `unzip -t` check stops the sequence.
- The post relied on `modified_id.csv` being strictly reverse chronological and recommended stopping at the first previously processed timestamp. The official documentation describes that ordering, but the current exporter sorts variable-precision RFC 3339 timestamp strings, and the live top-level CSV contained rows that were out of chronological order within the same second during validation. Changed the guidance to parse the complete CSV and select all rows newer than an overlap boundary.
- The update procedure did not explicitly distinguish instant comparison from raw timestamp-string comparison. RFC 3339 only guarantees useful string ordering under additional conditions such as equal fractional-second precision. Changed the procedure to parse timestamps and compare their instants.
- The post referred to a retained modification-index window and described `modified_id.csv` as containing only recent changes. The current exporter rebuilds the CSV from every exported vulnerability. Removed the unsupported retention-window claim and clarified that only the newer-than-watermark slice is partial, while the CSV is not an explicit deletion-event stream.
- The reproducibility audit omitted a stable artifact identifier. Added the GCS object generation or checksum alongside the export URL and retrieval time.

## Review Notes
The documented export paths, ecosystem-prefix behavior, `[EMPTY]` handling, withdrawn-record behavior, OSV `id` and `modified` semantics, alias-enrichment behavior, deletion behavior by source type, HTTP URLs, `gcloud storage cp` syntax, and remaining shell commands were verified as correct. The timestamp-ordering caveat reflects the exporter implementation and live bucket contents on 2026-07-23 and can be revisited if the exporter changes.
