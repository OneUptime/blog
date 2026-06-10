# Validation Summary: How to Use CircleCI Config Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI Config Policies
- Open Policy Agent (OPA)
- Rego policy language
- CircleCI CLI
- YAML / CircleCI config (`.circleci/config.yml`)
- Flask (Python) for webhook handling
- Slack webhooks

## Sources Consulted
- CircleCI Config Policy Management Overview — https://circleci.com/docs/config-policy-management-overview/
- CircleCI Create & Manage Config Policies — https://circleci.com/docs/create-and-manage-config-policies
- CircleCI Config Policy Reference — https://circleci.com/docs/config-policy-reference/
- CircleCI CLI `policy` reference — https://circleci-public.github.io/circleci-cli/circleci_policy.html
- CircleCI CLI `policy fetch` reference — https://circleci-public.github.io/circleci-cli/circleci_policy_fetch.html
- circle-policy-agent GitHub repository — https://github.com/CircleCI-Public/circle-policy-agent

## Issues Found

1. **`circleci policy validate` is not a real subcommand.**
   The post used `circleci policy validate policies/` to "validate policy syntax". The actual `circleci policy` subcommands are `decide`, `diff`, `eval`, `fetch`, `logs`, `push`, `settings`, and `test`. Replaced with `circleci policy test policies/`, which is the official subcommand for running policy tests (it parses every `.rego` file and runs `*_test.rego` test files, so it also surfaces syntax errors).

2. **`circleci policy list` is not a real subcommand.**
   The post used `circleci policy list --owner-id ...` to list deployed policies. The correct approach is `circleci policy fetch --owner-id ...` without a positional argument, which returns the entire active bundle. Replaced and added a clarifying comment.

3. **`circleci policy fetch --policy-name ...` is wrong; the policy name is a positional argument.**
   The post had `circleci policy fetch --owner-id YOUR_ORG_ID --policy-name security/docker_images.rego`. The CLI takes the policy name positionally, and the name does not include the `.rego` extension. Corrected to `circleci policy fetch security/docker_images --owner-id YOUR_ORG_ID`.

4. **`input._project_slug` is not a field exposed to CircleCI policies.**
   The conditional-policies example checked `input._project_slug in production_projects` to detect production projects. CircleCI exposes pipeline metadata to policies via `data.meta` (e.g. `data.meta.project_id`, `data.meta.vcs.branch`), not via an `_project_slug` field on `input`. Replaced with `data.meta.project_id` and updated the example identifiers from `gh/my-org/...` slugs to UUID-style project IDs (which is what `data.meta.project_id` actually contains), plus a comment explaining where the value comes from.

5. **Misleading "Creating a Policy Bundle" wording.**
   The original text presented `tar -czvf policy-bundle.tar.gz ...` and `circleci policy push policies/` as alternative deployment methods. CircleCI does not accept tarball uploads; `circleci policy push <directory>` is the only deployment path. Reframed the section so the `push` command is the primary action and the `tar` command is positioned as an optional local backup, which is accurate.

## Review Notes

- The Rego v1 syntax used throughout (`import future.keywords`, `hard_fail contains decision if { ... }`, `some x in collection`) is correct and matches what CircleCI's policy-agent supports. `package org` is the required top-level package for CircleCI policies.
- The blocked-commands regex `"curl.*|.*sh"` is intentionally simple; because `|` is regex alternation, it matches "anything containing curl" OR "anything ending in sh". That's broader than the comment ("curl piping to shell") implies, but it does still catch the intended dangerous patterns. Left as-is since it is a pedagogical example and the regex itself is valid.
- The `__policy_metadata__` object is not a recognized CircleCI convention — it's just a Rego variable with no built-in meaning. The post presents it as an internal documentation pattern, which is fine, but readers should not expect CircleCI to surface those fields anywhere.
- CircleCI recommends declaring a `policy_name["..."]` identifier per file for uniquely identifying policies in decision logs. The post's examples omit this for brevity. Not strictly required for the policies to evaluate, so left unchanged.
- The output schema of `circleci policy decide` shown in the post (`status`, `hard_failures`, `soft_failures`) matches the actual decision object shape, though real output also includes `enabled_rules`. Not corrected because the example is illustrative.
- The Homebrew install (`brew install circleci`) and `circleci setup` flow are current and correct for the CircleCI CLI.
