# Validation Summary: How to Set Up Continuous Drift Monitoring with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu plan -refresh-only`, `tofu init -lockfile=readonly`, `tofu apply -refresh-only`)
- GitHub Actions (scheduled workflows, matrix builds, artifacts)
- `actions/checkout@v4`, `opentofu/setup-opentofu@v1`, `actions/cache@v4`, `aws-actions/configure-aws-credentials@v4`, `actions/github-script@v7`, `actions/upload-artifact@v4`
- Bash scripting
- AWS IAM role assumption (OIDC)

## Sources Consulted
- OpenTofu CLI docs — `tofu plan` flags including `-refresh-only` and `-detailed-exitcode`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs — `tofu init -lockfile=readonly`: https://opentofu.org/docs/cli/commands/init/
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- `actions/github-script` v7 docs: https://github.com/actions/github-script
- `actions/upload-artifact` v4 docs: https://github.com/actions/upload-artifact
- `aws-actions/configure-aws-credentials` v4 docs: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions default shell behavior (`bash --noprofile --norc -eo pipefail {0}`): https://docs.github.com/en/actions/using-jobs/setting-default-values-for-jobs
- Octokit Issues create API: https://octokit.github.io/rest.js/v20/#issues-create
- ECMAScript template literal grammar (MDN): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals

## Issues Found
1. **JavaScript syntax error in github-script `body` template literal.** The original `body:` template literal contained three unescaped backticks (` ``` `) intended to render a Markdown code fence inside the issue body. In a JavaScript template literal, an unescaped `` ` `` terminates the literal, so the script would have failed to parse and the drift alert step would never have created an issue. Fixed by escaping each backtick (`\`\`\``) so it is emitted as a literal backtick at runtime, preserving the intended code-fenced block in the GitHub issue body.

## Review Notes
- The `Check for Drift` step uses `set +e` followed by `tofu plan ... 2>&1 | tee drift-output.txt` and reads `$?`. This works correctly on GitHub-hosted Linux runners because the default shell is `bash --noprofile --norc -eo pipefail {0}`; `set +e` disables errexit but does not unset pipefail, so the pipeline's exit code propagates as the rightmost non-zero status (i.e., `tofu`'s `-detailed-exitcode` value of `2` on drift). This is a subtle reliance on GitHub's default shell flags — running the same step locally without `pipefail` would always read `tee`'s exit code (`0`) and miss drift. Worth being aware of if the workflow is ever ported elsewhere.
- The `actions/cache@v4` step caches `~/.terraform.d/plugin-cache`, but the workflow does not set `TF_PLUGIN_CACHE_DIR` (or write a CLI config containing `plugin_cache_dir`). Without that, OpenTofu won't actually populate or read the directory, so the cache step is effectively a no-op for plugin reuse. Not technically wrong, just ineffective; consider adding `env: { TF_PLUGIN_CACHE_DIR: ~/.terraform.d/plugin-cache }` to make the cache useful.
- In `drift-report.sh`, parsing for the literal word "changes" via `grep "changes" /tmp/drift.txt | tail -1` is fragile — `tofu plan -refresh-only` output wording can change across versions, and lines containing the word "changes" may appear multiple times. Adequate for an illustrative summary script but not robust enough for production reporting.
- `${{ vars[matrix.role_arn_var] }}` (dynamic indexing into the `vars` context) is supported by GitHub Actions expressions and is correct here.
- `cd -` inside a `for env in ...` loop returns to the prior directory, but the loop iterates from a single starting CWD; using a subshell `(cd "environments/$env" && ...)` per iteration would be cleaner and immune to a partial failure leaving the shell in the wrong directory. Stylistic, not incorrect.
