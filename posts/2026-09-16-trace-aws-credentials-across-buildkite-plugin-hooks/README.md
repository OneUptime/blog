# How to Trace AWS Credential Changes Across Buildkite Plugin Hooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, AWS, Security, Troubleshooting, CI/CD

Description: Locate AWS role changes by Buildkite hook phase and compare host and container identities without exposing credentials.

---

An artifact download succeeds under one AWS role, but the deployment command runs as another. In Buildkite, that can be expected: plugins and hooks may acquire credentials at different phases, and the AWS CLI chooses credentials from several possible sources.

Trace effective identity at the boundaries where it changes. Printing every environment variable is unnecessary and can expose credentials without explaining which provider the AWS CLI actually used.

## Start with the hook sequence

Buildkite runs hooks by lifecycle phase and scope. A plugin's `environment` hook runs much earlier than its `pre-command` hook. Reordering plugins in YAML does not move a `pre-command` hook ahead of every `environment` hook.

For ordinary self-hosted jobs, exported environment changes from shell hooks can affect later phases. Repository hooks run only after checkout has made them available. Kubernetes stack jobs have additional container boundaries: exports in a checkout container do not automatically become exports in a command container. The [hook documentation](https://buildkite.com/docs/agent/hooks) describes these distinctions.

Create a short inventory for the affected step: agent hooks, repository hooks, plugin versions, each plugin's credential-related hook, and whether the application runs on the host or inside Docker. Record the agent version and hook-order mode too: the [v3-to-v4 upgrade guide](https://buildkite.com/docs/agent/v3-v4-upgrade-guide) documents the change to reverse post-hook ordering in v4. That inventory is more useful than the visual order of plugin names alone.

## Add an identity probe

Save a small diagnostic script in a trusted location on the agent:

```bash
#!/usr/bin/env bash
set -euo pipefail
set +x

phase=${1:?Supply a diagnostic phase label}
printf 'AWS identity at %s\n' "$phase"
aws sts get-caller-identity \
  --query '{Account:Account,Arn:Arn}' \
  --output json
```

The [STS command](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html) reports the effective caller. It does not return secret access keys or session tokens. Account IDs and role names can still reveal internal infrastructure, so keep diagnostics within the appropriate build visibility.

Run this probe after the relevant environment hooks, in a repository `pre-command` hook, and at the beginning of the actual command. Label each invocation distinctly. A repository `pre-command` probe occurs before plugin `pre-command` hooks, so a change between that probe and the command is useful evidence.

For finer resolution, add a temporary diagnostic hook to a pinned internal plugin or instrument your controlled plugin around its credential exchange. Keep that change scoped to a diagnostic queue or build instead of modifying a shared plugin checkout in place.

## Understand the assume-role plugin timing

The official [AWS web-identity plugin](https://github.com/buildkite-plugins/aws-assume-role-with-web-identity-buildkite-plugin) defaults to acquiring credentials in its `environment` hook. It also supports `hook: pre-command` when a later credential change is intended.

For example:

```yaml
steps:
  - label: "Check deployment identity"
    command: "aws sts get-caller-identity"
    plugins:
      - aws-assume-role-with-web-identity#v1.7.0:
          role-arn: "arn:aws:iam::123456789012:role/ci-deploy"
          hook: pre-command
```

Replace the example account and role and configure the corresponding OIDC trust policy. The AWS CLI and agent must be available where the plugin hook executes.

Choosing the later hook can leave earlier artifact or checkout operations using another identity. That is useful only if those operations are deliberately authorized under that earlier role. Document the intended identity at each stage instead of treating every change as a bug.

## Check credential precedence

An unexpected role may come from explicit `--profile` usage, exported access keys, web-identity variables, credential files, container credentials, or an instance role. The AWS CLI's [configuration precedence guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) is the authority for how these inputs interact.

Record whether relevant variable names are present without printing their contents:

```bash
python3 - <<'CHECK'
import os
names = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
         "AWS_PROFILE", "AWS_WEB_IDENTITY_TOKEN_FILE", "AWS_ROLE_ARN",
         "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI"]
for name in names:
    print(f"{name}: {'set' if os.environ.get(name) else 'unset'}")
CHECK
```

Check the command for explicit profile flags and the agent service account for persistent credential files. Do not “fix” the problem by randomly unsetting variables until a request succeeds. Establish which provider should own the operation, then remove only the unintended source through the controlled agent or pipeline configuration.

## Probe inside the container too

A correct host identity does not prove the application container receives the same credentials. The Docker plugin can pass selected variables or AWS authentication variables, but a token-file path also requires the file to be accessible inside the container.

Run the identity probe in the same image, environment, and filesystem mounts as the deployment tool. Avoid copying the host's entire home directory to make authentication work; that can introduce unrelated profiles and credentials.

If the container uses a different AWS SDK from the host CLI, inspect that SDK's provider configuration too. An application that explicitly constructs credentials may bypass the default chain entirely.

## Confirm the intended transitions

The finished diagnosis should describe a sequence such as “checkout uses the agent role; pre-command assumes the deployment role; the container uses that same temporary role.” Verify an unauthorized role assumption fails and that secrets do not appear in logs.

Remove temporary probes after the incident or keep only a minimal identity assertion before privileged operations. A clear assertion of the expected role catches regressions without turning every build into a credential debugging session.
