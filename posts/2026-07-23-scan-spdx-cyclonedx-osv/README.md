# How to Scan SPDX and CycloneDX SBOMs with OSV-Scanner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, SBOM, SPDX, CycloneDX, Package URL

Description: Scan recognized SPDX and CycloneDX files, verify their extracted package inventory, and produce machine-readable OSV results.

---

OSV-Scanner v2 can treat SPDX and CycloneDX SBOMs as package inventories. The dependable workflow is: use a recognized filename, include versioned Package URLs, scan the file explicitly, and verify the extracted packages before interpreting vulnerability results.

## Use a recognized SBOM filename

Automatic detection relies on filename patterns documented by OSV-Scanner.

Supported SPDX patterns include:

```text
*.spdx.json
*.spdx
*.spdx.yml
*.spdx.rdf
*.spdx.rdf.xml
```

Supported CycloneDX patterns include:

```text
bom.json
*.cdx.json
bom.xml
*.cdx.xml
```

In OSV-Scanner v2, the old `--sbom` flag remains only as a deprecated compatibility option. Use `--lockfile` or `-L`; the migration guide states that SBOM scanning now relies on the filename.

## Scan one SBOM explicitly

For SPDX JSON:

```bash
osv-scanner scan source \
  --lockfile=/artifacts/service.spdx.json
```

For CycloneDX JSON:

```bash
osv-scanner scan source \
  --lockfile=/artifacts/service.cdx.json
```

`-L` is the short form of `--lockfile` and accepts SBOMs as source-scan inputs. Multiple flags can be supplied when one release consists of several artifacts:

```bash
osv-scanner scan source \
  -L api.spdx.json \
  -L worker.cdx.json \
  --format=json \
  --output-file=osv-results.json
```

The JSON result identifies the source path and source type so findings can be traced back to the correct SBOM.

## Put versioned purls in components

OSV-Scanner documents support for SPDX and CycloneDX SBOMs using Package URLs. A purl encodes the package ecosystem, namespace, name, version, and optional qualifiers.

Examples:

```text
pkg:pypi/jinja2@3.1.4
pkg:npm/%40scope/package@2.3.0
pkg:cargo/serde@1.0.203
pkg:maven/org.example/widget@4.2.1
```

In SPDX 2.3, place the purl in a package external reference with category `PACKAGE-MANAGER` and reference type `purl`. In CycloneDX, use the component's `purl` property.

A component name and version without an ecosystem does not provide enough information for package-native OSV matching. Likewise, an unversioned purl identifies a package but cannot establish whether a version lies in an affected range.

Qualifiers can be significant for operating-system packages. Preserve generator-provided distro and architecture context rather than simplifying every purl to a language-package form.

## Verify the inventory first

Ask OSV-Scanner to return all non-ignored packages, not only vulnerable ones:

```bash
osv-scanner scan source \
  -L service.cdx.json \
  --all-packages \
  --format=json \
  --output-file=inventory-and-vulns.json
```

Then compare counts and identities:

```bash
jq '[.results[].packages[]] | length' inventory-and-vulns.json
jq '.results[].packages[].package' inventory-and-vulns.json
```

`PackageOverrides` entries with the `ignore` action take precedence over `--all-packages`, so account for the active `osv-scanner.toml` when reconciling counts.

Check that expected direct and transitive packages appear with the right versions and ecosystems. An SBOM can be syntactically valid yet omit build-stage dependencies, optional groups, vendored code, or runtime packages.

Exit code `128` means no packages were found. Treat it as an inventory failure, not a clean vulnerability result.

## Choose the result format independently

The input SBOM format does not force the output format. For a CI gate, use JSON or SARIF:

```bash
osv-scanner scan source \
  -L release.spdx.json \
  --format=sarif \
  --output-file=osv-results.sarif
```

For local review:

```bash
osv-scanner scan source -L release.cdx.json --format=html --output-file=report.html
```

OSV-Scanner can also output SPDX or CycloneDX inventories, but note the documented distinction: SPDX output lists packages and does not include vulnerability information, even though the process still exits `1` when vulnerabilities were found. Do not archive an SPDX output file alone as proof that no findings existed.

## Place SBOM scanning in the release pipeline

Generate the SBOM from the same immutable artifact that will be deployed, then scan that exact file. Preserve:

- artifact digest;
- SBOM digest and generator version;
- OSV-Scanner version and arguments;
- result file and exit code;
- scan time and online/offline database mode.

Also run scheduled rescans of stored SBOMs. The artifact may not change, but OSV advisory data and aliases do.

SBOM scanning is only as complete as the inventory. Pair package-count checks with vulnerability matching so an empty or malformed SBOM cannot pass silently.

## Official Documentation

- [OSV-Scanner source and SBOM scanning](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner v2 migration guide](https://google.github.io/osv-scanner/migration-guide.html)
- [OSV-Scanner output formats and return codes](https://google.github.io/osv-scanner/output/)
- [Package URL specification](https://github.com/package-url/purl-spec)
- [SPDX 2.3 file naming conventions](https://spdx.github.io/spdx-spec/v2.3/conformance/)
- [CycloneDX recognized file patterns](https://cyclonedx.org/specification/overview/#recognized-file-patterns)
