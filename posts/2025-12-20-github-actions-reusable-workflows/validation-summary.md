# Validation Summary: How to Use Reusable Workflows in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Reusable workflows
- GitHub Actions workflow syntax
- GitHub Actions secrets, outputs, permissions, and matrix strategies
- Node.js CI with actions/checkout and actions/setup-node

## Sources Consulted
- GitHub Docs: Reuse workflows - https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Reusing workflow configurations - https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Docs: Secure use reference - https://docs.github.com/en/actions/reference/security/secure-use
- GitHub Docs: Managing GitHub Actions settings for a repository - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- GitHub Docs: Sharing actions and workflows with your organization - https://docs.github.com/actions/creating-actions/sharing-actions-and-workflows-with-your-organization
- actions/setup-node README - https://github.com/actions/setup-node
- actions/checkout README - https://github.com/actions/checkout

## Issues Found
- The post stated that reusable workflows can be nested up to 4 levels deep. GitHub's current documentation allows up to 10 levels total, including the top-level caller and up to nine levels of reusable workflows. Updated the statement accordingly.
- The commit SHA examples used shortened placeholder SHAs while describing reproducible or immutable references. GitHub's security guidance recommends full-length commit SHAs for immutable pinning. Replaced the shortened placeholders with full-length example SHAs.

## Review Notes
The workflow-call syntax, same-repository and cross-repository `uses` syntax, `with` inputs, `secrets: inherit`, explicit secret mapping, reusable workflow outputs, matrix strategy usage, conditional reusable workflow jobs, and caller job `permissions` examples match current GitHub Actions documentation. The examples use `actions/checkout@v4` and `actions/setup-node@v4`; newer major versions exist, but v4 remains a valid pinned major version and is not invalid for the tutorial.
