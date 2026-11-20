# Validation summary

Status: validated. Technical tutorial about CDKTF provider mappings into HCL modules.

The complete TypeScript example compiled with AWS binding 21.22.1, and CDKTF 0.21.0 CLI synthesis passed after declaring and generating the local module. JSON mapping was asserted exactly: aws to aws.primary, aws.replica to aws.recovery. Both parent assume-role configurations and AWS6.25.0 requirement were checked. Terraform 1.11.4 init with backend disabled installed the module/provider; Terraform validate reported valid=true.

Initial checks exposed missing local-module setup and incorrect full-name moduleAlias values. The published setup includes the module declaration/get step and uses the suffix replica, with the default provider passed directly. These corrected examples passed the checks above.

No AWS account authentication, AssumeRole, caller identity API, live plan/apply, or external registry/Git module was tested. The local module is a self-contained HCL fixture. An isolated Terraform CLI configuration excluded unrelated local overrides. JSON and shell syntax passed. Mermaid was structurally checked for six nodes and four edges, without browser rendering. The 1280x720 social image was visually inspected: readable and unclipped.

## Sources reviewed

- https://developer.hashicorp.com/terraform/cdktf
- https://developer.hashicorp.com/terraform/language/modules/develop/providers
- https://github.com/hashicorp/terraform-provider-aws/blob/v6.25.0/website/docs/d/caller_identity.html.markdown
- https://github.com/hashicorp/terraform-provider-aws/blob/v6.25.0/website/docs/index.html.markdown
- https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_permissions-to-switch.html
- https://github.com/hashicorp/terraform-cdk/blob/v0.21.0/packages/cdktf/lib/terraform-module.ts
- https://developer.hashicorp.com/terraform/cdktf/concepts/modules
- https://developer.hashicorp.com/terraform/cli/commands/validate
- https://developer.hashicorp.com/terraform/language/modules/syntax

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
