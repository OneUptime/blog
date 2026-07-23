# What Is OSV? A Practical Guide to the Schema, Database, and Scanner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV, Vulnerability Management, OpenSSF, OSV-Scanner, Software Supply Chain

Description: Learn how the OSV schema, OSV.dev database, API, and OSV-Scanner fit together in a practical dependency-vulnerability workflow.

---

“OSV” is often used for several related things. Keeping them separate makes the system much easier to use:

- The **Open Source Vulnerability schema** is a machine-readable format maintained under OpenSSF. It describes vulnerability identities, affected packages, precise version or commit ranges, references, severity, and lifecycle timestamps.
- **OSV.dev** is infrastructure that imports records from many authoritative databases, enriches and indexes them, and exposes a website, API, and downloadable data dumps.
- **OSV-Scanner** is the officially supported client that extracts packages from source projects, lockfiles, SBOMs, and container images, then matches that inventory against vulnerability data.

The schema is the contract, OSV.dev is the aggregated data service, and OSV-Scanner is a consumer. None of them is a synonym for CVE, and the scanner does not discover previously unknown vulnerabilities by testing code.

## Start with one package query

The smallest useful OSV workflow asks whether a known package version appears in any imported advisory. Package names and ecosystem values are case-sensitive, so use the canonical spelling from the package registry and OSV ecosystem list.

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{
    "package": {"ecosystem": "PyPI", "name": "jinja2"},
    "version": "3.1.4"
  }' | jq .
```

The response contains complete OSV vulnerability records under `vulns`. A record can carry its own ID plus `aliases` such as CVE and GHSA identifiers. Treat aliased records as descriptions of the same underlying vulnerability, not as independent findings.

You can also identify a package with a Package URL (purl):

```bash
curl -sS https://api.osv.dev/v1/query \
  -H 'Content-Type: application/json' \
  -d '{"package":{"purl":"pkg:pypi/jinja2@3.1.4"}}' | jq .
```

Do not provide a versioned purl and the top-level `version` field together; the API documents that combination as a `400 Bad Request`.

## Read the important parts of a record

Every OSV record requires `id` and `modified`. For schema versions above `1.0.0`, `schema_version` is also required; if it is omitted, consumers assume `1.0.0`. Most useful records also contain:

| Field | Operational question it answers |
|---|---|
| `aliases`, `related`, `upstream` | How does this record relate to other identifiers? |
| `summary`, `details`, `references` | What happened, and where is the authoritative context? |
| `affected[].package` | Which canonical package and ecosystem are involved? |
| `affected[].ranges` | Which version intervals or Git commit ranges are affected? |
| `affected[].versions` | Which concrete affected versions were enumerated? |
| `severity` | Which supplied severity assessments are available? |
| `withdrawn` | Has the publisher withdrawn the record? |

For a simple fixed SemVer range, the events can look like this:

```json
{
  "type": "SEMVER",
  "events": [
    {"introduced": "0"},
    {"fixed": "2.4.7"}
  ]
}
```

`introduced: "0"` is a defined sentinel that sorts before every real version. The vulnerable interval begins inclusively and ends before the fixed version. OSV also supports ecosystem-specific ordering and full-length Git commit ranges, which is why consumers should not apply generic lexical string comparison.

## Scan a real project

With OSV-Scanner v2 installed, recursively scan a repository with:

```bash
osv-scanner scan source --recursive .
```

The source scanner looks for supported manifests and lockfiles, recognized SPDX and CycloneDX SBOM filenames, and relevant Git directories. It respects `.gitignore` by default. Use explicit inputs in CI when you want a stable scope:

```bash
osv-scanner scan source \
  --lockfile=package-lock.json \
  --lockfile=services/api/Cargo.lock \
  --format=json \
  --output-file=osv-results.json
```

OSV-Scanner separates package extraction from vulnerability matching. This distinction helps with troubleshooting: “no packages found” is an inventory problem, while a clean scan means extracted packages did not match known records in the vulnerability data used for the scan.

The documented exit codes are designed for automation:

- `0`: packages were found and no known vulnerabilities or findings matched;
- `1`: packages were found and vulnerabilities or findings matched;
- `127`: a general error;
- `128`: no packages were found.

Do not flatten `1`, `127`, and `128` into the same “failed security gate” message. A finding requires triage; an execution or inventory failure requires repairing the scan.

## Know what the result does and does not prove

A vulnerability finding means that the extracted identity—package, ecosystem, and version or commit—matched affected data in an imported advisory. It does not prove that an attacker can reach the vulnerable function in your deployment. OSV-Scanner has call-analysis support for selected languages, but absence of a reachability result is not evidence of safety.

A clean result is also bounded. It means no match was found in the data available to the scan. It does not prove that the software has no vulnerability, that every upstream advisory has been published, or that every package was successfully extracted. Preserve the scanner version, target files, output, timestamp, and data mode so the result can be reproduced.

## Build a reliable operating loop

A useful OSV practice has four separate controls:

1. Generate reproducible dependency identities through lockfiles, SBOMs, or image inventories.
2. Scan changes in pull requests and run scheduled scans because advisory data can change without a code change.
3. Triage alias groups, affected ranges, reachability, exploit conditions, and available fixes.
4. Time-bound any accepted risk and rescan after the exception expires.

Use the individual advisory's `Source` or import-source link when the data looks wrong. OSV.dev is an aggregator, so the home database is normally the right place to correct package names, ranges, or references.

## Official Documentation

- [OSV FAQ and component overview](https://google.github.io/osv.dev/faq/)
- [OpenSSF OSV schema specification](https://ossf.github.io/osv-schema/)
- [OSV.dev API documentation](https://google.github.io/osv.dev/api/)
- [OSV.dev data sources and downloads](https://google.github.io/osv.dev/data/)
- [OSV-Scanner usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner source scanning](https://google.github.io/osv-scanner/usage/scan-source)
