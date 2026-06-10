# Validation Summary: How to Use Environment Variables in CircleCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (config version 2.1)
- CircleCI Orbs (`circleci/aws-cli`, `circleci/node`, `circleci/circleci-cli`)
- CircleCI Contexts and Pipeline Parameters
- `BASH_ENV` for cross-step environment variables
- HashiCorp Vault (with CircleCI OIDC integration via `CIRCLE_OIDC_TOKEN`)
- AWS ECR / ECS (deploy targets in the example)
- Docker (cimg convenience images: `cimg/node`, `cimg/aws`, `cimg/base`)
- Node.js / npm
- jq, curl, bash

## Sources Consulted
- CircleCI environment variable reference: https://circleci.com/docs/env-vars/
- CircleCI built-in environment variables: https://circleci.com/docs/variables/#built-in-environment-variables
- CircleCI OpenID Connect tokens: https://circleci.com/docs/openid-connect-tokens/
- CircleCI configuration reference (jobs, steps, workflows, conditional `when`): https://circleci.com/docs/configuration-reference/
- CircleCI secret masking blog post: https://circleci.com/blog/keep-environment-variables-private-with-secret-masking/
- CircleCI orb registry: https://circleci.com/developer/orbs (`circleci/aws-cli`, `circleci/node`, `circleci/circleci-cli`)
- HashiCorp Vault `kv get` command reference: https://developer.hashicorp.com/vault/docs/commands/kv/get

## Issues Found

1. **Incorrect claim about automatic masking of runtime secrets (and a non-existent "mask" orb).**
   The original "Masking Custom Variables" section claimed that the `circleci-cli` orb provides masking and that any output containing a token appended to `$BASH_ENV` would automatically show as `****`. This is not how CircleCI works — only variables set via Project Settings or Contexts are auto-masked, and there is no `mask` orb. I renamed the section to "Handling Dynamically Generated Secrets," removed the non-existent orb reference, dropped the false auto-masking comment, and rewrote the example to recommend not echoing the token and redirecting noisy output to `/dev/null`.

2. **Broken Vault example: `vault kv get -field=...` piped directly into `$BASH_ENV`.**
   `vault kv get -field=<name>` prints only the raw value (no key, no newline), so `vault kv get -field=api_key ... >> $BASH_ENV` would write a bare value into the env file rather than a valid `export FOO=bar` line, and subsequent steps would not pick up the variable. I changed both lines to wrap the value with `echo "export API_KEY=$(vault kv get ...)" >> $BASH_ENV` (and the same for `DATABASE_URL`), and updated the surrounding comment to note that `VAULT_TOKEN` is obtained via OIDC rather than stored.

## Review Notes
- All listed built-in environment variables (`CIRCLE_BRANCH`, `CIRCLE_SHA1`, `CIRCLE_BUILD_NUM`, `CIRCLE_PULL_REQUEST`, `CIRCLE_PROJECT_REPONAME`, `CIRCLE_PROJECT_USERNAME`, `CIRCLE_JOB`, `CIRCLE_WORKING_DIRECTORY`) are confirmed real.
- `CIRCLE_OIDC_TOKEN` is correct; CircleCI also exposes a `CIRCLE_OIDC_TOKEN_V2`, but the V1 name used in the post is still valid.
- Workflow `when:` conditionals using `equal: [a, b]` and `and:` are correctly used.
- Step-level `environment:` on a `run` step is supported and used correctly.
- `circleci/aws-cli@4.0` is a stale but valid version (current major is 5.x). Not changed since the post does not claim "latest" and the example still works as written.
- `circleci/circleci-cli@0.1.9` and `circleci/node@5.0` are valid versions. After the rewrite of the masking section, the `circleci-cli` orb is no longer referenced.
- The post uses `cimg/aws:2024.03`, which is a dated convenience image tag. Functional, but a future update could refresh to a more recent tag (e.g., 2025.x).
- The Vault install step omits `-y` on `apt-get install` — would prompt interactively in some images, but `cimg/base:current` typically runs non-interactively. Left as-is.
