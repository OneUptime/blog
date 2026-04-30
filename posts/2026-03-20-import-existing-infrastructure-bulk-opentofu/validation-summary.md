# Validation Summary: How to Import Existing Infrastructure in Bulk with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CLI
- AWS Config
- HashiCorp AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_iam_role`, `aws_db_instance`)
- `jq`

## Sources Consulted
- OpenTofu import language docs: https://opentofu.org/docs/language/import/
- OpenTofu generating configuration docs: https://opentofu.org/docs/v1.9/language/import/generating-configuration/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `import` command docs: https://opentofu.org/docs/cli/import/
- AWS CLI `configservice list-discovered-resources`: https://docs.aws.amazon.com/cli/latest/reference/configservice/list-discovered-resources.html
- AWS Config recording scope: https://docs.aws.amazon.com/config/latest/developerguide/select-resources.html
- AWS Config supported resource types: https://docs.aws.amazon.com/config/latest/developerguide/resource-config-reference.html
- AWS provider `aws_vpc` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider `aws_subnet` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_internet_gateway` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- AWS provider `aws_iam_role` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_db_instance` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The post said OpenTofu `1.5+` can generate configuration from imports. I changed this to OpenTofu `1.6+` and marked the feature as experimental, which matches the official OpenTofu documentation.
- The `tofu plan -generate-config-out` example did not mention that the output path must be a new file. I corrected the command comment so it matches the documented behavior of `-generate-config-out`.
- The scripted import-block example targeted `aws_instance.instances["..."]` without stating that this assumes an existing `for_each`-based resource configuration. I added that prerequisite and made the generated `for_each` key handling safer for missing `Name` tags and non-alphanumeric characters.
- The phased `tofu import` workflow did not say that matching `resource` blocks must already exist. I added that prerequisite because the CLI import workflow requires existing resource configuration.
- The AWS Config section said it can enumerate "all resources in an account". I corrected this to recorded resources of supported types in a region, which is the scope documented by AWS Config.
- The cleanup section implied that `tofu apply -target=...` applies only non-destructive changes. I changed the wording to describe it accurately as applying a specific reconciliation after review; `-target` narrows scope but does not filter change actions by destructiveness.

## Review Notes
- No remaining technical inaccuracies were found after the corrections above.
- The examples assume the AWS provider is already configured and initialized in the working directory where `tofu` commands are run.
- AWS Config discovery examples depend on AWS Config recording the relevant supported resource types in the selected region.
- OpenTofu still documents `-generate-config-out` as experimental, so generated HCL should be reviewed carefully before applying.
