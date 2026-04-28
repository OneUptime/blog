# Validation Summary: How to Use join() in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (HCL)
- Terraform (compatible)
- AWS provider (api_gateway, ssm, iam, ec2 resources used in examples)

## Sources Consulted
- OpenTofu `join()` function reference: https://opentofu.org/docs/language/functions/join/
- OpenTofu `for` expressions reference: https://opentofu.org/docs/language/expressions/for/
- AWS provider `aws_api_gateway_resource` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/api_gateway_resource.html.markdown
- AWS provider `aws_api_gateway_rest_api` resource docs (supports `tags`)
- AWS provider `aws_iam_policy_document` data source docs (`principals` block, `identifiers` field)

## Issues Found
- "Creating Comma-Separated Values" example used `aws_api_gateway_resource` with a `tags` argument. That resource only accepts `rest_api_id`, `parent_id`, and `path_part` (and the optional `region`); it does not support `tags`. Replaced with `aws_api_gateway_rest_api` (which does support `tags`) and added the required `name` argument so the snippet would actually apply.

## Review Notes
- The `join()` syntax, signature, and return values for the basic examples (including the empty-list case `join(",", []) == ""`) match OpenTofu's documented behavior.
- The URL query string example relies on `for` over a map producing keys in lexical order; this matches the documented behavior, so the commented expected result `"environment=prod&region=us-east-1&version=2"` is correct.
- The "Building IAM Policy Conditions" section is technically valid HCL, but the snippet itself does not actually invoke `join()` (it only uses a `for` expression to build the principals list). Worth revisiting in a future pass to either rename the section or incorporate a meaningful `join()` call so the example truly demonstrates the function being taught. Left unchanged here to avoid restructuring beyond the technical fix.
- For the URL query string use case, real-world code typically also `urlencode()`s the values; the example is fine as a `join()` demonstration but a future edit could mention this caveat.
