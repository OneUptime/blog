# Validation Summary: How OSV Maps Vulnerabilities to Exact Package Versions and Git Commits

## Status

validated

## Post Type

Technical reference and implementation guide

## Technologies Covered

- OpenSSF OSV schema
- OSV.dev query API
- Package URL (purl)
- Semantic Versioning 2.0.0
- Ecosystem-specific package version ordering
- Git commit ranges, ancestry, reachability, and tags
- `curl` and `jq`

## Sources Consulted

- [OpenSSF OSV schema](https://ossf.github.io/osv-schema/)
- [OSV.dev POST /v1/query API](https://google.github.io/osv.dev/post-v1-query/)
- [OSV.dev FAQ: imported-record enrichment](https://google.github.io/osv.dev/faq/)
- [OSV.dev properties of a high-quality record](https://google.github.io/osv.dev/data_quality.html)
- [Package URL specification](https://github.com/package-url/purl-spec)
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)
- [Debian Policy Manual: package versions and comparison](https://www.debian.org/doc/debian-policy/ch-controlfields.html#version)
- [Apache Maven `ComparableVersion` API](https://maven.apache.org/ref/3-LATEST/apidocs/org/apache/maven/artifact/versioning/ComparableVersion.html)
- [Live OSV.dev query endpoint](https://api.osv.dev/v1/query)

## Issues Found

- The enrichment paragraph could imply that every listed enrichment process populates `affected.versions`. Clarified that version and Git commit enumeration populate that field; purl and alias computation do not.
- The `modified` sentence attributed timestamp changes to enrichment generally. Made it precise by stating the documented behavior: changes to computed aliases update `modified`.

## Review Notes

- Verified that `SEMVER`, `ECOSYSTEM`, and `GIT` are the defined OSV range types and that their ordering and enumeration statements match the current OSV schema.
- Verified the inclusive `introduced` boundary, exclusive `fixed` boundary, multi-branch cherry-picked-fix requirements, and the false-negative tradeoff of `limit`.
- Verified the package identity and Package URL rules for both OSV records and API query package objects.
- Verified OSV.dev's documented version enumeration, Git affected-commit enumeration, commit-to-tag mapping, purl computation, alias computation, and alias-related `modified` update behavior.
- Executed all three `curl` examples against the live API on 2026-07-23; each returned HTTP 200 with valid vulnerability results.
- Confirmed that the external documentation links resolve to the intended authoritative resources.
