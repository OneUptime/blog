# Validation Summary: How to Remove Resources with removed Blocks in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu CLI (`tofu plan`, `tofu apply`, `tofu state rm`)
- OpenTofu state management and refactoring blocks
- AWS CLI (`aws s3 ls`)
- Amazon S3

## Sources Consulted
- OpenTofu Docs: Resource Blocks — https://opentofu.org/docs/language/resources/syntax/
- OpenTofu Docs: Module Blocks — https://opentofu.org/docs/language/modules/syntax/
- OpenTofu Docs: Command: state rm — https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu Docs: What's new in OpenTofu 1.10? — https://opentofu.org/docs/v1.10/intro/whats-new/
- AWS CLI Command Reference: `aws s3 ls` — https://docs.aws.amazon.com/en_us/cli/latest/reference/s3/ls.html

## Issues Found
1. **The `removed` vs `tofu state rm` comparison was too broad.** The post said both approaches achieve the same result, but the official `tofu state rm` documentation states that forgetting a resource from state will cause a later `tofu plan` to propose creating it again if the matching configuration still exists. Updated the section to clarify that `tofu state rm` must be paired with removing or updating the corresponding resource configuration.

2. **The AWS CLI verification example was inconsistent and showed the wrong output shape.** The post verified the S3 bucket with `aws s3 ls | grep legacy` even though the bucket example used the name `company-legacy-data`, and the sample output reversed the documented `aws s3 ls` column order. Updated the command to grep for `company-legacy-data` and changed the example output to the documented `date time bucket-name` format.

## Review Notes
- The `removed` examples using `lifecycle { destroy = false }` and `lifecycle { destroy = true }` are correct for current OpenTofu documentation. This is newer behavior than the earliest `removed` block documentation, so readers using older OpenTofu releases should confirm against the version-specific docs for their installed version.
- The `tofu` binary was not installed in the review environment, so CLI verification was done against the official OpenTofu documentation rather than local `tofu --help` output.
