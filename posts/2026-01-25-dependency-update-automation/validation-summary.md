# Validation Summary: How to Configure Dependency Update Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dependabot
- Renovate
- GitHub Actions
- npm
- Python pip
- Docker
- Terraform
- Mermaid

## Sources Consulted
- GitHub Docs: Dependabot options reference - https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- GitHub Docs: Automating Dependabot with GitHub Actions - https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/automate-dependabot-with-actions
- dependabot/fetch-metadata official repository - https://github.com/dependabot/fetch-metadata
- Renovate Docs: Configuration options - https://docs.renovatebot.com/configuration-options/
- Renovate Docs: Security presets - https://docs.renovatebot.com/presets-security/
- Renovate Docs: Minimum release age - https://docs.renovatebot.com/key-concepts/minimum-release-age/
- Renovate JSON schema - https://docs.renovatebot.com/renovate-schema.json

## Issues Found
- Replaced deprecated Renovate `config:base` preset references with `config:recommended`, matching Renovate's current config migration guidance.
- Replaced deprecated Renovate `matchPackagePatterns` rules with regex values in `matchPackageNames`.
- Replaced deprecated Renovate custom manager `fileMatch` with `managerFilePatterns`.
- Replaced deprecated Renovate monorepo `matchPaths` rules with `matchFileNames`.
- Removed deprecated Renovate `stabilityDays`; `minimumReleaseAge` is the current option for delaying updates.
- Fixed the Dependabot auto-merge GitHub Actions example to use `pull_request_target`, explicit write permissions, `dependabot/fetch-metadata@v3`, and a Dependabot-only actor check. The original workflow included Renovate PRs even though the metadata action only applies to Dependabot PRs, and Dependabot-triggered `pull_request` workflows have read-only token behavior.
- Corrected the Dependabot security update snippet comment. `open-pull-requests-limit` applies to version update PRs; Dependabot security updates use a separate internal limit.
- Reworked the Renovate vulnerability alert example to configure `vulnerabilityAlerts` directly instead of using `isVulnerabilityAlert` as a package rule matcher.

## Review Notes
Renovate JSON/JSONC snippets were validated with `renovate-config-validator --strict --no-global`. YAML snippets were parsed successfully with `js-yaml`. The post is technically valid after the corrections above.
