# Manifest vs. Lockfile Scanning: Why OSV-Scanner Needs Resolved Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, Lockfile, Dependency Resolution, Vulnerability Matching

Description: Choose scanner inputs that describe the versions actually selected rather than only the versions a project permits.

---

A vulnerability database matches a package identity and a version or commit. A broad dependency declaration such as `library>=2,<4` describes many possible installations, so it cannot by itself prove which vulnerable code is deployed.

That is the essential difference between a manifest and a lockfile:

- A **manifest** expresses direct requirements and allowed ranges.
- A **lockfile** records a resolver's selected versions, usually including transitive dependencies.

OSV-Scanner supports both in selected ecosystems, but useful vulnerability matching still requires the extraction or resolution step to produce concrete package versions.

## See the ambiguity in a range

Suppose a project declares:

```text
example-lib>=2.0,<4.0
```

and an advisory affects versions before `3.2.5`. The manifest permits vulnerable `2.9.0` and fixed `3.2.5`. A scanner cannot honestly label the deployment vulnerable or clean without learning which version the environment selected.

Contrast an exact resolved entry:

```text
example-lib==3.2.6
```

Now the OSV query has a concrete ecosystem, name, and version. The result is still bounded by advisory data, but the inventory question is no longer ambiguous.

## Prefer supported resolved artifacts

Common source inputs with resolved data include:

- `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock` for JavaScript;
- `Cargo.lock` for Rust;
- `poetry.lock`, `Pipfile.lock`, `pdm.lock`, `pylock.toml`, or `uv.lock` for Python;
- `composer.lock` for PHP;
- `Gemfile.lock` for Ruby;
- `packages.lock.json` or built `deps.json` for .NET.

Go's `go.mod` contains selected module versions and is a supported source input even though its ecosystem does not use a traditional lockfile. Always follow the scanner's format-specific documentation rather than classifying by filename alone.

Generate lock artifacts with the project's native package manager, commit them where that ecosystem expects, and regenerate them when manifests change. Do not hand-edit a lockfile merely to silence a finding.

## Understand supported manifest resolution

OSV-Scanner explicitly supports Maven `pom.xml` transitive resolution. It uses the deps.dev resolver by default to compute direct and transitive dependencies; `--no-resolve` disables this behavior. Native Maven Central or private-registry access can be selected with documented data-source and registry flags. OSV-Scanner v2.3.5 and later also enable deps.dev-based transitive scanning for Python `requirements.txt` files.

This means a manifest can be a valid scan target when OSV-Scanner has a supported resolver. It does not mean every manifest format is resolved, or that one resolution enumerates every version the declared ranges could select under different inputs. For example, the source-input table lists JavaScript lockfiles, not a standalone `package.json` dependency range as an equivalent inventory.

Resolution can also make network requests and be affected by repository configuration. Capture resolver errors and avoid treating a partial graph as a clean result.

## Scan explicit lockfiles in CI

Avoid scope drift from unrelated files in a monorepo:

```bash
osv-scanner scan source \
  --lockfile=web/package-lock.json \
  --lockfile=worker/Cargo.lock \
  --format=json \
  --output-file=osv-results.json
```

For a nonstandard filename, specify the parser type:

```bash
osv-scanner scan source \
  --lockfile='requirements.txt:/build/resolved-python.txt'
```

Then inspect package extraction with:

```bash
osv-scanner scan source \
  --all-packages \
  --format=json \
  --lockfile=web/package-lock.json \
  --output-file=osv-packages.json
```

`--all-packages` lets you verify that expected transitive dependencies and versions appear, not just vulnerable ones.

## Match the artifact to the thing being protected

The best scan input depends on the decision:

| Decision | Best evidence |
|---|---|
| Review a dependency update | Updated lockfile in the pull request |
| Assess a built application | Dependency metadata or SBOM from that build |
| Assess a container | Installed packages and artifacts in the image |
| Evaluate the resolver's current selection | Manifest plus a supported resolution under recorded inputs |

A repository lockfile can differ from a deployed image if the build ignores it, installs optional groups differently, or mutates dependencies. Scan both the change-time lockfile and the release artifact when the risk warrants it.

## Fail safely on missing inventory

OSV-Scanner exit code `128` means no packages were found. A wrapper that accepts every code other than `1` can therefore report an empty scan as passing.

Your CI gate should separately verify:

1. the expected manifest or lockfile exists;
2. OSV-Scanner extracted the expected ecosystems and a plausible package count;
3. the scan completed without a general or inventory error;
4. known vulnerability matches were triaged.

Resolved versions turn dependency intent into scan evidence. Without them, a finding may describe only one possible installation, while a clean result may overlook the version actually shipped.

## Official Documentation

- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner source scanning and explicit lockfiles](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner usage and `--no-resolve`](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner output and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2.3.5 release notes](https://github.com/google/osv-scanner/releases/tag/v2.3.5)
