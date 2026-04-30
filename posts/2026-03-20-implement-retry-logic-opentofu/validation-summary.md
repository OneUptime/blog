# Validation Summary: How to Implement Retry Logic with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider
- Google provider
- HashiCorp `time` provider
- Bash

## Sources Consulted
- OpenTofu `terraform_data` documentation: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `local-exec` provisioner: https://opentofu.org/docs/v1.8/language/resources/provisioners/local-exec/
- OpenTofu resource syntax and `timeouts`: https://opentofu.org/docs/language/resources/syntax/
- OpenTofu `lifecycle` meta-argument: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu `tofu apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider documentation overview: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS SDK retry behavior: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- AWS `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Google `google_container_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- HashiCorp `time` provider documentation: https://registry.terraform.io/providers/hashicorp/time/latest
- HashiCorp `time_sleep` resource documentation: https://registry.terraform.io/providers/hashicorp/time/0.11.2/docs/resources/sleep.html

## Issues Found
- The description referenced `null_resource` and `external_provider` patterns, but the post did not cover an external provider pattern, and current OpenTofu documentation documents `terraform_data` for provisioners without a specific resource. I updated the description and the provisioner example to use `terraform_data`.
- The AWS example said `max_retries` defaults to `3`. Current AWS provider documentation says the default is `25`, so I corrected the comment.
- The post claimed that each or most resources support `timeouts` blocks. OpenTofu documentation says only some resource types provide `timeouts`, and most do not, so I corrected that wording in both places.
- The `create_before_destroy` section described the behavior as "Zero-Downtime Replacements" and said it ensures the new instance is ready before the old one is deleted. OpenTofu documents this as a create-first/destroy-later lifecycle behavior with important coexistence constraints, not a zero-downtime guarantee, so I corrected the heading and explanation.
- The `time_sleep` section did not identify that `time_sleep` comes from the `time` provider. I clarified that in the text.

## Review Notes
- The CI example `tofu apply -auto-approve -input=false` is valid per the OpenTofu CLI docs. In many CI workflows, applying a previously saved plan file is still preferable for change control, but the example is technically correct as written.
- The workspace did not have the `tofu` binary installed, so CLI behavior was verified against the official OpenTofu command documentation rather than local `--help` output.
