# Validation Summary: How to Use Ephemeral Outputs in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider features used in official OpenTofu ephemerality examples
- OpenTofu providers, provisioners, and write-only attributes

## Sources Consulted
- OpenTofu Output Values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Ephemerality documentation: https://opentofu.org/docs/language/ephemerality/
- OpenTofu Provider Configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Local Values documentation: https://opentofu.org/docs/language/values/locals/
- OpenTofu Write-only Attributes documentation: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- What's new in OpenTofu 1.11: https://opentofu.org/docs/intro/whats-new/

## Issues Found
- The post treated ephemeral outputs as if they could be declared in the root module. OpenTofu only allows `ephemeral = true` on child-module outputs, so I updated the introduction, description, conclusion, and code samples to reflect the documented scope.
- Several examples used output blocks that would not work as written because they were root outputs marked `ephemeral`. I replaced them with child-module output examples based on the documented `ephemeral.aws_secretsmanager_secret_version` pattern.
- The comparison with sensitive outputs used a non-ephemeral data source example for the ephemeral case. I corrected it to use an ephemeral resource-backed child-module output, which matches the documented behavior that ephemeral values are not stored in state or plan data.
- The limitations section omitted an important restriction and listed contexts imprecisely. I corrected it to include the root-module restriction and aligned the allowed contexts with the official list: ephemeral resources, ephemeral variables, ephemeral outputs, locals, providers, provisioners, resource connection blocks, and resource write-only attributes.
- The failing example referenced `output.temporary_token`, which is not valid OpenTofu expression syntax. I replaced it with a module output reference that correctly demonstrates a disallowed non-ephemeral resource argument.
- The use-case examples relied on root outputs and stateful resources such as `random_password` and TLS resources, which would undermine the post's security claim. I replaced them with officially documented patterns that use ephemeral child-module outputs with provider configuration, write-only attributes, and provisioners.

## Review Notes
- Ephemeral outputs were introduced in OpenTofu 1.11 and are intended for passing transient values across module boundaries, not for printing root-module outputs.
- Provider-side support still matters: ephemeral resources and write-only attributes only work when the provider implements those capabilities. The OpenTofu docs use AWS provider examples for this reason.
