# Validation Summary: Why a Vulnerability Is Missing from OSV.dev—and How to Report Bad Advisory Data

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OSV.dev vulnerability database and web interface
- OSV.dev REST API (`GET /v1/vulns/{id}` and `POST /v1/query`)
- OpenSSF OSV Schema and OSV.dev import-quality requirements
- Package URLs (purl) and ecosystem-native package identities
- OSV.dev source ingestion, import findings, withdrawn records, and data exports
- `curl` and `jq`

## Sources Consulted
- [OSV.dev FAQ](https://google.github.io/osv.dev/faq/)
- [OSV.dev data sources](https://google.github.io/osv.dev/data/)
- [OSV.dev properties of a high-quality OSV record](https://google.github.io/osv.dev/data_quality.html)
- [OSV.dev GET vulnerability endpoint](https://google.github.io/osv.dev/get-v1-vulns/)
- [OSV.dev query endpoint](https://google.github.io/osv.dev/post-v1-query/)
- [OSV.dev experimental import-findings endpoint](https://google.github.io/osv.dev/get-v1-importfindings/)
- [OSV.dev new-data-source guide](https://google.github.io/osv.dev/data/new)
- [OpenSSF OSV Schema](https://ossf.github.io/osv-schema/)
- [OpenSSF OSV JSON Schema](https://raw.githubusercontent.com/ossf/osv-schema/main/validation/schema.json)
- [OSV.dev issue tracker](https://github.com/google/osv.dev/issues)
- [Live OSV.dev record for GO-2024-2687](https://osv.dev/vulnerability/GO-2024-2687)

## Issues Found
No technical issues found.

## Review Notes
The commands were exercised against the live API. The direct lookup for `GO-2024-2687` returned HTTP 200 and the expected record. The example Go package query returned HTTP 200 with an empty JSON object, which is appropriate for the intentionally nonexistent `example.org/module` identity. A control query confirmed the documented ecosystem case sensitivity: `pypi` returned HTTP 400 with `invalid ecosystem`, while `PyPI` was accepted. All six links in the post's Official Documentation section returned HTTP 200.

The withdrawn-record behavior, source-correction workflow, quality-bar examples, test-instance import-findings guidance, and recommendation to record a withdrawal rationale in `summary` all match the current official documentation. The import-findings endpoint remains explicitly experimental.
