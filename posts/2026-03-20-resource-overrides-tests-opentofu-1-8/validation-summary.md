# Validation Summary: How to Use Resource Overrides in Tests Introduced in OpenTofu 1.8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu 1.8
- OpenTofu test framework
- HCL test files
- Resource and data source overrides
- Provider mocks
- AWS provider resources and data sources

## Sources Consulted
- OpenTofu 1.8 test command documentation: https://opentofu.org/docs/v1.8/cli/commands/test/
- OpenTofu 1.8 "What's New" documentation: https://opentofu.org/docs/v1.8/intro/whats-new/
- OpenTofu resource addressing documentation: https://opentofu.org/docs/v1.8/cli/state/resource-addressing/
- OpenTofu v1.8.0 CLI help and `tofu test` behavior from the official release: https://github.com/opentofu/opentofu/releases/tag/v1.8.0
- AWS provider `aws_s3_bucket` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
- AWS provider `aws_db_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_caller_identity` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown
- AWS provider `aws_region` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/region.html.markdown

## Issues Found
- The post described overrides as applying only to a single `run` block. OpenTofu supports `override_resource` and `override_data` blocks at both test-file scope and run-block scope, with run-level overrides taking precedence for the same target. Updated the explanation and summary.
- The post repeatedly referred to overriding individual resource instances. OpenTofu override targets are resource or data source addresses, and OpenTofu does not support overriding only one instance of a multi-instance resource. Updated the wording to "resource address" or "resource or data source address."
- The module example asserted against `module.database.aws_db_instance.main.port`, but tests can read the child module object through its exposed outputs, not its internal resource attributes. Kept the override target as the full child resource address and changed the assertion to `module.database.db_port`.
- The AWS region data source example used `name`, which is deprecated in the current AWS provider. Updated the override to use `region`.
- The `tofu test -verbose` comment said it shows override details. The OpenTofu CLI help says `-verbose` prints the plan or state for each test run block, so the command comment was corrected.

## Review Notes
- The snippets are partial examples and assume matching root module resources, variables, provider configuration, and a `db_port` output from the `database` module.
- Verified representative override behavior with OpenTofu v1.8.0 in temporary test configurations, including run-level resource overrides with provider mocks, child-module resource targeting with module-output assertions, and the current AWS provider `aws_region.region` data override.
