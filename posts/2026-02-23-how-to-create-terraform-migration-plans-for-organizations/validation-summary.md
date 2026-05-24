# Validation Summary: How to Create Terraform Migration Plans for Organizations

## Status
validated

## Post Type
Guide (organizational/planning guide with supporting code and config examples)

## Technologies Covered
- Terraform (CLI, HCL, import workflow, lifecycle blocks)
- AWS Provider for Terraform (`aws_instance`, `aws_instances` data source, `aws_vpc`, `aws_subnet`, `aws_security_group`, `aws_s3_bucket`, `aws_db_instance`, `aws_iam_role`, `aws_ecs_service`, `aws_lb`)
- AWS CloudFormation (resource type names)
- AWS CLI (`aws ec2 describe-instances` with JMESPath `--query`)
- S3 + DynamoDB remote state backend
- Python 3 (`json`, `yaml`/PyYAML)
- YAML for planning artifacts

## Sources Consulted
- Terraform CLI import documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform AWS Provider `aws_instances` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instances
- Terraform AWS Provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider `aws_lb` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform `lifecycle` meta-argument (`prevent_destroy`, `ignore_changes`): https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- AWS CloudFormation resource types reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html
- AWS CLI `ec2 describe-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- JMESPath specification: https://jmespath.org/specification.html
- terraformer project (referenced in a comment): https://github.com/GoogleCloudPlatform/terraformer

## Issues Found
- Formatting fix only: the "Resource Import Strategy" heading was missing the `##` Markdown prefix, leaving it as plain text rather than a section heading consistent with the rest of the post. Updated to `## Resource Import Strategy`. No technical/code corrections were needed.

## Review Notes
- All CloudFormation-to-Terraform resource-type mappings in `CFN_TO_TF_MAP` were verified against current AWS Provider documentation and are correct.
- `terraform import aws_instance.web_server_1 i-0123456789abcdef0` uses correct CLI syntax and a properly formatted 17-character EC2 instance ID.
- The escaped import command for map/for_each keyed resources (`terraform import 'aws_instance.team_instances["${instance}"]' ${instance}`) is syntactically correct for shell quoting.
- The `aws_instances` (plural) data source is real and exposes the `ids` attribute used in the example. The `tag:Team` and `instance-state-name` filters are valid EC2 filters.
- The AWS CLI JMESPath query `Reservations[].Instances[].[InstanceId,Tags[?Key==\`Name\`].Value|[0],State.Name]` is well-formed.
- S3 + DynamoDB is presented as the remote-state backend choice. This is still a fully supported and very common pattern; note that Terraform 1.10+ also supports native S3 state locking without DynamoDB, but recommending the DynamoDB approach is not incorrect.
- The Python snippets are illustrative data-structure examples and are syntactically valid Python 3.
- YAML examples are conceptual planning artifacts (not consumed by any specific tool); values like `35%` will be parsed as strings by standard YAML parsers, which is acceptable for descriptive content.
- Best-practices guidance (import-then-manage workflow, `prevent_destroy`/`ignore_changes` usage, migrating foundational resources first, running old and new tooling in parallel) aligns with HashiCorp's recommended migration practices.
