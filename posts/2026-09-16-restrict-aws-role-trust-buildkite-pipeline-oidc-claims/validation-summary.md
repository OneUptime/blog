# Validation Summary: How to Restrict AWS Role Trust to Specific Buildkite Pipelines with OIDC Claims

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Buildkite Pipelines
- Buildkite Agent OIDC tokens
- AWS Identity and Access Management (IAM)
- AWS Security Token Service (STS)
- OpenID Connect (OIDC)
- Buildkite AWS assume-role-with-web-identity plugin
- YAML and JSON configuration

## Sources Consulted

- Buildkite, OIDC with AWS: https://buildkite.com/docs/pipelines/security/oidc/aws
- Buildkite, `buildkite-agent oidc` reference: https://buildkite.com/docs/agent/cli/reference/oidc
- Buildkite AWS assume-role-with-web-identity plugin documentation: https://github.com/buildkite-plugins/aws-assume-role-with-web-identity-buildkite-plugin
- AWS IAM, Create a role for OpenID Connect federation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- AWS IAM, Pass session tags in AWS STS: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS IAM, Available keys for AWS OIDC federation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html#condition-keys-wif

## Issues Found
No technical issues found.

## Review Notes
The pinned plugin version `v1.7.0` and its `role-arn` configuration are current in the plugin's official example. The composite subject format, including the full Git ref and step key, matches Buildkite's documented OIDC token structure. If session tags are added later, the trust policy must permit `sts:TagSession`; the plugin documentation also requires Buildkite Agent v3.83.0 or newer for its `session-tags` option. Buildkite Agent v3.104.0 and newer automatically redacts OIDC tokens from build logs, but avoiding token output remains appropriate guidance.
