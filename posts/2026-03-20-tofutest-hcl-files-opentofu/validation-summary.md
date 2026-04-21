# Validation Summary: How to Use .tofutest.hcl Files in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform
- HCL
- OpenTofu test files
- Terraform test files

## Sources Consulted
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu 1.8 "What's new" documentation for OpenTofu replacement files: https://opentofu.org/docs/v1.8/intro/whats-new/
- Terraform test file documentation: https://developer.hashicorp.com/terraform/language/files/tests
- Terraform `terraform test` command documentation: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform test mocking documentation: https://developer.hashicorp.com/terraform/language/tests/mocking

## Issues Found
- The post said OpenTofu supports two test file extensions, but OpenTofu also supports JSON test files. I narrowed the statement to two HCL test file extensions because the article is specifically about `.tofutest.hcl` files.
- The post said `.tftest.hcl` and `.tofutest.hcl` are functionally identical without noting OpenTofu's same-base-name precedence rule. I added that OpenTofu loads `main.tofutest.hcl` and ignores `main.tftest.hcl` when both exist in the same directory.
- The CI guidance implied `tofu test` would pick up only OpenTofu-specific test files. I changed this to say `.tofutest.hcl` is useful for OpenTofu-only tests that `terraform test` should ignore.
- The `-test-directory` command comment said it runs only files in that directory. Official docs state OpenTofu still loads test files in the current directory, so I corrected the comment.
- The `-filter` wording implied extension-wide matching. Official docs describe `-filter` as selecting individual test files, so I clarified that it should be repeated for multiple files.
- The migration example described mock providers as OpenTofu-only. Terraform also supports `mock_provider`, so I replaced that example with OpenTofu-specific replacement tests and explained the same-base-name behavior.

## Review Notes
The local workspace does not have `tofu` or `terraform` installed, so CLI behavior was verified against official documentation rather than local `--help` output. OpenTofu's official docs also document `.tofutest.json` and `.tftest.json`, but those formats are outside this HCL-focused post.
