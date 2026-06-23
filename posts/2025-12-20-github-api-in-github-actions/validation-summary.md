# Validation Summary: How to Use GitHub API in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub REST API
- GitHub GraphQL API
- actions/github-script
- GitHub CLI (`gh`)
- Octokit
- YAML workflow configuration
- cURL

## Sources Consulted
- GitHub Docs: Use GITHUB_TOKEN for authentication in workflows - https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub Docs: Workflow syntax for GitHub Actions permissions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Docs: Using GitHub CLI in workflows - https://docs.github.com/actions/using-workflows/using-github-cli-in-workflows
- GitHub CLI manual: `gh pr merge` - https://cli.github.com/manual/gh_pr_merge
- GitHub Docs: REST API endpoints for labels - https://docs.github.com/en/rest/issues/labels
- GitHub Docs: REST API endpoints for review requests - https://docs.github.com/en/rest/pulls/review-requests
- GitHub Docs: REST API endpoints for releases - https://docs.github.com/en/rest/releases/releases
- GitHub Docs: REST API endpoints for repositories / repository dispatch - https://docs.github.com/en/rest/repos/repos
- GitHub Docs: Using the API to manage Projects - https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects
- actions/github-script README - https://github.com/actions/github-script
- Octokit REST.js documentation - https://octokit.github.io/rest.js/

## Issues Found
- Several workflows performed write operations with `GITHUB_TOKEN` but did not declare the required `permissions`. Added explicit permissions for issue comments and labels, PR reviewer requests and labels, release creation, and read-only examples. This matches GitHub Actions' least-privilege permission model and avoids failures in repositories where the default token is read-only.
- The cURL examples used the older `application/vnd.github.v3+json` media type. Updated the examples to GitHub's currently recommended `Accept: application/vnd.github+json` header and added the REST API version header.
- The issue triage example called `toLowerCase()` on `issue.body` without checking for `null`. Updated it to handle issues with empty bodies.
- The Projects V2 GraphQL mutation used the default workflow token. Updated the example to use a separate `PROJECT_TOKEN`, and noted that Projects V2 mutations require a token with the `project` scope.
- The PR automation example specified write permissions but also used `actions/checkout`; added `contents: read` so checkout can read repository contents after permissions are restricted.
- The release asset upload passed binary data without content headers. Added `content-type` and `content-length` headers to make the Octokit upload explicit and reliable.

## Review Notes
- The examples use `actions/github-script@v7`, which is still valid, though newer major versions may be available.
- Workflows triggered by pull requests from forks may still receive a read-only token depending on repository and organization settings, even when write permissions are requested.
- Cross-repository operations still require `CROSS_REPO_TOKEN` to have appropriate access to the target repository, such as issue write access for creating issues and contents write access for repository dispatch.
