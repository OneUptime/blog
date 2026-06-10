# Validation Summary: How to Implement Trivy Rego Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy (security scanner)
- Open Policy Agent (OPA)
- Rego policy language (v1 syntax)
- Kubernetes manifests
- Dockerfiles
- Terraform / AWS S3
- GitHub Actions CI/CD

## Sources Consulted
- Trivy custom misconfiguration documentation: https://trivy.dev/latest/docs/scanner/misconfiguration/custom/
- Trivy CLI reference for `trivy config`: https://trivy.dev/latest/docs/references/configuration/cli/trivy_config/
- Trivy configuration file documentation: https://trivy.dev/latest/docs/references/configuration/config-file/
- Trivy custom policy schema: https://trivy.dev/latest/docs/scanner/misconfiguration/custom/schema/
- OPA Rego v1 syntax documentation (general knowledge)

## Issues Found

1. **Outdated CLI flag `--policy`**: The flag was renamed to `--config-check` in Trivy v0.50.0. Fixed all occurrences in the "Running Trivy with Custom Policies" section, the "Policy Evaluation Flow" mermaid diagram, and the GitHub Actions example.

2. **Outdated CLI flag `--namespaces`**: The flag was renamed to `--check-namespaces` in newer Trivy versions. Fixed all occurrences in the "Running Trivy with Custom Policies" section and the GitHub Actions example.

3. **Incorrect trivy.yaml schema — `security-checks`**: The field `scan.security-checks` was renamed to `scan.scanners` (with value `misconfig` for misconfiguration scanning) in Trivy v0.37.0. Fixed in the "trivy.yaml Configuration" section.

4. **Incorrect trivy.yaml schema — `config.policy` / `config.namespaces`**: The current config file format uses a top-level `rego:` section with `check:` and `namespaces:` sub-fields, not a `config:` section. Fixed in the "trivy.yaml Configuration" section.

5. **Incorrect metadata field `recommended_action`**: The Trivy custom check metadata schema uses `recommended_actions` (plural), not `recommended_action`. Fixed all four occurrences (basic policy template, metadata block reference, and two "Best Practices" examples).

6. **Broken OPA METADATA comment block**: The first policy example had a blank line between `# METADATA` and the first metadata field. OPA requires the metadata annotations to be in a contiguous comment block with no blank lines, otherwise the annotations are not parsed. Removed the blank line.

## Review Notes

- The Rego v1 syntax (`import rego.v1`, `deny contains msg if { ... }`) is correctly used throughout the post.
- The `subtypes` field under `input.selector` is shown with `kind:` entries for Kubernetes; per Trivy docs, subtypes are primarily intended for cloud providers, but this form is widely used in community examples and the post's usage is consistent with that convention. Left unchanged.
- The Terraform input example accesses `input.resource.aws_s3_bucket[name]`; Trivy normalizes Terraform into a structure that supports this pattern, though more complex resources may require additional handling. Acceptable for a tutorial-level example.
- Using `aquasecurity/trivy-action@master` in the GitHub Actions example is functional but pinning to a released tag (e.g., `@0.x.x`) would be safer in production. Not a technical error, left unchanged.
- The Dockerfile input structure (`Stages`, `Commands`, `Cmd`, `Value`) matches Trivy's parsed Dockerfile format with lowercase `Cmd` values.
- OPA test syntax with `count(result) > 0` and `count(result) == 0` is correct.
