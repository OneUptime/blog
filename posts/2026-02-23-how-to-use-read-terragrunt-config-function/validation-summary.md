# Validation Summary: How to Use the read_terragrunt_config Function

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu HCL
- Infrastructure as Code
- AWS provider and S3 remote state configuration

## Sources Consulted
- Terragrunt official HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt official HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- OpenTofu official `fileexists` function reference: https://opentofu.org/docs/language/functions/fileexists/
- OpenTofu official `merge` function reference: https://opentofu.org/docs/language/functions/merge/

## Issues Found
- The post claimed that Terragrunt caches `read_terragrunt_config()` results and only parses a shared file once. The official Terragrunt docs describe `read_terragrunt_config()` as parsing the referenced config and warn that reading computed configurations can require a full parse and cause performance issues. I replaced the caching claim with a more accurate performance note.
- The optional-file examples used a conditional and `fileexists()` pattern. While `fileexists()` is available as a Terraform-compatible function, `read_terragrunt_config(config_path, default_val)` has a documented second argument for missing files. I updated the examples to use the official default-value argument, which avoids unnecessary conditional object-shape issues.

## Review Notes
- The examples using `locals`, `inputs`, `dependency`, `include` with `expose`, `generate`, `remote_state`, `find_in_parent_folders()`, `get_terragrunt_dir()`, and `path_relative_to_include()` are consistent with the current Terragrunt documentation.
- The S3 `dynamodb_table` locking example remains valid in Terragrunt docs, though OpenTofu 1.10 and newer also support native S3 locking with `use_lockfile`.
