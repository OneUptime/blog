# Validation Summary: Manifest vs. Lockfile Scanning: Why OSV-Scanner Needs Resolved Versions

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OSV-Scanner V2
- OSV vulnerability database and API
- Dependency manifests, lockfiles, and transitive dependency resolution
- deps.dev dependency resolution
- JavaScript package-manager lockfiles
- Rust Cargo lockfiles
- Python requirements and lockfiles
- Maven project manifests
- Go modules
- PHP Composer, Ruby Bundler, and .NET dependency metadata
- CI vulnerability scanning

## Sources Consulted

- [OSV-Scanner: Supported Artifacts and Manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner: Project Source Scanning](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner: Usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner: Output and Return Codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2.3.5 release notes](https://github.com/google/osv-scanner/releases/tag/v2.3.5)
- [OSV-Scanner v2.3.8 release notes](https://github.com/google/osv-scanner/releases/tag/v2.3.8)
- [OSV API documentation](https://google.github.io/osv.dev/api/)
- [deps.dev glossary: dependency resolution](https://docs.deps.dev/glossary/)
- OSV-Scanner v2.3.8 `scan source --help` output and local command execution

## Issues Found

No technical issues found.

## Review Notes

The command examples were checked against the current OSV-Scanner v2.3.8 release. The `--lockfile`, `--format`, `--output-file`, and `--all-packages` combinations were also exercised against a real `package-lock.json`; standard JSON output contained vulnerable packages, while `--all-packages` emitted the complete extracted inventory. The post's version-specific statement about Python `requirements.txt` transitive scanning is consistent with the v2.3.5 release notes.
