# Validation Summary: How to Use Output Descriptions in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL output blocks, `tofu` CLI)
- Terraform AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_db_instance`, `aws_lb`, `aws_eks_cluster`, `aws_instance`)
- terraform-docs (documentation generator, used as a fix)
- jq (originally referenced; removed during fix)

## Sources Consulted
- OpenTofu Output Values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu `tofu output` command reference: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `output.mdx` source on GitHub: https://github.com/opentofu/opentofu/blob/main/website/docs/cli/commands/output.mdx
- HashiCorp / Terraform JSON output format reference: https://developer.hashicorp.com/terraform/internals/json-format
- Sibling blog post `posts/2026-02-23-how-to-add-output-descriptions-in-terraform/README.md` (which correctly documents the same behaviour)

## Issues Found
1. **Incorrect claim that descriptions appear in `tofu output` display.** The introduction stated descriptions appear in the `tofu output` display. They do not — the `tofu output` (and `terraform output`) command only renders output names and values. Updated the introductory sentence to correctly note that descriptions are consumed by documentation generators, IDE tooling, and module registries.
2. **Incorrect "Viewing Descriptions" section.** The original section instructed readers to view descriptions via `tofu output` and to extract them from `tofu output -json` using `jq`. Both are wrong:
   - `tofu output` does not display descriptions.
   - `tofu output -json` returns objects with only `value`, `type`, and `sensitive` keys per output — there is no `description` field, so the suggested `jq` query would always return `null`.
   Replaced the section with an accurate explanation: descriptions are surfaced via `terraform-docs` (which is compatible with OpenTofu modules), in IDE hover tooltips, and in module registries. `tofu show` was mentioned as a way to inspect raw configuration. The section structure and intent were preserved.

## Review Notes
- All HCL syntax (output blocks, `<<-EOT` heredoc, splat expressions like `aws_subnet.public[*].id`) is correct.
- All referenced AWS provider resource attributes (`aws_db_instance.endpoint`, `.port`, `.arn`, `.hosted_zone_id`; `aws_eks_cluster.endpoint`, `.certificate_authority[0].data`, `.name`; `aws_vpc.id`; `aws_lb.dns_name`) are valid attributes exposed by the current AWS provider.
- The example DB endpoint of the form `hostname:port` matches the actual `aws_db_instance.endpoint` schema.
- Note for future: `terraform-docs` is widely used with OpenTofu, but the OpenTofu community has been working on a native `tofu-docs`-style approach; readers may want to check the OpenTofu ecosystem if a first-party tool becomes preferred.
