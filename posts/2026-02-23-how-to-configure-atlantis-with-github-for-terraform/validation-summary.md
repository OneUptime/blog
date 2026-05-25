# Validation Summary: How to Configure Atlantis with GitHub for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Atlantis
- Terraform
- GitHub Apps
- GitHub webhooks
- GitHub branch protection
- GitHub CLI
- Kubernetes Ingress
- OPA / Conftest

## Sources Consulted
- Atlantis Server Configuration: https://www.runatlantis.io/docs/server-configuration
- Atlantis Git Host Access Credentials: https://www.runatlantis.io/docs/access-credentials.html
- Atlantis Configuring Webhooks: https://www.runatlantis.io/docs/configuring-webhooks.html
- Atlantis Repo Level atlantis.yaml Config: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis Server Side Repo Config: https://www.runatlantis.io/docs/server-side-repo-config
- Atlantis Command Requirements: https://www.runatlantis.io/docs/command-requirements.html
- Atlantis Custom Workflows: https://www.runatlantis.io/docs/custom-workflows.html
- Atlantis Conftest Policy Checking: https://www.runatlantis.io/docs/policy-checking
- Atlantis Repo and Project Permissions: https://www.runatlantis.io/docs/repo-and-project-permissions
- Atlantis commit status source: https://github.com/runatlantis/atlantis/blob/main/server/events/commit_status_updater.go
- GitHub Branch Protection Docs: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- GitHub REST API Branch Protection: https://docs.github.com/en/rest/branches/branch-protection
- GitHub REST API Meta Endpoint: https://docs.github.com/rest/reference/meta
- GitHub REST API Teams: https://docs.github.com/rest/teams/teams
- GitHub CLI `gh api --help`

## Issues Found
- GitHub App permissions were incomplete. Added the current Atlantis-required `Webhooks: Read & Write` and `Actions: Read-only` permissions.
- Webhook event lists were incomplete. Added pull request review comments and pull request synchronization where applicable.
- Branch protection guidance implied requiring a generic `atlantis/plan` check, and the status check examples did not match named Atlantis projects. Updated them to use the exact Atlantis status check context for the project name.
- The custom Conftest run used stdin from `terraform show`. Updated it to write `$SHOWFILE` and run Conftest against that file, matching Atlantis workflow variables.
- The GitHub CLI branch protection command passed nested JSON as strings. Updated it to use `gh api --field` nested parameter syntax.
- The repository-level `apply_requirements` and custom workflow examples omitted Atlantis server-side restrictions. Added notes for `allowed_overrides` and `allow_custom_workflows`.
- The team-based access control section used an unsupported GitHub API endpoint and checked the PR author instead of the user running the command. Replaced it with Atlantis' supported `--gh-team-allowlist` and `team_authz` mechanisms.
- The multiple-organization GitHub App example implied one app installation could cover multiple organizations directly. Updated it to use the PAT example for multi-org allowlisting and added the GitHub App installation caveat.
- The GitHub webhook IP allowlist was a stale hard-coded list. Replaced it with the GitHub Meta API approach and noted that ranges must be refreshed.

## Review Notes
The Terraform version examples use `v1.7.0`, which Atlantis accepts as a project `terraform_version`, but future readers may want to update the sample version independently of the Atlantis configuration pattern.
