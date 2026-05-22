# Validation Summary: How to Use Sentinel Functions and Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Sentinel
- Sentinel modules and functions
- Sentinel CLI testing
- HCP Terraform and Terraform Enterprise policy sets
- Terraform `tfplan/v2` Sentinel import
- AWS policy validation examples

## Sources Consulted
- HashiCorp Sentinel language functions documentation: https://developer.hashicorp.com/sentinel/docs/language/functions
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel CLI configuration syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Sentinel modules documentation: https://developer.hashicorp.com/sentinel/docs/extending/modules
- HashiCorp Sentinel testing documentation: https://developer.hashicorp.com/sentinel/docs/writing/testing
- HashiCorp Sentinel `test` command documentation: https://developer.hashicorp.com/sentinel/docs/commands/test
- HCP Terraform Sentinel policy set documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Help Center note on deprecated Sentinel CLI `module` blocks: https://support.hashicorp.com/hc/en-us/articles/18519870120083-Sentinel-Warning-Deprecation-warning-module-block

## Issues Found
- The first `strings.has_prefix` example used the `strings` import without importing it. Added `import "strings"` to make the snippet complete.
- The security group validation helper iterated directly over `rule.cidr_blocks`, which can fail when that attribute is absent. Added a default empty list before iterating.
- The `require-tags` policy attempted to access `tf.tfplan.resource_changes` through a module import. Sentinel modules export their own values and functions, but policies should import `tfplan/v2` directly when reading plan data. Added `import "tfplan/v2" as tfplan` and changed the filter to use `tfplan.resource_changes`.
- The AWS region helper comment said it was reading provider configuration, but the example only reads a resource attribute. Updated the comment to match the code.
- The testing example mocked the local helper module. For Sentinel CLI test configuration, local module dependencies should be configured with `import "module"`, while `mock` remains appropriate for `tfplan/v2` test data. Updated the test snippet accordingly.
- The versioned module example used a `git::` source. HCP Terraform policy sets support local files and HTTP/HTTPS remote module sources, so the example now uses a raw GitHub URL pinned to the `v1.2.0` tag.

## Review Notes
The post is technically relevant and now aligns with current HashiCorp Sentinel and HCP Terraform documentation. The examples remain illustrative; production policies may need additional checks for unknown Terraform plan values and provider-specific schema differences.
