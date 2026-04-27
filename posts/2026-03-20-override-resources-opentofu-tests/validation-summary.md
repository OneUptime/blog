# Validation Summary: How to Override Resources in OpenTofu Tests - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (testing framework, `tofu test`)
- HCL (HashiCorp Configuration Language)
- `override_resource`, `override_data`, `mock_provider` test blocks
- AWS provider resources (S3, KMS, Lambda, IAM, EC2) used as illustrative examples

## Sources Consulted
- [OpenTofu `test` command documentation](https://opentofu.org/docs/cli/commands/test/) — confirmed `target` and `values` attributes, file-level vs run-block scoping, and precedence rules.
- [OpenTofu 1.8.0 release announcement](https://opentofu.org/blog/opentofu-1-8-0/) — confirmed that provider mocking and resource overrides shipped in 1.8.0 (released 2024-07-29), not 1.7.
- [OpenTofu 1.8.0-alpha1 announcement](https://opentofu.org/blog/help-us-test-opentofu-1-8-0-alpha1/) — corroborated the 1.8 introduction.
- [Issue #1204: Testing Feature - Support overrides](https://github.com/opentofu/opentofu/issues/1204) — original feature request that landed in 1.8.

## Issues Found
- **Incorrect version claim.** The introduction stated "OpenTofu 1.7 introduced fine-grained resource overrides for tests." `override_resource`, `override_data`, and `mock_provider` were introduced in **OpenTofu 1.8** (1.8.0-alpha1, released GA in 1.8.0 on 2024-07-29). Fixed by changing `1.7` to `1.8`.

## Review Notes
- The `override_resource` and `override_data` syntax shown (with `target` and `values`) matches the official documentation.
- The post correctly describes that these blocks may live at the file level or inside a `run` block, and that combinations of `mock_provider` + `override_resource` are valid.
- The post does not mention one notable limitation worth being aware of in real-world usage: per the official docs, you cannot override a single instance of a resource that uses `count`/`for_each` — every instance must be overridden. Not strictly an error in the post (the examples don't use `count`/`for_each`), but readers may benefit from knowing this.
- The HCL examples are illustrative (e.g., `aws_s3_bucket_server_side_encryption_configuration.this.rule[0]...`), and assume corresponding module resources exist; the syntax itself is valid.
