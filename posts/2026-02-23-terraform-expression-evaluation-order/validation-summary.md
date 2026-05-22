# Validation Summary: How to Understand Terraform Expression Evaluation Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HCL
- Terraform expressions
- Terraform dependency graph
- Terraform input variables, locals, data sources, resources, outputs, providers, `count`, `for_each`, and `depends_on`
- Terraform CLI

## Sources Consulted
- Terraform dependency graph internals: https://developer.hashicorp.com/terraform/internals/graph
- Terraform references and unknown values: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform input variables and precedence: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform local values: https://developer.hashicorp.com/terraform/language/values/locals
- Terraform data sources: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform provider configuration: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `apply` command and `-parallelism`: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform `graph` command: https://developer.hashicorp.com/terraform/cli/commands/graph

## Issues Found
- The post described Terraform's graph as a DAG of "all resources, data sources, variables, locals, and outputs." Updated the wording to describe Terraform's dependency graph more generally and avoid overstating graph node types.
- The variable resolution section listed sources in a misleading order. Updated it to reflect the documented precedence, with command-line and HCP Terraform values taking precedence and defaults lowest.
- The locals section said local values are evaluated before resources and only reference variables and other locals. Updated it because Terraform locals are expressions evaluated when referenced and can also reference resource attributes, data sources, and function results.
- The data source section implied all data sources are evaluated together with resources. Updated it to note that Terraform usually reads data sources during planning when arguments are known, but may defer them to apply when arguments depend on apply-time values.
- The output section stated outputs are always evaluated last after all resources and data sources. Updated it to describe outputs as finalized from the values they reference, with unknown values remaining unknown during planning when necessary.
- The `for_each` example used resource IDs as keys, then showed a working example that indexed an instance resource by key without declaring it with `for_each`. Updated the example to declare a keyed instance resource before referencing `aws_instance.web_by_name[each.key].id`.
- The provider section said provider blocks cannot reference data sources and suggested using data sources instead. Updated it to the documented rule: provider configuration arguments must be known before apply and cannot use computed resource attributes.
- The wrap-up repeated the inaccurate fixed phase order for locals. Updated it to state that variables must be assigned before planning, locals are evaluated when referenced, and resources/data sources follow dependency order.

## Review Notes
The examples remain illustrative rather than complete production configurations. Some AWS snippets omit provider setup, required variables, or full policy JSON for brevity, but the Terraform language behavior described is now aligned with the official documentation.
