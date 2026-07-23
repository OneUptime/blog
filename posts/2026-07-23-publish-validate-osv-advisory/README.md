# How to Publish and Validate an Advisory with the OSV Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV Schema, Security Advisory, JSON Schema, OpenSSF, Vulnerability Publishing

Description: Author, structurally validate, lint, and publish a precise OSV advisory through an authoritative database or a new OSV.dev data source.

---

Publishing an OSV advisory is more than producing valid JSON. The record must identify a real package, describe affected versions precisely, use a controlled ID prefix, and live in an authoritative source that OSV.dev can import.

If your ecosystem already has a home advisory database, contribute there first. Create a new OSV.dev data source only when you operate a suitable public advisory feed.

## Draft the smallest useful record

Current OSV schema 1.8.0 permits the `x_` prefix for a local database that is not aggregated by OSV.dev. It is useful while developing a record before a production prefix is reserved:

```json
{
  "schema_version": "1.8.0",
  "id": "x_CUSTOM-0001",
  "published": "2026-07-23T09:00:00Z",
  "modified": "2026-07-23T09:00:00Z",
  "summary": "Example Widget allows an authorization bypass",
  "details": "A missing authorization check affects the admin update path.",
  "aliases": ["CVE-2026-12345"],
  "affected": [
    {
      "package": {
        "ecosystem": "PyPI",
        "name": "example-widget",
        "purl": "pkg:pypi/example-widget"
      },
      "ranges": [
        {
          "type": "ECOSYSTEM",
          "events": [
            {"introduced": "1.4.0"},
            {"fixed": "1.4.7"}
          ]
        }
      ],
      "versions": [
        "1.4.0",
        "1.4.1",
        "1.4.2",
        "1.4.3",
        "1.4.4",
        "1.4.5",
        "1.4.6"
      ]
    }
  ],
  "references": [
    {
      "type": "FIX",
      "url": "https://github.com/example/widget/commit/FULL_COMMIT_HASH"
    },
    {
      "type": "ADVISORY",
      "url": "https://github.com/example/widget/security/advisories/GHSA-EXAMPLE"
    }
  ]
}
```

Replace all illustrative values with verifiable source data. For schema versions above 1.0.0, `schema_version` is required. `id` and `modified` are always required, and timestamps must be RFC 3339 UTC values ending in `Z`.

## Model impact precisely

Before validating syntax, review the semantics:

- Use the canonical registry package name and a defined ecosystem value.
- Use `SEMVER` only for genuine SemVer 2.0 values; otherwise use `ECOSYSTEM`.
- Include at least one `introduced` event in every range.
- Prefer the first `fixed` version over `last_affected`.
- For `GIT`, use a cloneable `repo` URL and full-length commits from that repository.
- Put equivalent IDs in `aliases`, downstream-to-upstream relationships in `upstream`, and weaker associations in `related`.
- Ensure every reference URL resolves at publication time.

The OSV.dev quality bar requires package-level precision. A record can pass JSON Schema and still fail import because the package, versions, commits, or range logic are wrong.

## Validate against the official JSON Schema

Clone the schema repository, then pin the commit or release used for validation so the result is reproducible:

```bash
git clone --branch v1.8.0 --depth 1 https://github.com/ossf/osv-schema.git
cd osv-schema
```

The repository documents multiple compatible validators. With `check-jsonschema`:

```bash
python3 -m pip install check-jsonschema
check-jsonschema \
  --schemafile validation/schema.json \
  /path/to/advisory.json
```

Or with the documented Go validator:

```bash
go run github.com/neilpa/yajsv@latest \
  -s validation/schema.json \
  /path/to/advisory.json
```

Run this in CI for every changed JSON file. Pin the schema commit or release used by the publishing pipeline, and update it deliberately when adopting a new schema version.

## Run the OSV record linter

JSON Schema checks shape and allowed fields. The official linter adds quality checks for affected data, relationship fields, introduced events, distinct ranges, package existence, package versions, and purls.

```bash
cd tools/osv-linter
go run ./cmd/osv record lint /path/to/advisory.json
```

For a network-isolated structural pass:

```bash
go run ./cmd/osv record lint \
  --collection=offline \
  /path/to/advisory.json
```

The `ALL` collection includes registry-backed checks. Do not treat the offline collection as equivalent; it cannot confirm that a package or version exists in its registry.

## Publish through the right route

For an established ecosystem database, follow its contribution process. Many use reviewed pull requests, which preserve provenance and allow maintainers to validate domain-specific details.

For a genuinely new OSV.dev source, the official onboarding flow is:

1. Open an `osv.dev` issue using the new-data-source template.
2. Prepare OSV-format records.
3. Reserve the production ID prefix and, if needed, define the ecosystem in `ossf/osv-schema`.
4. Publish records through a public Git repository (preferred), REST endpoint, or GCS bucket.
5. Add purl and ecosystem support to OSV.dev if introducing a new ecosystem.
6. Add the source to `source_test.yaml` and review test import findings.
7. After successful test ingestion, add it to production `source.yaml`.

The test import-finding endpoint and linter results are part of onboarding; a green local schema check is not production acceptance.

## Maintain the record after publication

Update `modified` whenever the record changes. Add aliases when identifiers are assigned, correct ranges when new branches or fixes are discovered, and set `withdrawn` while putting the rationale in `summary` rather than silently deleting a published ID.

Keep advisory generation deterministic and retain source evidence for every boundary. Consumers use these fields to make automated upgrade decisions, so precision is more valuable than verbose prose.

## Official Documentation

- [OpenSSF OSV schema specification](https://ossf.github.io/osv-schema/)
- [Official OSV JSON Schema and validator examples](https://github.com/ossf/osv-schema/tree/main/validation)
- [Official OSV record linter](https://github.com/ossf/osv-schema/tree/main/tools/osv-linter)
- [OSV.dev data-quality requirements](https://google.github.io/osv.dev/data_quality.html)
- [OSV.dev new data-source guide](https://google.github.io/osv.dev/data/new)
