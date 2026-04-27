# Validation Summary: How to Run Tests in Parallel in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu test` command, `.tftest.hcl` test files)
- Terraform test framework (referenced for comparison)
- HCL test syntax (`run` blocks, `variables` blocks, `assert` blocks)
- AWS provider resources (VPC, EC2, S3, IAM)
- GitHub Actions (matrix strategy, `aws-actions/configure-aws-credentials@v4`)

## Sources Consulted
- [OpenTofu `tofu test` command documentation](https://opentofu.org/docs/cli/commands/test/)
- [OpenTofu CHANGELOG (v1.10)](https://github.com/opentofu/opentofu/blob/v1.10/CHANGELOG.md)
- [OpenTofu CHANGELOG (v1.11)](https://github.com/opentofu/opentofu/blob/v1.11/CHANGELOG.md)
- [OpenTofu CHANGELOG (v1.12)](https://github.com/opentofu/opentofu/blob/v1.12/CHANGELOG.md)
- [OpenTofu issue #2542 — Support parallel test for parity with Terraform](https://github.com/opentofu/opentofu/issues/2542) (still open)
- [Terraform Tests language documentation](https://developer.hashicorp.com/terraform/language/tests) (for the `parallel` attribute, which exists in Terraform but not yet in OpenTofu)
- [OpenTofu What's New](https://opentofu.org/docs/intro/whats-new/)

## Issues Found

The post's central premise was technically incorrect and required substantial fixes:

1. **Major: false claim of automatic file-level parallelism.** The intro, the "How OpenTofu Test Parallelism Works" diagram, the "Parallel Execution Across Files" section, and the conclusion all stated that OpenTofu "automatically runs tests from different test files in parallel." This is wrong — `tofu test` processes files sequentially in alphabetical order, and OpenTofu does not yet support a `parallel` attribute on `test`/`run` blocks (tracked in opentofu/opentofu#2542; the `parallel` attribute exists in HashiCorp Terraform but not in OpenTofu as of the v1.13 line). Rewrote the introduction, the execution diagram, the parallelism section, and the conclusion to make clear that parallelism comes from launching multiple `tofu test` processes externally (CI matrix jobs or background shells) rather than from OpenTofu itself.

2. **Invalid CLI invocation.** `tofu test tests/unit_*.tftest.hcl` is not valid — the `tofu test` command does not accept positional file arguments; test files are selected with the `-filter=<file>` flag (repeatable) or the `-test-directory=<dir>` flag. Replaced with a `-filter=...` invocation pattern, including a background-shell example (`&` + `wait`) that actually achieves parallelism. Also fixed the GitHub Actions matrix steps to use `-filter=tests/${{ matrix.test-file }}.tftest.hcl` and `-filter=tests/integration.tftest.hcl` instead of bare positional paths.

3. **Invalid expression in file-level `variables` block.** The original used `bucket_name = "my-test-a-${random_id.suffix.hex}"`. File-level `variables` blocks in `.tftest.hcl` files cannot reference resources — per the docs they may only reference global variables (and, since OpenTofu 1.11, may call functions). Replaced the `random_id.suffix.hex` interpolation with `formatdate("YYYYMMDDhhmmss", timestamp())`, and added a sentence explaining the constraint and the version requirement.

4. **Minor: typo in comment.** Comment in `integration_b.tftest.hcl` said "isolated from integration_b" (self-reference); corrected to "isolated from integration_a".

5. **Misleading framing in Timing Considerations.** Original comments referred to "parallel files" as if they ran in parallel by default. Reworded to describe the suite as sequential and to attribute parallelism to external sharding.

## Review Notes

- The Terraform test framework supports a `parallel` attribute on `test` and `run` blocks; OpenTofu does not. If/when OpenTofu issue #2542 lands, this post will need a follow-up to describe the native attribute and how it interacts with the external-orchestration pattern recommended here.
- The `formatdate("YYYYMMDDhhmmss", timestamp())` pattern produces a single timestamp at plan time but is recomputed on each plan run — for very fast successive invocations within the same second, the suffixes will collide. For stronger uniqueness, an externally injected variable (e.g., `-var="suffix=$(uuidgen)"` from the orchestration script) is more reliable; this is mentioned in the post via "or an externally injected variable."
- The `aws-actions/configure-aws-credentials@v4` action and the GitHub Actions `strategy.matrix` syntax are current.
- Alphabetical test-file ordering and sequential execution within a single `tofu test` invocation match the documented behavior of both Terraform and OpenTofu's shared test framework foundation.
