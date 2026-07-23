# How OSV Maps Vulnerabilities to Exact Package Versions and Git Commits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV, Package Versions, Git Commits, Vulnerability Matching, Package URL

Description: Understand how OSV connects an advisory to canonical package versions, enumerated releases, and source-control commits.

---

An advisory is actionable only when a tool can answer, “Does the software I have fall inside the affected set?” OSV answers that question with `affected` entries that bind vulnerability data to package identities, ordered version ranges, concrete versions, or Git history.

## The package identity comes first

An affected package normally has an ecosystem and canonical name, and can also include a Package URL:

```json
{
  "package": {
    "ecosystem": "PyPI",
    "name": "example-widget",
    "purl": "pkg:pypi/example-widget"
  }
}
```

The ecosystem determines how names and versions are interpreted. `PyPI`, `npm`, `Go`, and `Maven` are not interchangeable namespaces. Consumers should use the OSV schema's defined ecosystem values and the registry's canonical package name rather than guessing from a repository name.

A purl provides another unambiguous representation. In API queries, identify the package either with `name` plus `ecosystem`, or with `purl`; do not mix both forms in the same package object.

## Version ranges use an explicit ordering

OSV defines three range types:

- `SEMVER` uses SemVer 2.0 precedence and versions without a leading `v`.
- `ECOSYSTEM` delegates comparison to the named package ecosystem's ordering rules.
- `GIT` uses full-length commit hashes and repository reachability.

A package that was vulnerable from `1.2.0` until the fix in `1.4.3` can be represented as:

```json
{
  "type": "ECOSYSTEM",
  "events": [
    {"introduced": "1.2.0"},
    {"fixed": "1.4.3"}
  ]
}
```

The introduced boundary is included; the fixed boundary is not affected. `ECOSYSTEM` matters for version schemes such as Debian revisions or Maven versions where generic SemVer comparison would be wrong.

## Enumerated versions make exact queries cheap

An `affected` entry can also contain a `versions` array:

```json
{
  "versions": ["1.2.0", "1.2.1", "1.3.0", "1.4.0"]
}
```

The schema recommends this list in general because a consumer can directly test a concrete package release without implementing every ecosystem's ordering. A correctly expressed `SEMVER` range removes the requirement to enumerate versions. A `GIT` range does not, because answering reachability questions requires access to the repository graph.

OSV.dev enriches imported records where it has ecosystem support. Its FAQ documents version enumeration, Git affected-commit enumeration, commit-to-tag mapping, purl computation, and alias computation. The version and commit enumeration processes can populate `affected.versions` even when the authoritative source primarily supplied ranges.

The `modified` timestamp can also change when computed aliases change, not only because the vulnerability prose changed.

## Git ranges model branches, not a numeric line

A Git range names the repository and full commit hashes:

```json
{
  "type": "GIT",
  "repo": "https://github.com/example/widget.git",
  "events": [
    {"introduced": "1111111111111111111111111111111111111111"},
    {"fixed": "9999999999999999999999999999999999999999"}
  ]
}
```

Use real full-length commits from the repository named in `repo`; a hash from an unrelated fork is not equivalent. Git is a graph, so OSV's evaluation is based on ancestry and reachability rather than timestamp or lexical hash order.

Multiple branches require care. If a fix was cherry-picked to several branches, the record needs the relevant fixed events so descendants of those fixes are not reported as vulnerable. The schema notes that missing cherry-picked fixes can produce false positives. A `limit` can constrain reachable commits, but it may produce false negatives and the specification strongly recommends `fixed` where possible.

## Query by package version or commit

For a registry package, query the package coordinate and exact observed version:

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "package":{"ecosystem":"RubyGems","name":"nokogiri"},
    "version":"1.18.2"
  }' | jq .
```

For source code identified by a commit, query the hash:

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{"commit":"6879efc2c1596d11a6a6ad296f80063b558d5e0f"}' | jq .
```

The API also documents Git tag queries using ecosystem `GIT`, the full repository URL as the package name, and the tag as `version`:

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "package":{
      "ecosystem":"GIT",
      "name":"https://github.com/curl/curl.git"
    },
    "version":"8.5.0"
  }' | jq .
```

## Debug a surprising match

When a version is unexpectedly vulnerable or clean, inspect the chain in order:

1. Confirm the extracted ecosystem and normalized package name.
2. Confirm the observed version is a resolved installed version, not a broad manifest constraint.
3. Inspect every `affected` entry for that package; a version is affected if it lies in any range or appears in `versions`.
4. For Git, verify the repository URL, exact commit, ancestry, and all branch-specific fix commits.
5. Check `modified` and the authoritative source link in case the record was recently corrected.

Do not “fix” a match by comparing version strings yourself or removing qualifiers. Preserve the native package identity and let ecosystem-aware matching handle its ordering.

## Official Documentation

- [OpenSSF OSV schema: affected packages, ranges, and evaluation](https://ossf.github.io/osv-schema/)
- [OSV.dev query API](https://google.github.io/osv.dev/post-v1-query/)
- [OSV.dev FAQ: record enrichment](https://google.github.io/osv.dev/faq/)
- [OSV.dev quality requirements for versions and commits](https://google.github.io/osv.dev/data_quality.html)
- [Package URL specification](https://github.com/package-url/purl-spec)

