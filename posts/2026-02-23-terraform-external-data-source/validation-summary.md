# Validation Summary: How to Use the external Data Source in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform external provider and `external` data source
- Terraform HCL data sources and outputs
- Python JSON, urllib, SQLite, and secrets examples
- Bash scripting with `jq`
- Node.js `fetch`
- AWS CLI for EC2 and ECS

## Sources Consulted
- HashiCorp Terraform Registry: external provider `external` data source protocol: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- HashiCorp Terraform language documentation: data sources: https://developer.hashicorp.com/terraform/language/data-sources
- AWS CLI Command Reference: `ec2 describe-subnets`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- AWS CLI Command Reference: `ecs describe-clusters`: https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-clusters.html
- Python documentation: `urllib.request`: https://docs.python.org/3/library/urllib.request.html
- Python documentation: `sqlite3` parameter substitution and SQL injection guidance: https://docs.python.org/3/library/sqlite3.html
- Node.js documentation: global `fetch`: https://nodejs.org/api/globals.html#fetch
- jq manual: `--arg`, `-n`, and `@sh`: https://jqlang.org/manual/

## Issues Found
- The Bash CIDR example interpolated the `prefix` query value into an inline Python command. Because external data source query values can come from Terraform variables, this made the example weaker than the post's own script injection guidance. I added a numeric validation check before the value is used.
- The SQLite example used a parameterized placeholder for `role`, but interpolated the table name directly from input. DB-API placeholders cannot parameterize identifiers, so I added a small table allowlist before the query.

## Review Notes
- The external data source protocol claims are correct: the child program reads a JSON object from stdin, returns a JSON object with string values on stdout, writes errors to stderr, and exits non-zero on failure.
- The AWS CLI examples use documented commands and options. The ECS Container Insights setting values are strings such as `enhanced`, `enabled`, and `disabled`, so the external data source output shape is appropriate.
- The password example is technically valid but intentionally non-deterministic; the post correctly warns that this causes repeated plan changes and stores generated output in Terraform state.
