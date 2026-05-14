# Validation Summary: How to Create Pull Requests for Flux Image Updates with GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller and image-automation-controller
- Kubernetes manifests
- GitHub Actions
- GitHub CLI
- GitHub branch protection REST API
- Slack GitHub Action
- Docker image tagging and pushing

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI `flux get images policy` documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI `flux reconcile image update` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- GitHub Actions workflow syntax and `GITHUB_TOKEN` permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow triggering and `GITHUB_TOKEN` recursion behavior: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CLI local help for `gh pr create`, `gh pr edit`, `gh pr merge`, `gh pr review`, and `gh api`
- Slack GitHub Action documentation: https://github.com/slackapi/slack-github-action
- Slack incoming webhook action documentation: https://docs.slack.dev/tools/slack-github-action/sending-data-slack-incoming-webhook

## Issues Found
- The Flux automation setup did not show that ImageUpdateAutomation only updates fields marked with image policy setter comments. I added a small Deployment example with the `{"$imagepolicy": "flux-system:my-app"}` marker so the automation example can actually update manifests.
- The PR creation workflow used the default `GITHUB_TOKEN`. GitHub does not trigger follow-up workflows from most events created with `GITHUB_TOKEN`, so the validation and auto-merge `pull_request` workflows would not run. I changed the workflow to use a GitHub App token or PAT stored as `PR_CREATION_TOKEN`.
- The validation workflow used `git diff origin/main..HEAD` without fetching full history in that workflow. I added `fetch-depth: 0` to checkout.
- The YAML validation script called `yaml.safe_load_all(f)` without consuming the generator, so parse errors in YAML documents might not be raised. I changed it to `list(yaml.safe_load_all(f))`, added a PyYAML install step, and made file handling robust for spaces in paths.
- A validation step was labeled "Diff against running cluster" but only ran a Git diff against `main`. I renamed it to "Diff against main".
- The patch-only auto-merge script only compared the first changed image and treated missing versions as patch-only. I changed it to compare each old/new version pair and reject empty or mismatched version lists.
- The branch protection `gh api` command passed nested JSON objects as string fields. I changed it to send a JSON request body with `--input -`, matching the GitHub CLI and REST API behavior.
- The Slack notification example used `slackapi/slack-github-action@v1` with the older environment-variable webhook style. I updated it to the current v3 incoming webhook syntax with `webhook` and `webhook-type: incoming-webhook`.
- The final `gh pr review` and `gh pr merge` examples assumed the current local branch had an associated PR. I changed them to pass `flux-image-updates` explicitly.

## Review Notes
The auto-merge example remains intentionally simple and only checks semantic version tags in image references. In a production workflow, teams should consider using a more complete policy check if multiple image formats, digests, pre-release tags, or registry-specific tag conventions are used. Local `flux`, `kubectl`, and `docker` CLIs were not installed in this environment, so those commands were verified against official documentation rather than local command help.
