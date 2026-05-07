# Validation Summary: How to Avoid Tightly Coupled Modules in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu modules
- OpenTofu testing (`tofu test`, `.tftest.hcl`)
- OpenTofu remote state (`terraform_remote_state`)
- AWS provider resources used as examples (`aws_instance`, `aws_db_instance`)

## Sources Consulted
- OpenTofu docs, Command: test: https://opentofu.org/docs/cli/commands/test/
- OpenTofu docs, Module Composition: https://opentofu.org/docs/language/modules/develop/composition/
- OpenTofu docs, Creating Modules: https://opentofu.org/docs/language/modules/develop/
- OpenTofu docs, Module Blocks: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu docs, The `terraform_remote_state` Data Source: https://opentofu.org/docs/language/state/remote-state-data/

## Issues Found
- The testing example used a top-level `module "app"` block inside a `.tftest.hcl` file. OpenTofu test files do not support top-level `module` blocks; module overrides belong inside `run` blocks, and this example did not need one at all because the module under test is loaded by default. I removed the invalid block.
- The test assertion referenced `module.app.aws_instance.app.subnet_id`, which is not valid module access syntax for tests. The `module.<name>` namespace exposes module outputs, not a child module's internal resources. I changed the assertion to reference the resource under test directly as `aws_instance.app.subnet_id`, which matches the documented `tofu test` assertion model.

## Review Notes
- `.tftest.hcl` remains supported by OpenTofu. If a matching `.tofutest.hcl` file exists alongside it, OpenTofu prefers the `.tofutest.hcl` file.
