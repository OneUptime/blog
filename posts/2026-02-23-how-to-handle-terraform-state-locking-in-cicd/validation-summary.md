# Validation Summary: How to Handle Terraform State Locking in CI/CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform state locking and backends
- Terraform S3, GCS, AzureRM, Consul, and PostgreSQL backends
- AWS S3 and DynamoDB
- AWS CloudWatch metrics and alarms
- GitHub Actions
- GitLab CI/CD
- Python and boto3

## Sources Consulted
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- HashiCorp Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI command documentation: https://developer.hashicorp.com/terraform/cli/commands
- HashiCorp AWS provider aws_dynamodb_table documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- HashiCorp AWS provider aws_cloudwatch_metric_alarm documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS DynamoDB CloudWatch metrics documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitLab resource_group documentation: https://docs.gitlab.com/ci/resource_groups/

## Issues Found
- The post described DynamoDB as the standard locking mechanism for the S3 backend. Current Terraform documentation marks DynamoDB-based S3 locking as deprecated and recommends native S3 lockfiles with `use_lockfile = true`. Updated the S3 section to lead with native S3 locking and keep DynamoDB as legacy guidance.
- The backend summary said the GCS backend uses built-in object locking, which could be confused with Google Cloud Storage object retention/lock features. Changed this to built-in backend locking.
- The DynamoDB lock example used a `LockID` ending in `-md5` and represented `Info` as a nested JSON object. For DynamoDB locking, Terraform stores the lock information under the state path lock ID, while `Info` is stored as a string containing JSON. Updated the example and stale-lock lookup command.
- The retry example ran `terraform plan` twice on each failed attempt: once to test success and again to grep for the lock error. Changed it to capture output and status from one command execution.
- The stale lock cleanup script scanned only the first DynamoDB page and deleted locks without checking that the lock item was unchanged. Added scan pagination and a conditional delete on the original `Info` value.

## Review Notes
The post still includes DynamoDB stale-lock detection and cleanup because many existing Terraform S3 backends use that legacy mechanism. New S3 backend configurations should use `use_lockfile = true` instead.
