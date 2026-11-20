# Validation summary

Status: validated. Technical tutorial covering CDKTF runtime expressions, count, and for_each.

The complete TypeScript example compiled and synthesized using CDKTF 0.21.0. Terraform 1.11.4 initialized the disposable local backend and validated the configuration. Saved plan JSON showed zero instances for false and create actions for terraform_data.counted[0] and terraform_data.named["primary"] for true. The generated configuration hash was unchanged across plans. Invalid boolean input failed. A separate token check confirmed JavaScript Boolean returned true despite the Terraform variable default being false.

No apply, cloud resource, enabled-to-disabled transition against existing state, or address migration was performed. Tests used an isolated Terraform CLI configuration. The JSON snippet is explicitly a field excerpt, not a full JSON document. Shell syntax passed. Mermaid was structurally checked for five nodes and four edges, without browser rendering.

## Sources reviewed

- https://developer.hashicorp.com/terraform/cdktf
- https://developer.hashicorp.com/terraform/cdktf/concepts/tokens
- https://developer.hashicorp.com/terraform/language/resources/terraform-data
- https://github.com/hashicorp/terraform-cdk/blob/v0.21.0/packages/cdktf/lib/terraform-functions.ts
- https://developer.hashicorp.com/terraform/cdktf/concepts/iterators
- https://developer.hashicorp.com/terraform/cli/commands/plan
- https://developer.hashicorp.com/terraform/language/meta-arguments/count
- https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- https://developer.hashicorp.com/terraform/language/expressions/conditionals

CDKTF CLI synthesis passed. The generated 1280x720 social image was visually reviewed: title readable and not clipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
