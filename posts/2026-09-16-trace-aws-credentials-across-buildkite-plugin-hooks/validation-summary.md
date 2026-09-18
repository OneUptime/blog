# Validation Summary: How to Trace AWS Credential Changes Across Buildkite Plugin Hooks

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Buildkite agent lifecycle hooks and plugin hooks
- Buildkite Agent Stack for Kubernetes
- Buildkite Docker plugin
- Buildkite AWS assume-role-with-web-identity plugin v1.7.0
- AWS CLI and AWS STS
- AWS IAM roles and OIDC web identity federation
- Bash, Python, and Buildkite pipeline YAML

## Sources Consulted
- Buildkite agent hooks documentation: https://buildkite.com/docs/agent/hooks
- Buildkite Agent v3 to v4 upgrade guide: https://buildkite.com/docs/agent/v3-v4-upgrade-guide
- Buildkite Agent Stack for Kubernetes hook and plugin documentation: https://buildkite.com/docs/agent/self-hosted/agent-stack-k8s/agent-hooks-and-plugins
- Buildkite AWS assume-role-with-web-identity plugin documentation: https://github.com/buildkite-plugins/aws-assume-role-with-web-identity-buildkite-plugin
- Buildkite AWS assume-role-with-web-identity plugin v1.7.0 schema: https://github.com/buildkite-plugins/aws-assume-role-with-web-identity-buildkite-plugin/blob/v1.7.0/plugin.yml
- Buildkite Docker plugin documentation: https://github.com/buildkite-plugins/docker-buildkite-plugin
- AWS CLI configuration and credential precedence documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html
- AWS CLI `sts get-caller-identity` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html

## Issues Found
No technical issues found.

## Review Notes
- The pinned AWS assume-role-with-web-identity plugin version, `v1.7.0`, exists and supports `hook: pre-command`; its default hook is `environment`.
- Buildkite documents that Agent Stack for Kubernetes jobs run checkout and command phases in separate containers and do not carry checkout-hook exports directly into command containers.
- The Docker plugin's `propagate-aws-auth-tokens` option can propagate web-identity variables and automatically mount `AWS_WEB_IDENTITY_TOKEN_FILE`; manually passed token-file paths still need an appropriate mount.
- AWS CLI credential precedence is nuanced and provider-specific, so the post appropriately directs readers to inspect the active sources rather than asserting an oversimplified total ordering.
