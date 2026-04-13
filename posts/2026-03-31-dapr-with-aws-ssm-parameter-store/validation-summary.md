# Validation Summary: How to Use Dapr with AWS SSM Parameter Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secretstores.aws.parameterstore component)
- AWS Systems Manager (SSM) Parameter Store
- AWS KMS (for SecureString encryption)
- AWS IAM (for access policies)
- Python (requests library for Dapr HTTP API)
- AWS CLI (ssm put-parameter)

## Sources Consulted
- Dapr secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr AWS SSM Parameter Store component spec: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-parameter-store/
- AWS CLI ssm put-parameter reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS SSM Parameter Store documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS IAM policy actions for SSM: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssystemsmanager.html

## Issues Found
1. **Prefix behavior comment was incorrect**: The comment in the `get_parameter` function stated "the component strips /myapp from the path", but the prefix is actually prepended to the key when making SSM requests. Changed to "the component prepends /myapp to the key".

2. **Parameter names included prefix redundantly**: The `get_parameter` calls used full paths like `/myapp/config/log-level` and `/myapp/secrets/db-password`, but with `prefix: /myapp` configured on the component, the prefix is automatically prepended. This would cause the component to look up `/myapp/myapp/config/log-level`. Fixed to use `config/log-level` and `secrets/db-password` respectively.

3. **Unused `path` parameter in bulk function**: The `get_parameters_by_path(path: str)` function accepted a `path` parameter that was never used in the function body. The Dapr bulk secrets API (`/v1.0/secrets/{store}/bulk`) does not accept a path filter in the URL; the component uses the configured `prefix` to scope the bulk retrieval. Renamed function to `get_all_parameters()` with no parameters, and added a clarifying comment.

4. **secretKeyRef used full paths with prefix**: The Redis state store component config used `/myapp/secrets/redis-password` for both `name` and `key` in the `secretKeyRef`. Since the `ssm-secrets` store has `prefix: /myapp` configured, Dapr prepends the prefix automatically. Fixed to `secrets/redis-password`.

## Review Notes
- The AWS CLI commands are syntactically correct. The `--tags` shorthand syntax with `put-parameter` is valid only when creating new parameters (not with `--overwrite`), which matches the usage shown.
- The IAM policy correctly includes `ssm:GetParameter`, `ssm:GetParameters`, and `ssm:GetParametersByPath` permissions, along with `kms:Decrypt` for SecureString parameters.
- The comparison between SSM Parameter Store and Secrets Manager is accurate and provides useful guidance for choosing between the two services.
- The Dapr component type `secretstores.aws.parameterstore` and API version `dapr.io/v1alpha1` are correct.
