# Validation Summary: OpenTofu Community and Governance Model

## Status
validated

## Post Type
Reference / Guide (governance and community process overview)

## Technologies Covered
- OpenTofu (Infrastructure as Code tool)
- Linux Foundation / LF Projects governance model
- OpenTofu Technical Steering Committee (TSC)
- OpenTofu RFC process
- OpenTofu Registry
- Go (build toolchain for OpenTofu)
- GitHub Private Vulnerability Reporting

## Sources Consulted
- OpenTofu main repository: https://github.com/opentofu/opentofu
- OpenTofu org/governance repo: https://github.com/opentofu/org (CHARTER.md, GOVERNANCE.md, TSC notes)
- OpenTofu CONTRIBUTING.md (current TSC member list): https://github.com/opentofu/opentofu/blob/main/CONTRIBUTING.md
- OpenTofu README: https://github.com/opentofu/opentofu/blob/main/README.md
- OpenTofu SECURITY.md: https://github.com/opentofu/opentofu/blob/main/SECURITY.md
- OpenTofu RFC directory: https://github.com/opentofu/opentofu/tree/main/rfc
- OpenTofu release notes for v1.7.0, v1.8.0, v1.9.0, v1.10.0, v1.11.0
- OpenTofu Slack page: https://opentofu.org/slack/
- OpenTofu install docs: https://opentofu.org/docs/intro/install/
- OpenTofu go.mod (current Go language version requirement)

## Issues Found

1. **TSC member companies were incorrect.** The post listed "Massdriver" as a represented company. Per `opentofu/opentofu/CONTRIBUTING.md`, the current TSC members come from Spacelift, env0, Scalr, Harness, and Gruntwork — Massdriver is not on the TSC. Replaced "Massdriver" with "Scalr".

2. **RFC numbering convention was fabricated.** OpenTofu RFCs use date-prefixed filenames (e.g. `20231114-client-side-state-encryption.md`), not sequential numbers like "RFC-0001" or "RFC-0003". Removed the invented RFC numbers and clarified the actual naming convention.

3. **RFC → release version mapping was incorrect for all three examples.** Verified against the official release notes:
   - "Provider iteration → 1.8" was wrong. `for_each` in provider configuration blocks shipped in **OpenTofu 1.9** (not 1.8).
   - "Native state encryption → 1.8" was wrong. State encryption shipped in **OpenTofu 1.7** (not 1.8).
   - "Write-only attributes → 1.10" was wrong. Ephemeral resources and write-only attributes shipped in **OpenTofu 1.11** (not 1.10).
   Updated all three examples to reflect the actual release versions.

4. **RFC URL used `blob` for a directory.** GitHub uses `tree/` for directories and `blob/` for files. Changed `github.com/opentofu/opentofu/blob/main/rfc/` to `github.com/opentofu/opentofu/tree/main/rfc/`.

5. **Go version requirement was outdated.** The post said "Install Go 1.21+", but `opentofu/opentofu/go.mod` currently declares `go 1.26.2`. Updated the comment to point readers to `go.mod` and reference the current 1.26+ requirement.

6. **Slack workspace details were wrong.** The post claimed `opentofu.slack.com` with channels `#general`, `#dev`, `#help`. The OpenTofu community is actually hosted in the **CNCF Slack workspace** under the single `#opentofu` channel; the standalone `opentofucommunity.slack.com` workspace was deprecated. The official invite link is `opentofu.org/slack`. Replaced the section with the accurate information.

7. **"Weekly Meeting" oversimplified the actual cadence.** OpenTofu has two recurring public meetings: a weekly Community Meeting (Wednesdays 12:30 UTC) and a biweekly Technical Steering Committee meeting (every other Tuesday 4pm UTC). Updated the section to reflect both, plus the link to the public TSC notes folder.

8. **Documentation/website source repo URL was wrong.** The post pointed contributors to `github.com/opentofu/opentofu.io`, which does not exist. The correct repo is `github.com/opentofu/opentofu.org`. Fixed.

9. **Security disclosure email does not exist.** The post listed `security@opentofu.org` and a specific response-time SLA. OpenTofu's actual SECURITY.md and README direct reporters to **GitHub Private Vulnerability Reporting** at `https://github.com/opentofu/opentofu/security/advisories/new`, with no published numeric SLA. Replaced the email with the correct reporting channel and softened the response-process language to match the published policy.

10. **`tofu install --version 1.9.0-alpha1` is not a real command.** The OpenTofu CLI has no `install` subcommand. Pre-release versions are obtained from the GitHub releases page (or via the nightly builds at `nightlies.opentofu.org`). Replaced the fake command with the actual download links.

## Review Notes

- The "Steering Committee" is officially the **Technical Steering Committee (TSC)** per the project Charter. The post's casual use of "Steering Committee" is acceptable shorthand and was left unchanged for stylistic consistency, but a future revision could prefer the formal "TSC" name.
- The "Support policy" section ("Previous minor version: Security fixes for 6 months") is presented as if it were an official policy. I could not find a published OpenTofu support policy that matches this exact wording — observed practice shows several minor versions receiving patch releases concurrently. This claim was left unchanged because it is not verifiably wrong, but it would benefit from a citation or removal in a future revision.
- The "Release Cadence" timing (12–18 months major, 3–4 months minor) is roughly consistent with the observed release history (1.6 in Jan 2024, 1.7 in Apr 2024, 1.8 in Jul 2024, 1.9 in Jan 2025, 1.10 in Jun 2025, 1.11 in Dec 2025) — minor releases have been roughly every 3–6 months. Acceptable as a general statement.
- The Registry Governance section's claim that "Source code must be publicly accessible" for registry inclusion is consistent with the registry's `POLICY.md`. Left unchanged.
- The `go build ./cmd/tofu/` and `go test ./...` commands work against the current repository layout (`cmd/tofu` exists). Verified.
