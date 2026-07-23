# How to Read OSV Affected Ranges, Introduced Events, and Fixed Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV Schema, Version Ranges, Vulnerability Data, Semantic Versioning

Description: Read OSV range events as an ordered vulnerability timeline and avoid boundary mistakes around introduced, fixed, last-affected, and limit events.

---

OSV affected ranges are timelines of status changes. An `introduced` event turns the vulnerable state on; a `fixed` event turns it off. Reading the events in the ordering defined by the range type is more reliable than translating them into an improvised string such as `>=1.0,<2.0`.

## Identify the range type first

Each range has one of three defined types:

| Type | How values are ordered | Important constraint |
|---|---|---|
| `SEMVER` | SemVer 2.0 precedence | No leading `v`; ranges should not overlap |
| `ECOSYSTEM` | Rules of the affected package ecosystem | Consumer needs ecosystem-aware comparison |
| `GIT` | Commit graph reachability | `repo` is required; commits are full-length hashes |

Never compare `ECOSYSTEM` values lexically. For example, distribution revisions and Maven versions have native ordering rules that are not plain SemVer.

## Read the common fixed range

This range says versions from `1.0.0` through every version before `1.2.3` are affected:

```json
{
  "type": "SEMVER",
  "events": [
    {"introduced": "1.0.0"},
    {"fixed": "1.2.3"}
  ]
}
```

The interval is `[1.0.0, 1.2.3)`: introduced is inclusive; fixed is exclusive. Therefore `1.0.0` is affected and `1.2.3` is not.

The special value `"0"` for `introduced` sorts before all real versions:

```json
{
  "type": "SEMVER",
  "events": [
    {"introduced": "0"},
    {"fixed": "1.2.3"}
  ]
}
```

That means every valid earlier release is affected until the fix. It does not assert that a literal package version `0` exists.

## Alternate vulnerable and unaffected periods

One range can express multiple non-overlapping vulnerable periods:

```json
{
  "type": "SEMVER",
  "events": [
    {"introduced": "1.0.0"},
    {"fixed": "1.0.2"},
    {"introduced": "3.0.0"},
    {"fixed": "3.2.5"}
  ]
}
```

The affected set is `[1.0.0, 1.0.2)` plus `[3.0.0, 3.2.5)`. A version such as `2.4.0` is not affected by this range.

Every event object contains exactly one of `introduced`, `fixed`, `last_affected`, or `limit`. This is invalid:

```json
{"introduced":"1.0.0","fixed":"1.2.3"}
```

There must be at least one `introduced` event in each range.

## Distinguish fixed from last_affected

`fixed` names the first version containing the fix. `last_affected` names the greatest known affected version when a first fixed version is not available.

```json
{
  "events": [
    {"introduced": "0"},
    {"last_affected": "2.1.214"}
  ]
}
```

Here `2.1.214` remains affected, while later versions are treated as unaffected. That can create false negatives if a later vulnerable release appears. For this reason, the OSV specification strongly prefers `fixed` whenever the first fixed version is known.

An event array may contain `fixed` events or `last_affected` events, but not both. Producers should update `modified` when replacing a provisional last-affected ceiling with definitive fix information.

## Understand limit in Git ranges

Without an explicit limit, an implicit `{"limit":"*"}` applies. In a Git graph, a `limit` restricts the commits considered vulnerable to those reachable from the limit. It is not simply another spelling of a fixed commit.

This restriction can be useful for a narrowly scoped branch, but it can exclude vulnerable commits and create false negatives. The schema therefore recommends fixed events where possible. If fixes were cherry-picked into multiple branches, list the relevant fixed commits so descendants of each fix are handled correctly.

## Apply the evaluation model

For linear `SEMVER` and `ECOSYSTEM` ranges, a useful mental model is:

```text
affected = false
for each event at or before the candidate version:
    introduced     -> affected = true
    fixed          -> affected = false
    last_affected  -> affected = false only after that version
```

Then account for any applicable limit. The normative pseudocode in the OSV schema is the authority; this shorthand is for reviewing records.

The package is affected if **any** range matches or the exact version appears in `affected[].versions`. Do not require both a range match and an enumerated-version match.

## Review range data before publishing

For each affected package:

1. Choose `SEMVER` only when the values truly follow SemVer 2.0; otherwise use the defined ecosystem ordering.
2. Verify every introduced and fixed version exists in the package registry when required by the data-quality rules.
3. Ensure introduced sorts before fixed or last-affected.
4. Keep intervals distinct and, for SemVer, non-overlapping.
5. Prefer `fixed` to `last_affected`, and prefer fixes to Git limits.
6. For `GIT`, verify every commit exists in the named repository and model cherry-picked fixes.

Range syntax can be valid JSON while still being operationally wrong. JSON Schema validation catches structure; the OSV linter and source-specific tests help catch missing introduced events, non-distinct ranges, invalid packages, and nonexistent versions.

## Official Documentation

- [OpenSSF OSV schema: affected ranges and events](https://ossf.github.io/osv-schema/)
- [OSV JSON Schema](https://github.com/ossf/osv-schema/blob/main/validation/schema.json)
- [OSV record linter](https://github.com/ossf/osv-schema/tree/main/tools/osv-linter)
- [OSV.dev data-quality requirements](https://google.github.io/osv.dev/data_quality.html)

