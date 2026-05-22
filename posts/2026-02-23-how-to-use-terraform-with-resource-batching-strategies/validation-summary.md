# Validation Summary: How to Use Terraform with Resource Batching Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform language
- Terraform state and remote state
- HashiCorp AWS provider
- HashiCorp time provider
- GitHub Actions
- AWS infrastructure resources

## Sources Consulted
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform `plan` command and resource targeting reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `terraform_remote_state` data source reference: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform remote state documentation: https://developer.hashicorp.com/terraform/language/state/remote
- Terraform `depends_on` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform `range`, `ceil`, and `floor` function references: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- HashiCorp time provider `time_sleep` resource documentation: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- HashiCorp `setup-terraform` GitHub Action: https://github.com/hashicorp/setup-terraform

## Issues Found
- The dynamic batching example created `null_resource` batch gates but did not connect them to the EC2 instances, so it did not actually enforce batch ordering. Replaced it with two explicit `for_each` batches where the second batch depends on the first, which matches Terraform's static dependency model.
- The dynamic batching example wrote a numeric value into AWS tags. Updated the tag values to use `tostring(...)` so the `tags` map is unambiguously a string map.
- The `time_sleep` example depended on `aws_instance.batch_1` without showing that resource. Added the first instance batch so the example is self-contained.
- The GitHub Actions workflow ran `terraform` directly on `ubuntu-latest` without installing Terraform. Added `hashicorp/setup-terraform@v3` before each Terraform command block.

## Review Notes
Terraform CLI is not installed in this workspace, so local `terraform validate` could not be run. The review was completed against official documentation instead. The post correctly notes that `-target` is for exceptional situations rather than routine workflows.
