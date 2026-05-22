# Validation Summary: How to Use Sentinel with Advisory vs Hard-Mandatory Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Enterprise policy enforcement
- HashiCorp Sentinel
- Sentinel policy language
- Sentinel `tfplan/v2` and `tfrun` imports
- Sentinel policy-set configuration

## Sources Consulted
- HashiCorp Sentinel enforcement levels: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel functions documentation: https://developer.hashicorp.com/sentinel/docs/language/functions
- HashiCorp Sentinel `strings` import: https://developer.hashicorp.com/sentinel/docs/imports/strings
- HashiCorp Sentinel configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Terraform `tfplan/v2` Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfrun` Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun

## Issues Found
- Several Sentinel examples used `if` statements and temporary assignments inside `rule` or `filter` expressions. Sentinel rule bodies are expressions, and quantifier bodies are boolean expressions. I rewrote those examples to use helper functions, filtered violation collections, top-level reporting loops, and boolean `main` rules.
- The `strings` import appeared after non-import statements in one example. Sentinel imports must appear at the top of the source file before other statements, so I moved it with the other import.
- Some examples accessed optional or potentially unknown `change.after` attributes directly. I added `else` guards where those values are used for encryption, public database, and availability-zone checks.
- The monitoring example printed `result` without defining it. I added a simple placeholder assignment so the snippet is syntactically complete.
- Sentinel code blocks were labeled as Python. I changed them to `sentinel` to match the language being shown.

## Review Notes
The enforcement-level descriptions and `enforcement_level` values are consistent with HashiCorp documentation. The data-residency example remains intentionally simplified for a blog post; a production implementation should usually derive region from provider/workspace metadata or explicit policy inputs rather than only from an instance availability zone.
