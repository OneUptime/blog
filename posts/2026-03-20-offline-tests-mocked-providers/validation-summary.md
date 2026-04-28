# Validation Summary: How to Write Offline Tests with Mocked Providers in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (1.8+ native testing framework)
- OpenTofu mock providers (`mock_provider`, `mock_resource`, `mock_data`)
- OpenTofu test override blocks (`override_resource`)
- `tofu test` CLI command
- AWS provider resources/data sources used as examples (`aws_instance`, `aws_ami`, `aws_s3_bucket`)
- Cloudflare provider (used as a multi-provider example)
- HCL test files (`.tftest.hcl`)

## Sources Consulted
- [OpenTofu — Command: test](https://opentofu.org/docs/cli/commands/test/) — verified `mock_provider`, `mock_resource`, `mock_data`, `override_resource` syntax, `defaults`/`target`/`values` attributes, and the `-filter` / `-verbose` flags.
- [OpenTofu 1.8.0 release blog](https://opentofu.org/blog/opentofu-1-8-0/) — confirmed mock providers were introduced in OpenTofu 1.8.
- [Terraform — Tests: Provider Mocking](https://developer.hashicorp.com/terraform/language/tests/mocking) — cross-referenced syntax (Terraform and OpenTofu share the testing framework heritage).

## Issues Found
- **`override_resource.values` used a configured attribute.** In the "Overriding Specific Resources" section, the `values = { ... }` block included `instance_type = "m5.large"`. Per the OpenTofu docs, `override_resource.values` only accepts **computed** attributes — configured values (like `instance_type`, which is set via `var.instance_type` in the resource block) cannot be overridden this way. Removed the `instance_type` line from the override; the remaining `id = "i-prod-mock"` (a computed attribute) is valid. The assertion `aws_instance.web.instance_type == "m5.large"` still works because `var.instance_type = "m5.large"` is set in the run block's `variables`.

## Review Notes
- Mock providers, `mock_resource`, `mock_data`, and `defaults` syntax are correct for OpenTofu 1.8+.
- `override_resource` with `target = <resource_address>` (unquoted) inside a `run` block is valid.
- `tofu test`, `tofu test -filter=<path>`, and `tofu test -verbose` flags are accurate.
- The post does not state a minimum OpenTofu version; readers should note that `mock_provider` and `override_resource` require OpenTofu 1.8 or later.
- The `override_resource` block can also be nested inside `mock_provider` blocks in current OpenTofu, but earlier 1.8.x releases did not support that placement; the post avoids that pattern, which is fine.
- Mock `defaults` values (e.g., `region` on `aws_s3_bucket`, `instance_state` on `aws_instance`) are example values for illustration; the testing framework accepts arbitrary keys for the mock generator without strict schema validation in many cases, so these examples are acceptable for a tutorial.
