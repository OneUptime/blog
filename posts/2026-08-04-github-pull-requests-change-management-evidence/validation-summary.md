# Validation Summary: Can GitHub Pull Requests Prove SOC 2 Change Management?

## Status

validated

## Post Type

Technical guide and audit-evidence reference

## Technologies Covered

- GitHub pull requests and pull-request reviews
- GitHub branch protection rules and rulesets
- CODEOWNERS, approval requirements, and bypass controls
- GitHub status checks and GitHub Actions
- GitHub merge queues and `merge_group` events
- GitHub REST APIs and organization audit logs
- CI/CD deployments, commit SHAs, and artifact digests
- SOC 2 change-management controls and audit evidence

## Sources Consulted

- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: Pull request reviews](https://docs.github.com/en/pull-requests/reference/pull-request-reviews)
- [GitHub Docs: About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Docs: Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [GitHub Docs: Status checks](https://docs.github.com/en/pull-requests/reference/status-checks)
- [GitHub Docs: Troubleshooting required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [GitHub Docs: Managing a merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [GitHub Docs: REST API endpoints for pull-request reviews](https://docs.github.com/en/rest/pulls/reviews)
- [GitHub Docs: REST API endpoints for deployments](https://docs.github.com/en/rest/deployments/deployments)
- [GitHub Docs: REST API endpoints for deployment statuses](https://docs.github.com/en/rest/deployments/statuses)
- [GitHub Docs: Audit log events for an organization](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/audit-log-events-for-your-organization)
- [GitHub Docs: Reviewing the audit log for an organization](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization)
- [AICPA and CIMA: FAQs on software tools in SOC 2 examinations](https://www.aicpa-cima.com/resources/article/faqs-effect-of-the-use-of-software-tools-on-soc-2-r-examinations)

## Issues Found

- The post listed `successful` as though it were a literal check-run conclusion. GitHub's documented conclusion value is `success`. Changed the sentence to use `success`, `skipped`, and `neutral` conclusions so the terminology matches the API and status-check documentation.

## Review Notes

- The original GitHub pull-request-review URL redirects to the current canonical Pull request reviews page and remains functional.
- GitHub currently retains organization audit-log events for 180 days, check data for 400 days before archival and subsequent deletion, and previous deployment statuses for 90 days. The post correctly recommends exporting and retaining historical evidence, which is important when a SOC 2 examination period exceeds these native retention windows.
- The AICPA and CIMA FAQ is an official current source, but it is expressly nonauthoritative guidance and its downloadable full text requires a free account.
