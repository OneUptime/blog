# Validation Summary: How to Build Forked Pull Requests Safely When CI Tests Need Secrets

## Status

validated

## Post Type

Security guide

## Technologies Covered

- GitHub Actions
- GitHub Actions workflow events (`pull_request`, `pull_request_target`, and `workflow_run`)
- GitHub Actions secrets, `GITHUB_TOKEN` permissions, environments, artifacts, and dependency caches
- OpenID Connect (OIDC) identity federation
- GitLab merge request pipelines, protected variables, and protected runners
- npm lifecycle scripts
- CI runner isolation and software supply chain security

## Sources Consulted

- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [Securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- [Secure use reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)
- [Events that trigger GitHub Actions workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [`actions/checkout` official repository and v7 documentation](https://github.com/actions/checkout)
- [Approving GitHub workflow runs from forks](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)
- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Deployments and environments in GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [OpenID Connect reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/oidc)
- [GitLab merge request pipelines and forks](https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/)
- [GitLab CI/CD variables](https://docs.gitlab.com/ci/variables/)
- [npm scripts documentation](https://docs.npmjs.com/cli/using-npm/scripts/)

## Issues Found

- The description of forked `pull_request` credentials did not distinguish the safe default from the opt-in settings available for private repositories. It now states that fork workflows receive a read-only `GITHUB_TOKEN` and no Actions secrets by default, while private repositories can explicitly enable write tokens or secrets. This matches GitHub's documented fork workflow settings.
- Both examples used `actions/checkout@v6` even though v7 is current. The secretless example now uses `actions/checkout@v7`.
- The unsafe `pull_request_target` example placed `steps` at the workflow root, which is not valid GitHub Actions workflow structure. It now includes a `jobs` mapping, a job identifier, and `runs-on`.
- `actions/checkout@v7` refuses to check out fork pull-request code under `pull_request_target` and `workflow_run` by default. The deliberately unsafe example now shows the required `allow-unsafe-pr-checkout: true` opt-out so that the example behaves as described, and the surrounding text identifies the built-in protection.

## Review Notes

The command `./scripts/test-untrusted` is intentionally repository-specific placeholder content. The security architecture, cache and artifact warnings, environment-protection guidance, OIDC claim restrictions, manual-approval caveat, self-hosted runner risks, npm lifecycle-script warning, and GitLab fork pipeline behavior all align with the current official documentation.
