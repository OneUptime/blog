# Validation Summary: How to Configure ECR Lifecycle Policies with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS
- Amazon ECR
- AWS CLI
- IAM policy documents
- Docker image lifecycle management
- HCL

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/
- OpenTofu `init` command: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_ecr_repository` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_repository.html.markdown
- AWS provider `aws_ecr_lifecycle_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_lifecycle_policy.html.markdown
- AWS provider `aws_ecr_repository_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_repository_policy.html.markdown
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR lifecycle policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- Creating a lifecycle policy preview in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lpp_creation.html
- AWS CLI `get-lifecycle-policy`: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-lifecycle-policy.html
- AWS CLI `start-lifecycle-policy-preview`: https://docs.aws.amazon.com/cli/latest/reference/ecr/start-lifecycle-policy-preview.html
- AWS CLI `get-lifecycle-policy-preview`: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-lifecycle-policy-preview.html
- AWS CLI ECR wait commands: https://docs.aws.amazon.com/cli/latest/reference/ecr/wait/

## Issues Found
- The post used `tagPrefixList` values like `["dev-", "pr-"]` and `["v", "release-"]` as if they were OR conditions. AWS documents that multiple tag prefixes in one rule are matched as AND conditions, so those examples would not behave as described for typical single-tagged images. I split those into separate rules with distinct priorities.
- The production example had a rule with `tagStatus = "tagged"` but no `tagPrefixList` or `tagPatternList`. AWS requires one of those when `tagStatus` is `tagged`, so that rule was invalid. I changed the catch-all retention rule to use `tagStatus = "any"` and moved it to the highest `rulePriority`, which AWS requires for `any`.
- The preview section used only `aws ecr get-lifecycle-policy-preview`. AWS documents preview as a start-and-retrieve flow, so I added `aws ecr start-lifecycle-policy-preview` and `aws ecr wait lifecycle-policy-preview-complete` before retrieving the results.

## Review Notes
`image_scanning_configuration { scan_on_push = true }` is still valid in the AWS provider and repository-level scanning remains supported. AWS also offers newer registry-level enhanced scanning options, but the post's repository example is still technically correct.
