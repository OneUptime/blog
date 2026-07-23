# Why a Vulnerability Is Missing from OSV.dev—and How to Report Bad Advisory Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV.dev, Data Quality, Vulnerability Advisories, OSV API

Description: Diagnose missing or incorrect OSV.dev results and route corrections to the authoritative advisory source.

---

A missing OSV.dev result can mean several different things: the source is not imported, the record failed quality checks, the query used the wrong package identity, the record was withdrawn, or the advisory simply has not been published. Start by separating “the ID page is missing” from “my package query did not match.”

## Check the ID directly

If you know the advisory ID, request it without involving package matching:

```bash
curl -i https://api.osv.dev/v1/vulns/GO-2024-2687
```

A successful GET proves that OSV.dev has a record under that exact ID. Package queries are a separate path:

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "package":{"ecosystem":"Go","name":"example.org/module"},
    "version":"v1.2.3"
  }' | jq .
```

API field names and values are case-sensitive. `PyPI` and `pypi` are not the same ecosystem value. Confirm the canonical registry package name, ecosystem, exact resolved version, and any purl qualifiers before concluding that the record is absent.

## Inspect the authoritative source

OSV.dev aggregates many databases and maintains converters for several other feeds. Its data-source page is the current inventory of covered sources and ecosystems. A public CVE is not automatically guaranteed to have package-native data for every open-source ecosystem.

Search the likely home database:

- GitHub-originated or GitHub-reviewed advisory: `github/advisory-database`;
- Go: `golang/vulndb`;
- PyPI/Python: the listed PyPA or PSF advisory source;
- Rust: RustSec;
- OSS-Fuzz issue: `google/oss-fuzz-vulns`.

If the source does not publish the record, OSV.dev cannot import it. Report it through the source's disclosure or advisory process rather than inventing a downstream OSV entry.

## Understand import quality failures

OSV.dev documents a minimum quality bar. A record must be valid against the OSV JSON Schema and precise enough for automated package-level decisions. Checks include canonical package identities, valid ecosystem values, real versions or commits, introduced boundaries, and coherent ranges.

The OSV FAQ states that an expected record may be unavailable because it failed import due to a quality issue. The vulnerability's 404 page can indicate this condition. New source owners can inspect test-instance import findings through OSV.dev's documented experimental import-findings endpoint.

Typical causes include:

- an unrecognized ID prefix or ecosystem;
- a package name that does not exist in the claimed registry;
- an invalid purl;
- missing `introduced` events;
- nonexistent or reversed range boundaries;
- Git commits that do not exist in the named repository;
- malformed timestamps or unrecognized fields.

Fix the source record and let it re-import. Repeatedly querying the production API does not bypass failed quality checks.

## Account for withdrawn records

Withdrawn records remain addressable by ID but are intentionally excluded from POST query responses, the main list, and search results. They remain visible on their vulnerability page and in data exports with the `withdrawn` field.

Therefore this combination is possible:

```text
GET /v1/vulns/ID       -> record returned with withdrawn timestamp
POST /v1/query         -> record absent from package result
```

Check the record before filing a missing-data report. The withdrawal rationale should appear in its summary.

## Report incorrect data at the source

For a record that exists but has a wrong package, range, alias, severity, or reference:

1. Open the vulnerability page on OSV.dev.
2. Follow the human-friendly **Source** link to the authoritative record.
3. When present, use **Import Source** to locate the exact source file.
4. Follow that database's contribution process—often a pull request or issue.
5. Include the OSV ID, package ecosystem and name, disputed versions, authoritative release or fix evidence, and the proposed correction.

OSV.dev explicitly prefers correction at the home database. This avoids a downstream patch being overwritten by the next import and gets the fix to every consumer of the source.

If the source does not resolve a well-evidenced problem, OSV.dev's FAQ directs users to file an `osv.dev` issue tagged `data quality`. Link the upstream report and explain why the source response was insufficient.

## Verify the correction

After the source merges a fix, compare the record's `modified` timestamp and refetch it:

```bash
curl -sS https://api.osv.dev/v1/vulns/ADVISORY-ID \
  | jq '{id, modified, withdrawn, aliases, affected}'
```

Then repeat the exact package query that originally failed. Preserve both requests in the issue so reviewers can distinguish an ingestion problem from a package-matching problem.

A missing result is not evidence that the dependency is safe. Until the source and import status are clear, track the issue manually using the upstream advisory and affected-version evidence.

## Official Documentation

- [OSV.dev FAQ: missing and incorrect records](https://google.github.io/osv.dev/faq/)
- [OSV.dev data sources](https://google.github.io/osv.dev/data/)
- [OSV.dev data-quality requirements](https://google.github.io/osv.dev/data_quality.html)
- [OSV.dev GET vulnerability endpoint](https://google.github.io/osv.dev/get-v1-vulns/)
- [OSV.dev query endpoint](https://google.github.io/osv.dev/post-v1-query/)
- [OSV.dev issue tracker](https://github.com/google/osv.dev/issues)

