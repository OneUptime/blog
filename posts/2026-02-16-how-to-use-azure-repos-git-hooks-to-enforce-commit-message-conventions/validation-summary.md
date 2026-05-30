# Validation Summary: How to Use Azure Repos Git Hooks to Enforce Commit Message Conventions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git hooks
- Conventional Commits
- Azure Repos
- Azure DevOps branch policies
- Azure Pipelines YAML
- Azure DevOps service hooks and PR status
- Husky
- commitlint
- npm release/changelog tooling

## Sources Consulted
- Git githooks documentation: https://git-scm.com/docs/githooks
- Git commit documentation for commit hooks and commit templates: https://git-scm.com/docs/git-commit
- Conventional Commits v1.0.0 specification: https://www.conventionalcommits.org/en/v1.0.0/
- Husky getting started documentation: https://typicode.github.io/husky/get-started.html
- commitlint local setup guide: https://commitlint.js.org/guides/local-setup
- Azure Pipelines documentation for Azure Repos Git PR validation: https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git
- Azure Repos branch policies documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies
- Azure Repos PR status policy documentation: https://learn.microsoft.com/en-in/azure/devops/repos/git/pr-status-policy
- Azure DevOps service hook events documentation: https://learn.microsoft.com/en-us/azure/devops/service-hooks/events
- npm package page for standard-version deprecation notice: https://www.npmjs.com/package/standard-version
- npm package page for commit-and-tag-version: https://www.npmjs.com/package/commit-and-tag-version

## Issues Found
- The description and intro implied Azure Repos server-side Git hooks. Azure DevOps/Azure Repos validation is normally implemented with branch policies, pipelines, service hooks, and PR status, not repository-hosted traditional Git server hooks. Updated the wording to "Azure DevOps validation" and "server-side validation approaches."
- The Conventional Commits format showed scope as required and described the type list as exhaustive. The official spec makes scope optional and only mandates `feat` and `fix`; other types are allowed by convention. Updated the format and wording.
- The regex examples did not allow the `!` marker for breaking changes, which is part of Conventional Commits. Updated the local hook and pipeline regex to allow optional `!` after the optional scope.
- The Azure Pipelines sample used a YAML `pr:` trigger. Official Azure Pipelines documentation says Azure Repos Git does not support YAML PR triggers; PR validation is configured through branch policy build validation. Removed the `pr:` trigger and clarified that the pipeline should be run from a required branch policy.
- The Azure Pipelines sample used `origin/main..HEAD`, which was hard-coded to `main` and could include Azure Repos' synthetic PR merge commit. Updated it to derive `SYSTEM_PULLREQUEST_TARGETBRANCH`, fetch the target branch with full history, and use `git log --no-merges`.
- The service hooks section said the validation service could add status to the commit. Azure Repos branch policy enforcement for external services is based on PR status. Updated the text to refer to notifications or posting status to related pull requests through the PR Status API.
- The changelog section recommended `standard-version`, which is marked deprecated on npm. Replaced it with `commit-and-tag-version`, a maintained fork with equivalent changelog/version-bump behavior.

## Review Notes
The Bash snippets passed `bash -n`, and the JavaScript commitlint config passed `node --check`. Ruby was not installed in the local environment, so YAML parsing with Ruby could not be run; the Azure Pipelines YAML was reviewed manually against Microsoft documentation.
