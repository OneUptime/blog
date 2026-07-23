# Validation Summary: How OSV-Scanner Finds Dependencies in Source Trees, Manifests, and Lockfiles

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OSV-Scanner v2 and v2.4.0
- OSV-Scalibr package extraction plugins
- JavaScript, Python, Rust, Go, Java, PHP, Ruby, .NET, and Swift dependency files
- Git submodules, vendored C/C++ dependencies, and `.gitignore`
- SPDX and CycloneDX SBOMs
- OSV determine-version service and vulnerability data
- JSON scan output and CI security gates

## Sources Consulted

- [OSV-Scanner project source scanning](https://google.github.io/osv-scanner/usage/scan-source)
- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner usage](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner configuration](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner output and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v1-to-v2 migration guide](https://google.github.io/osv-scanner/migration-guide.html)
- [OSV-Scanner v2.4.0 release notes](https://github.com/google/osv-scanner/releases/tag/v2.4.0)
- [OSV-Scanner v2.4.0 source](https://github.com/google/osv-scanner/tree/v2.4.0)

## Issues Found

- The `.gitignore` statement was too broad: ignore rules govern recursive directory discovery, while an explicitly supplied `--lockfile` path is a direct scan target. The text now scopes the behavior to recursive directory scans.
- The instruction to inspect "nearby" `osv-scanner.toml` files was imprecise. Configuration files apply to scanned inputs in the same directory and do not propagate into child directories, so the text now specifies the same-directory scope.

## Review Notes

- All shell commands and flags were checked against OSV-Scanner v2.4.0 CLI help. The documented `scan source` default, `-r`, `-L`, `--no-ignore`, `--include-git-root`, `--all-packages`, `--format=json`, and `--output-file` usages are current and valid.
- The supported-file lists, explicit parser syntax, colon-prefixed path syntax, SBOM filename patterns, Git scanning behavior, and exit code `128` agree with official documentation.
- The v2.4.0 release notes confirm that `.csproj`, NuGet Central Package Management, and Swift `Package.resolved` source extractors became default plugins in that release. The live supported-artifacts table does not yet list those additions, so the post's recommendation to pin the scanner version remains important.
