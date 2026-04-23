# Validation Summary: How to Rename Resources Without Destroying Them Using moved Blocks

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL configuration language
- Infrastructure as Code state management

## Sources Consulted
- OpenTofu documentation: Refactoring (`moved` blocks): https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu documentation: Files and Directories: https://opentofu.org/docs/language/files/
- OpenTofu documentation: Moving Resources: https://opentofu.org/docs/cli/state/move/

## Issues Found
- The original `tofu plan` wording implied that `plan` itself destroys and recreates infrastructure. Updated the wording to clarify that `tofu plan` shows a destroy/create change and that applying that plan performs the replacement.
- The original `count` example mapped each indexed instance individually for a simple resource rename. Updated it to use a single whole-resource `moved` block, which is how OpenTofu documents renaming a counted resource while preserving all instances.
- The original file placement guidance only mentioned `.tf` files. Updated it to mention top-level `.tf` or `.tofu` files, which matches current OpenTofu configuration file support.
- The original cleanup guidance said `moved` blocks are only needed once and can then be removed. Updated it to reflect the official guidance that removing `moved` blocks is generally a breaking change unless you are certain all consumers have already applied the migration.

## Review Notes
- The post is technically relevant and valid after the corrections above.
- OpenTofu currently recommends keeping historical `moved` blocks in shared modules to preserve upgrade paths for older module users.
