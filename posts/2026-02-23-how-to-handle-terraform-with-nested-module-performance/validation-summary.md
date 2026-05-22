# Validation Summary: How to Handle Terraform with Nested Module Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform modules
- Terraform dependency graph and expression references
- Terraform CLI state commands
- AWS provider data sources and EC2 resources
- HCL configuration

## Sources Consulted
- Terraform module composition documentation: https://developer.hashicorp.com/terraform/language/modules/develop/composition
- Terraform references and implicit dependency documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform `depends_on` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform state command documentation: https://docs.hashicorp.com/terraform/cli/commands/state
- AWS provider `aws_vpc` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The post claimed that module output references create dependencies between every resource in both modules. Terraform creates implicit dependencies from references to the specific values being consumed; broad dependencies are more typical when an output combines many upstream resources or when `depends_on` targets an entire module. Updated the explanation and example comments to reflect Terraform's dependency model.
- The post claimed resources in a parent module cannot start until all dependencies in deeper sub-modules are resolved. Updated this to clarify that only resources consuming those deeper values are blocked by those specific dependencies.
- The `aws_instance` example assigned a VPC ID to `subnet_id`. `aws_instance.subnet_id` requires a subnet ID, so the example now uses `aws_subnets` filtered by VPC and tag, then passes a subnet ID.
- The command for counting module depth was fragile and could miscount module address depth. Replaced it with an `awk` command that counts module address segments directly.
- The command for finding module source calls piped `grep` output into `awk` using `FILENAME`, which would print the pipe name instead of the original Terraform file. Replaced it with a direct recursive `grep` that includes filenames and line numbers.
- The output-surface section overstated that merely defining many outputs creates graph edges. Updated it to say that consuming many outputs can widen the dependency surface.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was checked against official Terraform documentation and the shell text-processing pipeline was tested with representative state addresses.
