# Validation Summary: How to Version Custom Terraform Providers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform provider version constraints
- Terraform Plugin Framework
- Go
- GoReleaser
- Git
- GitHub Actions
- Semantic Versioning

## Sources Consulted
- Terraform version constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform Plugin Framework provider tutorial: https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-provider
- Terraform Plugin Framework string attribute documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/string
- GoReleaser Go build customization documentation: https://www.goreleaser.com/customization/builds/builders/go/
- GoReleaser main.version documentation: https://www.goreleaser.com/cookbooks/using-main.version/
- Semantic Versioning 2.0.0 specification: https://semver.org/

## Issues Found
- The `required_providers` HCL example showed multiple `version` attributes in the same provider block, which is invalid HCL because object attributes must be unique. I changed the configuration example to use one valid version constraint and moved the alternate constraint styles into a separate example list.
- The `~> 1.2` constraint was described as compatible with `1.2.x`, but Terraform's pessimistic operator allows versions `>= 1.2.0, < 2.0.0` for that form. I corrected the wording and clarified that the number of version components controls whether patch-only or minor-and-patch updates are allowed.
- The Terraform Plugin Framework provider example returned `*ExampleProvider` as `provider.Provider` without implementing all required provider methods. I added the minimal `Schema`, `Configure`, `DataSources`, and `Resources` methods following the official Plugin Framework tutorial pattern.
- The deprecation example used `DeprecatedMessage`, but the current Terraform Plugin Framework field is `DeprecationMessage`. I corrected the field name.

## Review Notes
The CI changelog check is a simple illustrative example. In a production workflow, `actions/checkout` fetch depth and the base branch ref should be configured so `origin/main` is available when running `git diff`.
