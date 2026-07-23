# Validation Summary: How to Publish and Validate an Advisory with the OSV Schema

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenSSF OSV Schema 1.8.0
- JSON and JSON Schema
- `check-jsonschema`
- `yajsv`
- OSV Record Linter
- OSV.dev advisory-source onboarding
- Package URL (purl)
- PyPI package names and versions

## Sources Consulted

- [OpenSSF OSV schema specification](https://ossf.github.io/osv-schema/)
- [Official OSV JSON Schema and validator examples](https://github.com/ossf/osv-schema/tree/main/validation)
- [Official OSV record linter documentation and source](https://github.com/ossf/osv-schema/tree/main/tools/osv-linter)
- [OSV.dev properties of a high-quality OSV record](https://google.github.io/osv.dev/data_quality.html)
- [OSV.dev new data-source guide](https://google.github.io/osv.dev/data/new)
- [OSV.dev import-findings API documentation](https://google.github.io/osv.dev/get-v1-importfindings/)
- [Package URL specification and PyPI type definition](https://github.com/package-url/purl-spec)
- [PyPA package-name normalization specification](https://packaging.python.org/en/latest/specifications/name-normalization/)
- [PyPA version-specifier specification](https://packaging.python.org/en/latest/specifications/version-specifiers/)

## Issues Found

- The schema checkout guidance implied that cloning or pinning were alternatives for reproducible validation. An unpinned clone can change as the repository advances. Changed the guidance and clone command to pin the `v1.8.0` release.
- The linter snippet used `cd osv-schema/tools/osv-linter` even though the earlier setup snippet had already changed into `osv-schema`. Following the commands in sequence would therefore target a nonexistent nested path. Changed it to `cd tools/osv-linter`.
- The withdrawal guidance said to set `withdrawn` with a rationale but did not identify the schema field that carries the rationale. The OSV specification says the rationale belongs in `summary`, so the sentence now states that explicitly.

## Review Notes

- The example record passed the official OSV JSON Schema with `check-jsonschema`.
- OSV Schema 1.8.0 is the current release as of the validation date, and its schema permits the `x_` local-database prefix used by the example.
- The linter command, default `ALL` collection, `offline` collection, and their included checks were verified against the current official linter documentation and source.
- The advisory values and reference URLs are intentionally illustrative and must be replaced before publication, as the post already states.
