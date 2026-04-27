# Validation Summary: How to Use OpenTofu with Digger for PR Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.7.0)
- Digger (open-source IaC orchestration tool / GitHub Action)
- GitHub Actions
- AWS (OIDC role assumption)
- Checkov (security scanning, used as an example)

## Sources Consulted
- Digger digger.yml reference: https://docs.digger.dev/ce/reference/digger.yml (redirects to https://docs.opentaco.dev/ce/reference/digger.yml)
- Digger Apply Requirements: https://docs.opentaco.dev/ce/howto/apply-requirements
- Digger CommentOps: https://docs.opentaco.dev/ce/features/commentops
- diggerhq/digger GitHub Action source (action.yml): https://github.com/diggerhq/digger/blob/develop/action.yml
- diggerhq/digger release tags: https://github.com/diggerhq/digger/tags
- opentofu/setup-opentofu action: https://github.com/opentofu/setup-opentofu
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials

## Issues Found

1. **Outdated Digger action version (`v0.3.0`).** The current Digger CLI/action version is in the v0.6.x range (e.g. `v0.6.144`, released March 2026). Updated all references to `diggerhq/digger@v0.6.144`.

2. **Invalid `require_approval` field in `digger.yml`.** The canonical field is `apply_requirements`, which is a list of conditions such as `[mergeable, approved, undiverged]`. Replaced `require_approval: true` with `apply_requirements: [mergeable, approved]`, and removed `require_approval: false` for the dev project (the default `[mergeable]` already does not require approval).

3. **Misuse of `depends_on` for file path patterns.** The `depends_on` field accepts other project names (for execution ordering), not file path globs. Replaced the file globs with `include_patterns` (which is the field that accepts directory glob patterns to declare external file change triggers), and removed redundant entries that just repeated the project's own `dir`.

4. **Invalid `pre_plan_hooks` / `post_apply_hooks` fields.** Digger does not have these fields. Custom commands are run through the `workflows` configuration with `plan.steps` and `apply.steps`, where each step can be `init`, `plan`, `apply`, or `run: <shell command>`. Rewrote the section to reference a named workflow from the project and define the workflow's plan/apply steps under a top-level `workflows` key.

5. **Invalid Digger Cloud `backend` block in `digger.yml`.** There is no top-level `backend` key with a `backend_type: backend.digger.cloud` value. Digger Cloud connection is configured via the GitHub Action's `digger-hostname`, `digger-organisation`, and `digger-token` inputs. Replaced the bogus YAML with a corrected workflow snippet that wires those inputs to the action.

## Review Notes
- The PR comment triggers (`digger plan`, `digger plan -p <project>`, `digger apply -p <project>`, `digger unlock`) are accurate per the CommentOps documentation.
- The `setup-aws`, `aws-role-to-assume`, and `aws-region` action inputs all exist on the diggerhq/digger action and behave as the post implies.
- `opentofu/setup-opentofu@v1` with `tofu_version: 1.7.0` is valid.
- Digger upstream rebranded its docs domain to `docs.opentaco.dev`; the legacy `docs.digger.dev` URLs still 301-redirect there. This is not user-visible and does not affect the post.
- Digger version pinning recommendation: action versions move quickly; readers should consult https://github.com/diggerhq/digger/releases for the current tag.
