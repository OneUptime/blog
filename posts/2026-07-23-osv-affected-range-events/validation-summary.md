# Validation Summary: How to Read OSV Affected Ranges, Introduced Events, and Fixed Events

## Status

validated

## Post Type

Technical reference guide

## Technologies Covered

- Open Source Vulnerability (OSV) schema
- OSV affected version and Git ranges
- Semantic Versioning 2.0.0
- JSON and JSON Schema
- OSV record linter

## Sources Consulted

- [OpenSSF OSV schema specification](https://ossf.github.io/osv-schema/)
- [Official OSV JSON Schema](https://github.com/ossf/osv-schema/blob/main/validation/schema.json)
- [Official OSV record linter documentation](https://github.com/ossf/osv-schema/tree/main/tools/osv-linter)
- [OSV.dev data-quality requirements](https://google.github.io/osv.dev/data_quality.html)
- [Semantic Versioning 2.0.0 specification](https://semver.org/spec/v2.0.0.html)

## Issues Found

- The `last_affected` example omitted the required range `type`. Added `"type": "ECOSYSTEM"` so the snippet is a valid OSV range object and uses the ecosystem ordering from the specification's corresponding example.
- The Git `limit` explanation said only that vulnerable commits are reachable from the limit, which did not make the exclusive boundary clear. Clarified that matching commits precede at least one limit under graph reachability and that the limit commit itself is excluded.
- The publication checklist required registry-existence checks only for introduced and fixed versions. Added non-special `last_affected` versions because OSV.dev's data-quality rules require versions used in `SEMVER` and `ECOSYSTEM` ranges to exist in the package ecosystem; special sentinel values such as introduced `"0"` are not literal releases.

## Review Notes

All remaining JSON examples are syntactically valid range objects and agree with the OSV evaluation pseudocode: `introduced` is inclusive, `fixed` is exclusive, and `last_affected` is inclusive. The referenced documentation URLs and linter path are current. The post contains no terminal commands or executable API examples requiring runtime validation.
