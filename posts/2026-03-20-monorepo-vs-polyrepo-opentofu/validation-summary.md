# Validation Summary: How to Choose Between Monorepo and Polyrepo for OpenTofu

## Status
validated

## Post Type
Guide / Architecture decision overview

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- GitHub Actions (workflow `on.pull_request.paths` trigger filter)
- Terramate (referenced as a path/change-detection helper for monorepos)
- General concepts: CODEOWNERS, OPA policies, monorepo vs polyrepo repository layouts

## Sources Consulted
- GitHub Actions — Events that trigger workflows (`pull_request`, `paths`): https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request
- GitHub Actions — Expressions and the `contains()` function: https://docs.github.com/en/actions/learn-github-actions/expressions#contains
- GitHub Actions — Contexts (`github.event` payload): https://docs.github.com/en/actions/learn-github-actions/contexts#github-context
- Terramate documentation: https://terramate.io/docs/cli/
- OpenTofu documentation (general project structure): https://opentofu.org/docs/

## Issues Found
- The "Monorepo CI Pattern" YAML snippet contained an invalid GitHub Actions expression: `if: ${{ github.event.paths contains 'environments/prod/networking' }}`.
  - `github.event.paths` does not exist on the `pull_request` event payload — there is no `paths` field on that context.
  - GitHub Actions expressions do not support an infix `contains` operator; the correct form is the `contains(search, item)` function.
  - The `on.pull_request.paths` trigger filter immediately above already restricts the workflow to networking changes, so the broken `if` was also redundant.
  - Fix: removed the invalid `if` line and replaced it with a minimal valid `runs-on` / `steps` skeleton (`actions/checkout@v4` plus a comment placeholder for OpenTofu init/plan steps), preserving the original intent of "only run for networking changes" via the existing `paths:` trigger filter.

## Review Notes
- The repository-layout diagrams, advantages/challenges lists, decision-framework table, and hybrid-approach discussion are all conceptual guidance and not subject to factual verification — they are reasonable, commonly cited trade-offs.
- The mention of Terramate as a path-filter / change-detection helper for OpenTofu monorepos is accurate; Terramate explicitly supports change detection and OpenTofu/Terraform stacks.
- The claim "Access control is per-repo - can't restrict teams to their directory" is broadly true on GitHub: CODEOWNERS can require reviews from a team for a path, but it cannot prevent another team from reading or pushing to a branch in the same repo without branch-protection rules. This is a generalization but not incorrect.
- No version-specific claims were made about OpenTofu, so no version drift to flag.
