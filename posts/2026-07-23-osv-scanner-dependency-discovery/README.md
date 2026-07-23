# How OSV-Scanner Finds Dependencies in Source Trees, Manifests, and Lockfiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, Dependency Discovery, Lockfiles, SBOM, Source Scanning

Description: Understand OSV-Scanner v2 package extraction, recursive discovery, ignore behavior, and explicit input selection.

---

OSV-Scanner v2 performs source scanning in two stages: it extracts package identities from recognized inputs, then matches those packages against vulnerability data. Knowing what the extraction stage found is essential—a scan cannot match a dependency that was never inventoried.

## Scan a repository recursively

The explicit v2 command is:

```bash
osv-scanner scan source --recursive /path/to/project
```

`-r` is the short form of `--recursive`. Because source is the default scan mode, this is equivalent to:

```bash
osv-scanner -r /path/to/project
```

Recursive scanning searches subdirectories for recognized lockfiles, supported manifests, recognized SBOM filenames, and relevant Git directories. On a large monorepo, prefer an explicit list of roots or lockfiles when a full tree walk is unnecessarily broad.

## Know the recognized source inputs

The current supported-input table includes, among others:

- JavaScript: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, and `bun.lock`;
- Python: `Pipfile.lock`, `poetry.lock`, `requirements.txt`, `pdm.lock`, `pylock.toml`, and `uv.lock`;
- Rust: `Cargo.lock`;
- Go: `go.mod`;
- Java: Maven `pom.xml` and supported Gradle lock or verification files;
- PHP: `composer.lock`;
- Ruby: `Gemfile.lock` and `gems.locked`;
- .NET: `deps.json`, `packages.config`, and `packages.lock.json`.

OSV-Scanner v2.4.0 also enables `.csproj`, NuGet Central Package Management, and Swift `Package.resolved` source-scanning plugins by default. Earlier v2 releases do not provide that default discovery coverage, so pin and record the scanner version in CI.

Support is format-specific. A similarly named custom file is not automatically parsed as a lockfile unless it matches a discovery rule or you provide its type explicitly.

Review the live supported-artifacts page whenever adding a new ecosystem; the list evolves independently of your repository.

## Select lockfiles explicitly

For stable CI scope, pass each input with `--lockfile` or `-L`:

```bash
osv-scanner scan source \
  --lockfile=frontend/package-lock.json \
  --lockfile=service/Cargo.lock
```

More than one flag is allowed. If an arbitrary filename contains data in a supported format, prefix it with the parser type:

```bash
osv-scanner scan source \
  --lockfile='requirements.txt:/work/generated/python-deps.txt'
```

If the path itself contains a colon and the filename is recognizable, prefix the path with a colon so the scanner infers by filename:

```bash
osv-scanner scan source \
  --lockfile=':/work/my:projects/package-lock.json'
```

These forms prevent a generated artifact from being silently missed because its filename is nonstandard.

## Account for `.gitignore`

OSV-Scanner does not scan files ignored by applicable `.gitignore` rules by default. This avoids build caches and vendored output in normal source scans, but it can also hide a generated lockfile that CI intends to assess.

Use `--no-ignore` only when deliberately including ignored content:

```bash
osv-scanner scan source --recursive --no-ignore .
```

The source-scanning documentation notes a known issue around repository boundaries. For security gates, explicit lockfile arguments are easier to audit than relying on a complicated nested ignore layout.

## Understand Git dependency discovery

OSV-Scanner can inspect Git submodules and vendored C/C++ directories and try to attribute them to dependencies and versions. Submodules retain Git history; initialize them before scanning:

```bash
git submodule update --init --recursive
osv-scanner scan source --recursive .
```

Vendored directories do not retain history. OSV-Scanner may use OSV's determine-version service to estimate a corresponding upstream version and commit. This coverage depends on commit-level OSV data and successful attribution; it is not a complete proof about all vendored C/C++ code.

Root Git repositories are skipped by default in v2 because the common source-scan target is the project containing dependencies. Use `--include-git-root` when the root repository itself should be evaluated as a Git target.

## Treat SBOM discovery as filename-sensitive

Recognized SPDX names include `*.spdx.json`, `*.spdx`, `*.spdx.yml`, `*.spdx.rdf`, and `*.spdx.rdf.xml`. Recognized CycloneDX names include `bom.json`, `*.cdx.json`, `bom.xml`, and `*.cdx.xml`.

An SBOM named `inventory.json` can be valid JSON yet escape automatic discovery. Rename it according to the specification or provide it explicitly with `-L` and a recognized filename.

## Verify extraction before trusting the gate

Use machine-readable output and request all extracted packages when diagnosing scope:

```bash
osv-scanner scan source \
  --recursive \
  --all-packages \
  --format=json \
  --output-file=osv-inventory.json \
  .
```

`--all-packages` is documented for JSON output. Review source paths, package ecosystems, names, and versions. Package overrides with `ignore` take precedence, so also inspect nearby `osv-scanner.toml` files.

Exit code `128` means no packages were found. Do not convert it to a successful clean scan. A valid security gate proves both that the expected inputs were inventoried and that the resulting package identities had no known matches.

## Official Documentation

- [OSV-Scanner source scanning](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner configuration](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner output and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2.4.0 release notes](https://github.com/google/osv-scanner/releases/tag/v2.4.0)
