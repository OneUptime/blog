# Validation Summary: How to Use Workflow Templates in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflow templates / starter workflows)
- GitHub Actions reusable workflows (`workflow_call`)
- Node.js CI (actions/checkout, actions/setup-node)
- Python CI (actions/setup-python, flake8, pytest, Codecov)
- Docker build & push (Buildx, GHCR, docker/login-action, docker/metadata-action, docker/build-push-action)
- YAML / JSON configuration

## Sources Consulted
- GitHub Docs — Creating workflow templates for your organization: https://docs.github.com/en/actions/sharing-automations/creating-workflow-templates-for-your-organization
- actions/starter-workflows repository (placeholder definitions): https://github.com/actions/starter-workflows
- GitHub Docs — Reusing workflows (`workflow_call`, nested `.github/.github/workflows` path, secrets passing): https://docs.github.com/en/actions/using-workflows/reusing-workflows
- Action versions cross-checked against their respective marketplace/repo releases (actions/checkout@v4, actions/setup-node@v4, actions/setup-python@v5, codecov/codecov-action@v5, docker/setup-buildx-action@v3, docker/login-action@v3, docker/metadata-action@v5, docker/build-push-action@v6)

## Issues Found
No technical issues found.

Specifically verified:
- The three placeholders `$default-branch`, `$protected-branches`, and `$cron-daily` are all genuine GitHub starter-workflow placeholders (confirmed via the actions/starter-workflows repository). The descriptions in the table are accurate.
- The `*.properties.json` metadata fields (`name`, `description`, `iconName`, `categories`, `filePatterns`) match the official documented schema, including that `name` and `description` are the display fields and `filePatterns` matches files in the repository root.
- Templates must live in the `workflow-templates` directory of an organization's `.github` repository — correct.
- The reusable workflow call path `your-org/.github/.github/workflows/reusable-deploy.yml@main` is correct; the doubled `.github` is intentional (the `.github` repository plus the `.github/workflows` directory).
- All referenced action versions are current and non-deprecated.
- The Docker template correctly sets `permissions: packages: write`, gates the registry login/push on `github.event_name != 'pull_request'`, and uses `secrets.GITHUB_TOKEN` for GHCR — all valid.

## Review Notes
- The post is consistent with GitHub's current terminology; note that GitHub has historically referred to these as both "starter workflows" and "workflow templates." The directory name remains `workflow-templates`, which the post uses correctly.
- `filePatterns` values are technically treated as regular expressions (e.g., `package.json` matches literally, though the `.` is a regex wildcard). This is a minor nuance and not an error in the examples given.
- No version pinning concerns; all examples use floating major-version tags, which is the recommended practice for first-party/marketplace actions.
