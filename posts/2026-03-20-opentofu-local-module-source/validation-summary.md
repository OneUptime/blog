# Validation Summary: Using Local Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform (HCL module syntax)
- Infrastructure as Code (IaC)

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu Modules documentation (general)

## Issues Found
1. **Incorrect classification of absolute paths as local module sources.** The original "Basic Local Path Reference" section listed `/absolute/path/to/module` as a valid local path. Per OpenTofu documentation, a local path *must* begin with `./` or `../`; absolute paths are explicitly NOT considered local paths and are instead treated as packages copied into the local module cache (similar to remote modules). Updated the bullet list to drop the absolute-path entry and added a clarifying paragraph that absolute paths are treated as packages, not local paths.

2. **`Testing with Local Overrides` example used an absolute path.** The example used `source = "/Users/me/terraform-aws-networking"` to demonstrate a local override, but per the OpenTofu spec this would be treated as a package, not a local path. Replaced with a relative path (`../terraform-aws-networking`) which is the correct way to point at a local checkout.

## Review Notes
- The claim that local modules don't support `version` constraints is correct — `version` is only valid for modules sourced from a registry.
- All HCL syntax (module blocks, output references like `module.vpc.vpc_id`, variable references) is correct.
- The directory structure example is reasonable and idiomatic.
- The post is generally accurate after the absolute-path corrections.
