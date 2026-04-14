# Validation Summary: How to Report Security Vulnerabilities in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- GitHub Security Advisories
- GitHub CLI (`gh`)
- CVE/GHSA vulnerability disclosure process

## Sources Consulted
- Dapr official security reporting documentation: https://docs.dapr.io/operations/support/support-security-issues/
- Dapr SECURITY.md on GitHub: https://github.com/dapr/dapr/blob/master/SECURITY.md
- GitHub REST API documentation for repository security advisories: https://docs.github.com/en/rest/security-advisories/repository-advisories
- GitHub Security Policy for dapr/dapr: https://github.com/dapr/dapr/security/policy

## Issues Found

### 1. Reporting method priority was reversed
**What was wrong:** The post presented GitHub security advisories as the primary reporting method with email as an alternative. Official Dapr documentation lists emailing `security@dapr.io` as the primary method.
**What was changed:** Reordered the section so email is presented first as the primary method, with GitHub advisories as the alternative. Added the official guidance to include a descriptive subject line and write the description in English with example code/configuration.

### 2. Disclosure timeline was significantly inaccurate
**What was wrong:** The post claimed: Acknowledgment within 3 business days, Initial assessment within 7 business days, Patch development 30-90 days depending on severity. The official Dapr docs state: acknowledgment ideally within 3 working days (best-effort, not guaranteed), and triage, response, patching, and announcement all within 30 days total. The "7 business days for initial assessment" was fabricated and the "30-90 days for patching" significantly overstated the actual 30-day total resolution window.
**What was changed:** Replaced the four-row timeline table with a corrected three-row table matching official documentation: Acknowledgment ideally within 3 working days, Triage/patching/announcement within 30 days, Public disclosure after patch release.

### 3. Summary section reflected the inaccurate timeline
**What was wrong:** The summary stated "acknowledgment within 3 business days" as a firm commitment and didn't mention the 30-day resolution window.
**What was changed:** Updated to say "ideally within 3 working days" and "full resolution (triage, patching, and announcement) within 30 days." Also reordered to list email before GitHub advisories, matching the corrected body.

## Review Notes
- The `gh api repos/dapr/dapr/security-advisories --jq '.[].ghsa_id'` command is correct. The endpoint, field name, and `--jq` syntax are all valid. Published advisories on public repositories are accessible to anyone, including unauthenticated users.
- The email address `security@dapr.io` was confirmed as correct per official Dapr documentation.
- The default Dapr sidecar HTTP port 3500 mentioned in the example is correct.
- The CVE assignment section mentions "GitHub and MITRE." Since GitHub is a CNA (CVE Numbering Authority) that can assign CVEs directly, mentioning MITRE is slightly redundant but not incorrect since MITRE operates the overall CVE program.
- The official Dapr docs note they do not accept vulnerability scanner output without independent confirmation that the vulnerability exists in Dapr. The blog post does not mention this, but it is not critical for the post's scope.
