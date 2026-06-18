# Validation Summary: How to Configure Code Review Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub CODEOWNERS
- GitHub branch protection rules
- GitHub Actions workflows
- actions/labeler
- actions/github-script
- GitHub REST API for pull requests, reviews, labels, and review requests
- github/codeql-action/upload-sarif
- actions/setup-node
- Codecov GitHub Action
- Snyk GitHub Actions
- actions/stale
- Mermaid flowcharts

## Sources Consulted
- GitHub Docs: About code owners - https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub Docs: Managing a branch protection rule - https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- GitHub Docs: Workflow syntax for GitHub Actions, including job permissions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Docs: Events that trigger workflows - https://docs.github.com/actions/using-workflows/events-that-trigger-workflows
- GitHub Docs: Uploading a SARIF file to GitHub - https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- GitHub Docs: REST API endpoints for pull requests - https://docs.github.com/en/rest/pulls/pulls
- GitHub Docs: REST API endpoints for pull request reviews - https://docs.github.com/en/rest/pulls/reviews
- GitHub Docs: REST API endpoints for pull request review comments - https://docs.github.com/rest/pulls/comments
- GitHub Docs: REST API endpoints for review requests - https://docs.github.com/en/rest/pulls/review-requests
- actions/labeler documentation - https://github.com/actions/labeler
- actions/github-script documentation - https://github.com/actions/github-script
- actions/setup-node documentation - https://github.com/actions/setup-node
- github/codeql-action upload-sarif action metadata - https://github.com/github/codeql-action/blob/main/upload-sarif/action.yml
- actions/stale documentation - https://github.com/actions/stale
- Snyk GitHub Actions documentation - https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities

## Issues Found
- The PR size workflow used `github.rest.pulls.listFiles` and `github.rest.issues.addLabels` / `createComment` without declaring token permissions. Added `pull-requests: read` and `issues: write` so the workflow works with repositories that use restricted default `GITHUB_TOKEN` permissions.
- The SARIF upload workflow did not declare `security-events: write`, which is required by `github/codeql-action/upload-sarif`. Added `contents: read` and `security-events: write` to the lint job.
- The reviewer assignment workflow requested reviewers through the Pull Requests API without declaring write permission. Added `pull-requests: write`.
- The review bot created pull request reviews without declaring write permission. Added `contents: read` and `pull-requests: write`.
- The review bot's `findLineNumber` helper calculated review-comment line numbers by adding the diff array index to the hunk start line, which can produce invalid line numbers because diff headers, removed lines, and previous hunk content are included in that index. Replaced it with hunk-aware new-file line tracking and skipped comments when no valid right-side line can be found.
- The stale PR workflow updates issues and pull requests but did not declare token permissions. Added `issues: write` and `pull-requests: write`.

## Review Notes
- The examples are otherwise aligned with current GitHub Actions, CODEOWNERS, labeler, GitHub REST API, CodeQL SARIF upload, Snyk, Codecov, and stale-action documentation as of 2026-06-15.
- Some snippets assume repository labels such as `size/XL` and team/user handles such as `@frontend-team` already exist and are accessible to the repository. That is expected for illustrative workflow examples.
