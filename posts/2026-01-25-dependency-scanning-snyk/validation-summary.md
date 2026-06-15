# Validation Summary: How to Implement Dependency Scanning with Snyk

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Snyk CLI
- Snyk Open Source
- Snyk Container
- Snyk Code
- Snyk Infrastructure as Code
- GitHub Actions
- GitLab CI
- Docker
- npm, Pip, Pipenv, Poetry, Maven, Gradle, Go Modules
- SARIF reporting
- Snyk policy files

## Sources Consulted
- Snyk CLI install documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/install-the-snyk-cli
- Snyk CLI authentication documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/authenticate-to-use-the-cli
- Snyk CLI `test` command documentation and current CLI help (`snyk` 1.1305.1): https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/test
- Snyk CLI `monitor` command documentation and current CLI help: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/monitor
- Snyk CLI `container test` documentation and current CLI help: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/container-test
- Snyk CLI `container monitor` documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/container-monitor
- Snyk GitHub Actions documentation: https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities
- Snyk Node GitHub Action documentation: https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities/snyk-node-action
- Snyk Docker GitHub Action documentation: https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities/snyk-docker-action
- Snyk Python support documentation: https://docs.snyk.io/supported-languages/supported-languages-list/python
- Snyk CLI support for Python: https://docs.snyk.io/supported-languages/supported-languages-list/python/snyk-cli-for-python
- Snyk Go support documentation: https://docs.snyk.io/supported-languages/supported-languages-list/go
- Snyk Java and Kotlin support documentation: https://docs.snyk.io/supported-languages/supported-languages-list/java-and-kotlin
- Snyk `.snyk` policy file documentation: https://docs.snyk.io/scan-fix-and-prevent/prevent/policies/the-.snyk-file
- Snyk `@snyk/protect` documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/scan-and-maintain-projects-using-the-cli/snyk-protect-package
- Docker Hub `snyk/snyk` image listing: https://hub.docker.com/r/snyk/snyk

## Issues Found
- Updated token authentication from `snyk auth YOUR_API_TOKEN` to `snyk auth --auth-type=token YOUR_API_TOKEN` because current Snyk CLI versions default to OAuth browser authentication and require explicit token auth for API tokens.
- Added the required `Pipfile.lock` and `poetry.lock` caveats to Pipenv and Poetry examples because Snyk uses lock files to build those dependency trees.
- Fixed the GitHub Actions SARIF example by adding `--sarif-file-output=snyk.sarif`, changing `github/codeql-action/upload-sarif@v2` to `@v3`, and using `if: success() || failure()` so the SARIF upload can run after a vulnerability-failing scan.
- Removed `snyk auth $SNYK_TOKEN` from GitLab CI snippets because current Snyk CI guidance uses the `SNYK_TOKEN` environment variable directly.
- Replaced obsolete/unlisted `snyk fix` and `snyk wizard` examples with current CLI-oriented fix guidance: `snyk test` for upgrade/patch advice and `@snyk/protect` / `npx snyk-protect` for applying patches listed in `.snyk` for npm projects.
- Changed the `--show-vulnerable-paths=all` comment from checking upgrade paths to showing vulnerable dependency paths, which is what the option controls.
- Updated sample `.snyk` ignore expiration timestamps from already-expired 2025 dates to future 2027 dates.
- Replaced `snyk test --license` with `snyk test` because current `snyk test` checks open-source vulnerabilities and license issues, while `--license` is not listed in current CLI help.

## Review Notes
- The container scan output is illustrative; real vulnerability counts and base-image recommendations change over time as vulnerability databases and image tags change.
- Snyk GitHub Actions examples still use `snyk/actions/*@master` in official documentation, so the post's use of those action refs was left unchanged.
