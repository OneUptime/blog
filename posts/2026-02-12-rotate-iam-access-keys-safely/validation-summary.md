# Validation Summary: How to Rotate IAM Access Keys Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS IAM access keys
- AWS CLI
- AWS Secrets Manager
- AWS STS
- AWS Config managed rules
- AWS CloudTrail
- AWS Lambda
- Python
- boto3

## Sources Consulted
- AWS IAM User Guide: Manage access keys for IAM users: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- AWS IAM User Guide: How an IAM administrator can manage IAM user access keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-keys-admin-managed.html
- AWS CLI Command Reference: iam create-access-key: https://docs.aws.amazon.com/cli/latest/reference/iam/create-access-key.html
- AWS CLI Command Reference: secretsmanager update-secret: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/update-secret.html
- AWS CLI Command Reference: configservice put-config-rule: https://docs.aws.amazon.com/cli/latest/reference/configservice/put-config-rule.html
- AWS Config Developer Guide: ACCESS_KEYS_ROTATED managed rule: https://docs.aws.amazon.com/config/latest/developerguide/access-keys-rotated.html
- boto3 documentation: Managing IAM access keys: https://docs.aws.amazon.com/boto3/latest/guide/iam-example-managing-access-keys.html
- boto3 documentation: IAM ListUsers paginator: https://docs.aws.amazon.com/boto3/latest/reference/services/iam/paginator/ListUsers.html
- AWS General Reference: IAM endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/iam-service.html

## Issues Found
- The stale-key detection script used `iam.list_users()["Users"]`, which only processes the first IAM user response page in accounts with many users. Changed it to use the official boto3 `list_users` paginator so the script actually checks all users.
- The Lambda automation example also used `iam.list_users()["Users"]` and non-paginated `list_user_tags`, which could skip users or tags. Changed both to use boto3 paginators.
- The Lambda automation checked `len(active_keys) >= 2` before creating a new key. IAM allows a maximum of two access keys per user total, regardless of whether they are active or inactive, so `create_access_key` can fail when one active and one inactive key already exist. Changed the check to `len(keys) >= 2`.

## Review Notes
- AWS CLI is not installed in this workspace, so CLI verification was performed against the official AWS CLI command reference rather than local `--help` output.
- The AWS Config `ACCESS_KEYS_ROTATED` rule is correct, but AWS documents regional limitations for managed rules that evaluate global IAM resource types. The post's snippet remains valid as a basic example.
- The embedded Python examples were parsed with Python `ast` after edits and are syntactically valid.
