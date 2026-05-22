# Validation Summary: How to Use Module depends_on in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform modules
- Terraform `depends_on` meta-argument
- Terraform CLI `graph` command
- AWS infrastructure examples: IAM, ECS, VPC, EKS, RDS, ElastiCache, KMS

## Sources Consulted
- Terraform `depends_on` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform `graph` command reference: https://developer.hashicorp.com/terraform/cli/commands/graph
- Terraform data sources reference: https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp Help Center, "The combination of meta-argument depends_on with Data Resources": https://support.hashicorp.com/hc/en-us/articles/15789686740499-The-combination-of-meta-argument-depends-on-with-Data-Resources

## Issues Found
- The post stated that data sources inside a module with `depends_on` are always read during apply instead of during plan, and described related plan output changes as though deferred data sources were guaranteed. Terraform documentation describes this as a possible planning consequence, especially when the upstream dependency has pending changes. Updated the wording to say data sources can be deferred to apply time when the dependency has changes pending, and that `(known after apply)` values can appear because Terraform must make a more conservative plan around the explicit dependency.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against the official Terraform CLI documentation rather than local `terraform graph -help` output.
- The `terraform graph -type=plan | grep "module"` command uses a valid `terraform graph` option. It may omit dependencies that are not represented by module-labeled graph output, but it is a plausible quick inspection command.
- Module-level `depends_on` can be unavailable for legacy modules that contain their own provider configurations, but the post does not discuss that legacy module pattern.
