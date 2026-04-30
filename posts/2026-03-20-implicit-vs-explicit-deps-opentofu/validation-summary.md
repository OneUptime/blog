# Validation Summary: How to Understand Implicit vs Explicit Dependencies in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- `depends_on`
- Module dependencies
- Data sources
- Graphviz DOT output
- AWS provider example resources (`aws_iam_role`, `aws_iam_instance_profile`, `aws_iam_role_policy`, `aws_instance`)

## Sources Consulted
- OpenTofu docs: `depends_on` meta-argument: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu docs: Resource behavior and dependency inference: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu docs: Data sources and data resource dependencies: https://opentofu.org/docs/v1.11/language/data-sources/
- OpenTofu docs: Module syntax and module meta-arguments: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu CLI docs: `tofu graph`: https://opentofu.org/docs/cli/commands/graph/
- Graphviz command-line docs for `dot -Tsvg -o`: https://graphviz.org/doc/info/command.html
- Terraform Registry AWS provider docs: `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform Registry AWS provider docs: `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform Registry AWS provider docs: `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The original explicit-dependency example used `aws_lambda_function` with missing required arguments and referenced an undefined `aws_iam_role.lambda` resource. I replaced it with a technically valid hidden-dependency example using IAM role, instance profile, inline role policy, and an EC2 instance.
- The post described `depends_on` as waiting for IAM policy propagation and other "side effects." I reworded this to match the OpenTofu docs more closely: `depends_on` controls ordering for hidden dependencies that are not expressed through attribute references.
- The module-level `depends_on` explanation said one module's resources are created before another module's resources. I tightened this to the documented behavior: OpenTofu finishes processing the dependency module before processing the dependent module, including associated resources and data sources.
- The "When to Use Each" table overstated data-source usage by implying any data source that needs a resource first requires `depends_on`. I corrected this to the narrower case where the data source must wait on a resource it does not reference directly.
- The section on unnecessary `depends_on` originally described the main downside as "cascading rebuilds." I updated that wording to the documented consequence that `depends_on` can reduce parallelism and make plans more conservative than necessary.

## Review Notes
- The revised EC2 example still uses a placeholder AMI ID, which is acceptable for an illustrative snippet but must be replaced with a valid AMI for a real apply. The dependency behavior shown is correct.
- `tofu` and `dot` were not installed in the local review environment, so command verification for `tofu graph` and Graphviz output was done against official documentation rather than local `--help` output.
