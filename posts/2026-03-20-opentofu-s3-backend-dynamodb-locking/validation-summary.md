# Validation Summary: How to Configure S3 Backend with DynamoDB Locking in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (S3 backend, DynamoDB state locking)
- Terraform (compatible backend syntax)
- AWS DynamoDB (lock table)
- AWS S3 (state storage)
- AWS IAM (permissions for locking)
- HCL (configuration language)
- AWS CLI (manual lock inspection)

## Sources Consulted
- [OpenTofu S3 Backend Documentation](https://opentofu.org/docs/language/settings/backends/s3/)
- [Terraform S3 Backend Documentation](https://developer.hashicorp.com/terraform/language/backend/s3)
- [OpenTofu source: internal/backend/remote-state/s3/client.go](https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/s3/client.go) (verified actual DynamoDB PutItem schema)
- [Terraform AWS provider: aws_dynamodb_table resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table)

## Issues Found

1. **Incorrect DynamoDB lock entry structure.** The "Lock File Entry" section showed `ID`, `Operation`, `Who`, `Version`, `Created`, and `Info` as separate top-level DynamoDB string attributes. In reality, the OpenTofu/Terraform S3 backend writes only two attributes per lock item: `LockID` and `Info`, where `Info` is a JSON-serialized string containing the lock metadata (`ID`, `Operation`, `Info`, `Who`, `Version`, `Created`, `Path`). Fixed by replacing the example with the actual two-attribute layout and showing `Info` as an embedded JSON string.

2. **Incorrect AWS CLI query path for retrieving the lock ID.** The `aws dynamodb get-item` example used `--query 'Item.ID.S'`, but `ID` is not a top-level attribute on the DynamoDB item — it lives inside the JSON-serialized `Info` string. Updated the command to query `Item.Info.S` and added a note that the lock ID is also shown in the error output from the failing run.

## Review Notes

- The S3 backend block, the `dynamodb_table` config option, the required `LockID` (String) hash key, and the IAM permissions list (`dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:DeleteItem`, `dynamodb:DescribeTable`) all match the official OpenTofu and Terraform documentation.
- The `aws_dynamodb_table` resource configuration, including `point_in_time_recovery` block and `PAY_PER_REQUEST` billing mode, are valid for the AWS provider.
- The lock-conflict error format (`Error acquiring the state lock: ConditionalCheckFailedException` with `ID`, `Path`, `Operation`, `Who`, `Version`, `Created`) matches OpenTofu's actual output.
- `tofu force-unlock <ID>` is the correct command for clearing a stuck lock.
- **Deprecation caveat (worth noting in a future revision):** Both OpenTofu and Terraform have marked DynamoDB-based locking as deprecated in favor of native S3 locking via `use_lockfile = true`. The post acknowledges native locking in the conclusion, which is appropriate, but readers building new infrastructure today should generally prefer the native lockfile approach. The DynamoDB documentation in this post remains accurate for existing setups and recent versions.
- OpenTofu version `1.8.0` shown in the lock metadata example is a real released version, so the example is realistic.
