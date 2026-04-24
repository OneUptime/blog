# Validation Summary: How to Propose Features for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub Issues
- GitHub Discussions
- OpenTofu RFC process
- HCL

## Sources Consulted
- OpenTofu `CONTRIBUTING.md`: https://github.com/opentofu/opentofu/blob/main/CONTRIBUTING.md
- OpenTofu feature request template: https://github.com/opentofu/opentofu/blob/main/.github/ISSUE_TEMPLATE/feature_request.yml
- OpenTofu RFC process: https://github.com/opentofu/opentofu/blob/main/rfc/README.md
- OpenTofu RFC template: https://github.com/opentofu/opentofu/blob/main/rfc/yyyymmdd-template.md
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu issue `#2155` ("Allow provider for_each to refer to data resources, child module output values, etc"): https://github.com/opentofu/opentofu/issues/2155
- OpenTofu milestones page: https://github.com/opentofu/opentofu/milestones

## Issues Found
- The post said readers should check `ROADMAP.md`, but that file does not exist in the current `opentofu/opentofu` repository. I replaced it with the repository milestones and labels pages, which are the current official places to inspect planned and triaged work.
- The post described the contribution path as "Medium features → GitHub Discussion → Issue". Current OpenTofu contributing docs direct feature ideas to the GitHub feature request issue template, while Discussions are used for questions and optional early feedback. I updated the proposal flow, the "Before Proposing" section, and the summary to match the current process.
- The sample feature request proposed adding `for_each` to provider blocks, but current OpenTofu documentation already supports `for_each` on aliased `provider` blocks. I replaced that example with a current limitation around provider `for_each` needing static input, based on an official OpenTofu issue.
- The sample GitHub issue body did not match the current feature request template fields. I updated it to use the current structure: OpenTofu Version, The problem in your OpenTofu project, Attempted Solutions, Proposal, Workarounds and Alternatives, and References.
- The RFC example and file-copy command did not match the current OpenTofu RFC process. I updated the section to reflect that RFCs are typically written after an issue gets the `needs-rfc` label, switched the outline to the current RFC template headings, and corrected the template path from `rfc/TEMPLATE.md` to `rfc/yyyymmdd-template.md`.
- The original markdown fencing around the issue example was broken by nested triple backticks and an invalid closing fence. I corrected the fencing so the examples render properly.

## Review Notes
GitHub Discussions can still be useful for getting early feedback on a feature idea, but the current OpenTofu repository documentation points contributors to the feature request issue template as the canonical starting point for new feature proposals.
