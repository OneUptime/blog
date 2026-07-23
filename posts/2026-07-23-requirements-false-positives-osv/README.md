# Fixing False Positives Caused by Version Ranges in requirements.txt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSV-Scanner, Python, requirements.txt, Dependency Resolution, False Positives

Description: Replace ambiguous Python requirement ranges with deployment-specific resolved evidence before suppressing an OSV-Scanner finding.

---

A line such as `requests>=2.25,<3` describes an allowed set, not the version installed in production. If a vulnerability affects one part of that set, a result derived from manifest resolution may not describe the deployed environment. The safe fix is to improve the inventory evidence—not to ignore the advisory immediately.

## Confirm which version OSV-Scanner matched

Run a focused JSON scan and include all extracted packages:

```bash
osv-scanner scan source \
  --lockfile=requirements.txt \
  --all-packages \
  --format=json \
  --output-file=osv-python.json
```

Inspect the package, version, source, and any resolution messages:

```bash
jq '.results[]
    | select(.source.path | endswith("requirements.txt"))
    | .packages[]
    | {package, vulnerabilities}' osv-python.json
```

The critical question is not “Is the advisory false?” It is “Does this extracted version equal the version in the artifact or environment I am protecting?”

OSV-Scanner v2 uses OSV-Scalibr for extraction. Version 2.3.5 and later enable deps.dev-based transitive resolution for `requirements.txt` by default. The resulting graph describes what that resolver selected for its current inputs; a range can resolve differently across Python versions, platforms, indexes, dates, and constraints. It is not automatically proof of a particular deployment.

## Reproduce the target environment

Collect versions from the same build inputs and platform used for release. In an isolated environment:

```bash
python -m pip install -r requirements.txt
python -m pip freeze --all > requirements.resolved.txt
```

Then scan the exact pins with an explicit parser type:

```bash
osv-scanner scan source \
  --lockfile='requirements.txt:requirements.resolved.txt'
```

`pip freeze` captures one installed environment; it is not a universal lock solution and does not by itself preserve artifact hashes or all resolver inputs. Generate it in the build pipeline rather than on a developer laptop, and retain the Python version, platform, index configuration, and constraints used.

If the build already uses a supported Python lock format—`pylock.toml`, `uv.lock`, `poetry.lock`, `Pipfile.lock`, or `pdm.lock`—scan that artifact directly instead of reconstructing state from a loose requirements file.

## Separate intent from deployment evidence

Keep both files when they serve different jobs:

```text
requirements.in or requirements.txt   allowed direct dependency policy
pylock.toml / uv.lock / resolved file selected build dependency graph
```

Scan the range-based manifest to observe the resolver's current selection, but do not treat that one graph as an exhaustive test of every future resolution. Independently flag declared ranges that still permit affected releases as a **dependency-policy finding**. Scan the build's resolved artifact to decide whether the current deployment is affected.

This distinction avoids both failure modes:

- dismissing a genuine deployed vulnerability because one developer happened to install a fixed version;
- blocking a deployed fixed version because the manifest also permits an older vulnerable version.

## Include constraints and referenced files

Python requirement files can include other files with `-r`. OSV-Scanner's requirements extractor follows referenced requirement files, but the resolver still needs all inputs used by the real build. Make the scan root and paths reproduce CI's layout.

If production uses a constraints file, private index, environment marker, extra, or platform-specific wheel, preserve that context. A resolution against public defaults may legitimately differ from a private build.

Use `--all-packages --format=json` to verify transitive packages and source paths after every change. Do not assume a successful command means every indirect dependency was represented.

## Decide whether the finding is truly false

Compare four pieces of evidence:

1. **Matched version:** the version in OSV-Scanner's result.
2. **Deployed version:** the version in the build artifact, image, SBOM, or target environment.
3. **Affected range:** the OSV record's ecosystem-specific ranges and enumerated versions.
4. **Artifact identity:** Python version, platform, index, lock or constraints, and build timestamp.

If the deployed version is in the affected set, the result is true even when the top-level manifest permits a fixed version. Update and regenerate the resolved artifact.

If the deployed version is outside the affected set but a manifest-only resolution matched another version, change the security gate to scan deployment-specific resolved data. Retain a policy warning if the declared range still permits the vulnerable release.

If the extracted and deployed versions match but the affected range is wrong, report the advisory data problem to its authoritative source. Do not add a permanent local ignore to compensate for an upstream range error.

## Use exceptions only for residual cases

After verifying inventory and advisory data, an exception may still be appropriate for an unreachable code path or accepted deployment condition. Record the advisory ID, concrete package version, evidence, owner, reason, and an expiry date in `osv-scanner.toml`.

An ignore is not a substitute for resolving ranges. When a future install can choose another version, the exception can hide a real regression while leaving no record of which version was originally reviewed.

## Official Documentation

- [OSV-Scanner supported Python inputs](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner source scanning and explicit parser syntax](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner output and JSON format](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner configuration and timed ignores](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scalibr requirements extraction and resolution source](https://github.com/google/osv-scalibr/tree/main/enricher/transitivedependency/requirements)
- [OSV-Scanner v2.3.5 release notes](https://github.com/google/osv-scanner/releases/tag/v2.3.5)
