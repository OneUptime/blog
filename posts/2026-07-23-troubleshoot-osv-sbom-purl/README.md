# Troubleshooting OSV-Scanner SBOM Parsing and Package URL Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, SBOM, Package URL, SPDX, CycloneDX, Troubleshooting

Description: Diagnose undetected SBOMs, parse failures, invalid purls, missing versions, and empty OSV-Scanner inventories systematically.

---

SBOM scan failures usually occur at one of three boundaries: file detection, document parsing, or package identity extraction. Test those stages in order instead of treating every empty result as “no vulnerabilities.”

## Start with the filename

OSV-Scanner v2 selects its SPDX or CycloneDX parser from the filename. A generic name such as `inventory.json` is not one of the documented automatic patterns.

Rename it to a recognized form:

```bash
mv inventory.json inventory.cdx.json
```

or:

```bash
mv inventory.json inventory.spdx.json
```

Only rename after confirming the actual document format. Giving CycloneDX content an SPDX suffix merely selects the wrong parser and produces a parse error.

Recognized CycloneDX names are `bom.json`, `*.cdx.json`, `bom.xml`, and `*.cdx.xml`. Recognized SPDX names include `*.spdx.json`, `*.spdx`, `*.spdx.yml`, `*.spdx.rdf`, and `*.spdx.rdf.xml`.

## Scan the file directly

Remove recursive discovery from the test:

```bash
osv-scanner scan source \
  --lockfile=/absolute/path/release.cdx.json \
  --verbosity=info \
  --all-packages \
  --format=json \
  --output-file=debug.json
```

This distinguishes an unrecognized or ignored path from invalid content. In a recursive source scan, remember that `.gitignore` is respected by default; a generated SBOM under an ignored build directory may never be opened.

## Validate the document as its declared format

Check the top-level identity before debugging components.

CycloneDX JSON should declare values such as:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "components": []
}
```

SPDX JSON should contain an SPDX document structure, including `spdxVersion`, `SPDXID`, and `packages` as appropriate for its version.

Use the validator provided or recommended by the SBOM specification and your generator. JSON syntax validation alone cannot detect a document that violates the SPDX or CycloneDX schema.

## Inspect Package URLs

OSV package matching needs an ecosystem-aware identity. OSV-Scanner's official source-scanning documentation highlights SPDX and CycloneDX SBOMs using Package URLs.

A versioned purl has this general structure:

```text
pkg:type/namespace/name@version?qualifiers#subpath
```

Common errors include:

- using an OSV ecosystem label where it differs from the registered purl type, such as `pkg:crates.io/...` instead of `pkg:cargo/...`; purl types are case-insensitive, but their canonical form is lowercase (`pkg:pypi/...`, not `pkg:PyPI/...`);
- omitting the package version;
- failing to percent-encode reserved characters in a namespace;
- putting the full purl in the component `name` but leaving the `purl` property empty;
- emitting a malformed qualifier string;
- using a generic or GitHub purl for a package actually published in npm, PyPI, Maven, or another supported registry.

For CycloneDX:

```json
{
  "type": "library",
  "name": "jinja2",
  "version": "3.1.4",
  "purl": "pkg:pypi/jinja2@3.1.4"
}
```

For SPDX, add an external reference:

```json
{
  "referenceCategory": "PACKAGE-MANAGER",
  "referenceType": "purl",
  "referenceLocator": "pkg:pypi/jinja2@3.1.4"
}
```

Do not manually normalize away distro qualifiers from OS package purls. They can carry release context needed to select the correct ecosystem data.

## Compare extracted and source package counts

With `--all-packages --format=json`, count the extracted entries and list identities:

```bash
jq '[.results[].packages[]] | length' debug.json
jq -r '.results[].packages[].package
       | [.ecosystem, .name, .version] | @tsv' debug.json
```

If the SBOM contains 500 components but only a small set appears, inspect omitted components for absent or invalid purls. OSV-Scalibr recursively traverses nested CycloneDX `components`, so nesting alone should not hide them. Also inspect listed entries with empty ecosystems or versions: `--all-packages` includes extracted but unscannable packages in JSON even though OSV-Scanner filters them from vulnerability queries. Repair the SBOM generator or its configuration; avoid post-processing that cannot be reproduced from the build.

OSV-Scanner may log warnings for unusable component identities while continuing with others. A partial result should not be promoted as complete merely because the process produced JSON.

## Interpret exit codes accurately

The documented return codes separate findings from inventory failure:

- `0`: packages found, no known vulnerabilities or findings;
- `1`: packages found, vulnerabilities or findings present;
- `127`: general error;
- `128`: no packages found.

Capture stderr as a diagnostic artifact. JSON output is sent to stdout while other output goes to stderr, making redirection safe, but a wrapper must retain both streams and the original exit code.

Once extraction is correct, investigate unexpected matches at the OSV record's affected range and authoritative source. Parser fixes and advisory-data fixes are different workstreams.

## Official Documentation

- [OSV-Scanner SBOM scanning and recognized filenames](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner output and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner configuration and ignore behavior](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scalibr CycloneDX extractor](https://github.com/google/osv-scalibr/tree/main/extractor/filesystem/sbom/cdx)
- [OSV-Scalibr SPDX extractor](https://github.com/google/osv-scalibr/tree/main/extractor/filesystem/sbom/spdx)
- [Package URL specification](https://github.com/package-url/purl-spec)

