# Validation Summary: Fixing False Positives Caused by Version Ranges in requirements.txt

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OSV-Scanner v2
- OSV-Scalibr
- Python requirements files
- pip dependency installation and `pip freeze`
- deps.dev transitive dependency resolution
- OSV vulnerability records
- `jq` and TOML configuration

## Sources Consulted

- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner project source scanning and explicit parser syntax](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner v2 usage and CLI flags](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner output and JSON format](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner configuration and timed ignores](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner v2.3.5 release notes](https://github.com/google/osv-scanner/releases/tag/v2.3.5)
- [OSV-Scanner v2.3.8 source-scanning command implementation](https://github.com/google/osv-scanner/blob/v2.3.8/cmd/osv-scanner/scan/source/command.go)
- [OSV-Scanner v2.3.8 OSV-Scalibr plugin configuration](https://github.com/google/osv-scanner/blob/v2.3.8/pkg/osvscanner/scan.go)
- [OSV-Scalibr requirements extractor used by OSV-Scanner v2.3.8](https://github.com/google/osv-scalibr/blob/9293bfa4f86f1246c305225bfd53251b083cf964/extractor/filesystem/language/python/requirements/requirements.go)
- [OSV-Scalibr requirements resolver used by OSV-Scanner v2.3.8](https://github.com/google/osv-scalibr/blob/9293bfa4f86f1246c305225bfd53251b083cf964/enricher/transitivedependency/requirements/requirements.go)
- [pip requirements file format](https://pip.pypa.io/en/stable/reference/requirements-file-format/)
- [pip freeze documentation](https://pip.pypa.io/en/stable/cli/pip_freeze/)
- [pip repeatable installs guidance](https://pip.pypa.io/en/stable/topics/repeatable-installs/)
- [Open Source Vulnerability schema](https://ossf.github.io/osv-schema/)

## Issues Found

- The `jq` example was described as showing the source and resolution messages, but it emitted only `package` and `vulnerabilities`. The query now includes the result's `source`, and the text correctly explains that resolution warnings are written to the scan's stderr.
- The deps.dev graph was described too much like a resolution derived from target-environment inputs. The explanation now states that the default resolver uses public ecosystem data and does not reproduce pip's target interpreter, platform, index options, or constraints.
- The constraints guidance implied that reproducing the directory layout would let OSV-Scanner apply all pip inputs. OSV-Scalibr follows `-r` references but does not apply `-c` constraints or pip index options when creating this graph. The post now directs affected builds to generate and scan resolved evidence in the real build context.
- The exception guidance implied that advisory ID, version, evidence, owner, reason, and expiry were all dedicated `osv-scanner.toml` fields. It now names the supported `id`, `reason`, and `ignoreUntil` fields and directs maintainers to place the other evidence in the reason or a linked exception record.
- The OSV-Scalibr documentation link was labeled as both extraction and resolution source but pointed only to the resolver. It now links to both source directories.
- “Exact pins” was changed to “generated snapshot” because `pip freeze` reports the installed environment in requirements format but is not itself a lockfile or resolver result.

## Review Notes

The commands and flags were also exercised with the official OSV-Scanner v2.3.8 binary. `--lockfile`, explicit `requirements.txt:path` parser syntax, `--all-packages`, `--format=json`, and `--output-file` behaved as documented. The supported Python artifact list, v2.3.5 transitive-resolution introduction, OSV JSON fields, OSV affected-version semantics, and timed-ignore configuration were confirmed against the authoritative sources above.
