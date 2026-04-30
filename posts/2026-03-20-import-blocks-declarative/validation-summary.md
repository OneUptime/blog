# Validation Summary: How to Use Import Blocks for Declarative Import in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CLI
- Amazon EC2
- Amazon VPC
- HCL
- Infrastructure as Code

## Sources Consulted
- OpenTofu import block documentation: https://opentofu.org/docs/language/import/
- OpenTofu CLI import documentation: https://opentofu.org/docs/cli/import/
- OpenTofu 1.7 release notes / what's new: https://opentofu.org/docs/v1.7/intro/whats-new/
- OpenTofu configuration generation for imports: https://opentofu.org/docs/v1.9/language/import/generating-configuration/
- AWS CLI `describe-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI `describe-vpcs` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html

## Issues Found
- The introduction said OpenTofu 1.5 introduced `import` blocks. I removed that version claim because OpenTofu's stable line begins at 1.6, and OpenTofu 1.7 documentation only specifically calls out `for_each` support as the newer addition.
- The AWS CLI JMESPath queries used `=="Name"` instead of the documented string-literal form used in AWS CLI examples. I changed both queries to use `` `Name` `` and extract the first matching tag value.
- The sample `aws_instance` configuration referenced `aws_subnet.public.id`, but no subnet resource was defined in the example. I removed that undefined reference so the snippet is self-consistent.
- The workflow implied that import blocks must be removed after import. I corrected this to match OpenTofu documentation, which says they can be removed or left in configuration as a record of the resource's origin.
- The post said `tofu plan` should show no changes after removing the import blocks. I qualified that statement so it only applies when the written resource configuration matches the imported infrastructure.
- The `for_each` section did not mention that config generation is unavailable for looped import blocks. I added that caveat from the OpenTofu docs.
- The advantages table said config generation was available in 1.6+ without noting its documented status. I updated it to say `1.6+, experimental`.

## Review Notes
- The post is now technically correct as a conceptual guide, but the resource attribute values are still illustrative placeholders and must match the real infrastructure to avoid post-import drift.
- OpenTofu's documentation still marks parts of the import/config-generation workflow as experimental, especially around `-generate-config-out`.
