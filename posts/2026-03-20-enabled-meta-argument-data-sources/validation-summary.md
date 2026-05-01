# Validation Summary: How to Use the enabled Meta-Argument with Data Sources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider data sources
- AWS VPC, Secrets Manager, ACM, EC2 Key Pair, and Availability Zones lookups

## Sources Consulted
- OpenTofu data sources documentation: https://opentofu.org/docs/language/data-sources/
- OpenTofu `enabled` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/enabled/
- OpenTofu `count` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu `provider` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/resource-provider/
- OpenTofu `try` function documentation: https://opentofu.org/docs/language/functions/try/
- AWS provider `aws_vpc` data source docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc.html.markdown
- AWS provider `aws_secretsmanager_secret_version` data source docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret_version.html.markdown
- AWS provider `aws_acm_certificate` data source docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/acm_certificate.html.markdown
- AWS provider `aws_key_pair` data source docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/key_pair.html.markdown
- AWS provider `aws_availability_zones` data source docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/availability_zones.html.markdown

## Issues Found
- The opening claim was outdated: the post said OpenTofu does not support an `enabled` meta-argument for data sources, but current OpenTofu docs show that data sources support `lifecycle { enabled = ... }` in OpenTofu v1.11+. I corrected the introduction, description, summary table, and closing summary to reflect the documented behavior.
- The secret lookup example used the older `count` workaround as the primary pattern even though the post is about `enabled`. I changed the example to use `lifecycle { enabled = var.environment == "production" }` and updated the local value to guard access safely with a null check.
- The ACM certificate example also used `count` for the data source and could fail when multiple matching certificates exist. I changed it to use `lifecycle { enabled = var.enable_https }`, added `most_recent = true`, and updated the listener to guard access safely.
- The safe-access section text and code did not match: the comment said to use `try()`, but the example used a conditional expression instead. I updated the example to actually use `try()` with an `enabled`-based data source so the guidance matches the code.
- The `for_each` section did not actually demonstrate an enable/disable pattern. I replaced it with a self-contained named optional data source example using `for_each = var.enable_az_lookup ? toset(["main"]) : toset([])`, which matches the pattern summary and OpenTofu instance-key behavior.
- The VPC example referenced `aws_vpc.new[0].id` even though the snippet did not show `aws_vpc.new` as a counted resource. I corrected that reference to `aws_vpc.new.id` so the example is consistent as written.

## Review Notes
- `enabled` is version-specific: it is available in OpenTofu v1.11 and later. The retained `count` and `for_each` patterns are still useful for older configurations or when indexed/keyed instances are required.
- The code snippets are illustrative fragments and still assume surrounding objects such as `aws_vpc.new`, `aws_lb.app`, `aws_lb_target_group.app`, and `data.aws_ami.amazon_linux` exist elsewhere in the configuration.
