# Validation Summary: How to Use terraform state show to Inspect a Resource

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform resource addressing
- HCL-style state output
- jq and shell scripting

## Sources Consulted
- HashiCorp Terraform `state show` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/show
- HashiCorp Terraform `state list` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- HashiCorp Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- HashiCorp Terraform state pull command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Local Terraform v1.15.0 CLI checks for `terraform state show -help`, `terraform state show -no-color`, and `terraform state list` address filtering behavior.

## Issues Found
- The inventory script used `terraform state list aws_instance`, but Terraform requires a resource address pattern with both resource type and name. Verified with Terraform v1.15.0 that a type-only filter returns `Invalid address`. Changed the script to list all state addresses and filter AWS instance resource addresses with `awk`, excluding data sources.
- Several examples used broad grep patterns such as `grep "id "` and `grep "public_ip"`. These can match unrelated attributes such as `subnet_id`, `volume_id`, or `associate_public_ip_address`. Updated the examples to use anchored POSIX character-class patterns that match the intended top-level attribute names.
- The diff example used an unquoted count-indexed address, even though the post correctly explains that indexed addresses should be quoted in shells. Quoted `aws_instance.worker[0]`.

## Review Notes
The post is technically relevant and broadly accurate. HashiCorp documents `terraform state show` output as intended for human consumption; the post already includes the preferred `terraform show -json` approach for structured processing.
