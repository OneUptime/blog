# Validation Summary: Passing Providers Between Modules in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform (HCL language)
- AWS provider (`hashicorp/aws`)
- Cloudflare provider (`cloudflare/cloudflare`)
- Kubernetes provider
- Module composition (`providers` map, `configuration_aliases`)

## Sources Consulted
- OpenTofu — Providers within Modules: https://opentofu.org/docs/language/modules/develop/providers/
- Terraform — Providers within Modules: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform — `required_providers` / `configuration_aliases`: https://developer.hashicorp.com/terraform/language/providers/requirements
- AWS VPC CIDR block sizing: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- `aws_db_instance` (`replicate_source_db`) docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found

1. **Invalid VPC CIDR block size in `Explicit Provider Passing` example.**
   The example used `cidr_block = "172.16.0.0/12"` for an AWS VPC. AWS VPC CIDR blocks must be between `/16` (largest) and `/28` (smallest); a `/12` is rejected by the AWS API. `172.16.0.0/12` is the RFC1918 *range* from which VPCs may be carved, not a valid VPC CIDR.
   **Fix:** Changed to `cidr_block = "172.16.0.0/16"`, which is a valid VPC CIDR within the same RFC1918 space.

2. **Misleading code comment in `Optional Provider Passing` section.**
   The comment read `# Optional alias - module can work without it` next to `configuration_aliases = [aws.replica]`. Per the official OpenTofu / Terraform docs, every entry in `configuration_aliases` is *required* to be supplied by the calling module's `providers` map — they are not optional. The "optional" aspect of the pattern shown is the *resource* (`aws_db_instance.replica`), which is gated by `count = var.create_replica ? 1 : 0`; the alias itself must always be passed.
   **Fix:** Updated the comment to `# Caller must always pass this alias; the replica resource below uses it conditionally`, accurately describing the semantics without restructuring the section.

## Review Notes
- The `providers` map syntax demonstrated throughout (e.g., `aws.replica = aws.replica_region`, `aws.primary = aws.us_east`) matches the official documentation exactly: keys are the child module's local provider names (with optional alias suffixes), values are configuration references in the calling module.
- `configuration_aliases` is correctly spelled (plural) and used as a list.
- The `replicate_source_db = aws_db_instance.primary.arn` usage is correct: cross-region replication (different provider alias) requires the source DB's ARN, not its identifier.
- The `aws_db_instance.primary` example omits required attributes (e.g., `username`, `password`, `allocated_storage`, `identifier`) for brevity. This is acceptable for an illustrative snippet focused on provider passing, but readers should not copy it verbatim into a real configuration.
- The section title "Optional Provider Passing" remains slightly imprecise — the pattern is more accurately "conditional resource creation with a required aliased provider" — but the code now reads correctly with the updated comment, and rewording the heading would constitute a structural/stylistic change beyond the scope of a technical-correctness review.
