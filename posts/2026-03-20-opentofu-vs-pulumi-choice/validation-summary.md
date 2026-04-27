# Validation Summary: OpenTofu vs Pulumi: Choosing the Right IaC Tool - Choice

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- OpenTofu (HCL)
- Pulumi (TypeScript SDK, `@pulumi/eks`, `@pulumi/aws`, `@pulumi/pulumi`)
- AWS EKS, AWS S3
- Terraform/OpenTofu native test framework (`tofu test` / `run` blocks)
- Jest (Pulumi unit testing)
- Pulumi Cloud, Pulumi self-hosted state backends (S3, local file)
- OpenTofu S3 backend with DynamoDB state locking
- Pulumi Terraform Bridge / provider plugins

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/
- OpenTofu testing framework: https://opentofu.org/docs/cli/commands/test/
- Terraform `setproduct` function reference: https://developer.hashicorp.com/terraform/language/functions/setproduct
- Terraform AWS provider `aws_eks_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Pulumi documentation: https://www.pulumi.com/docs/
- Pulumi `@pulumi/eks` package: https://www.pulumi.com/registry/packages/eks/api-docs/cluster/
- Pulumi unit testing guide: https://www.pulumi.com/docs/iac/concepts/testing/unit/
- Pulumi `pulumi.runtime.setMocks` API: https://www.pulumi.com/docs/iac/concepts/testing/unit/#mocking
- Pulumi state backends / `pulumi login`: https://www.pulumi.com/docs/iac/concepts/state-and-backends/
- Pulumi Terraform Bridge: https://www.pulumi.com/docs/iac/using-pulumi/extending-pulumi/terraform-bridge/

## Issues Found
- **Pulumi unit test example was technically incorrect.** The original code `const bucketName = await bucket.bucket;` does not work — `bucket.bucket` is a `pulumi.Output<string>`, not a `Promise<string>`, so awaiting it returns the Output object itself rather than the resolved string and the assertion would fail. Pulumi unit tests also require `pulumi.runtime.setMocks(...)` to be configured before resources are imported, otherwise the resource registrations will attempt real provider calls. I updated the example to:
  - Configure `pulumi.runtime.setMocks` with minimal `newResource` and `call` handlers (the standard Pulumi unit-testing pattern).
  - Resolve the output via `.apply((name) => { ... done(); })` using Jest's `done` callback, which is the canonical way to assert on a Pulumi `Output` inside a test.

## Review Notes
- The OpenTofu S3 backend example uses `dynamodb_table` for state locking. This continues to work, but newer OpenTofu versions (1.10+) also support native S3 state locking via `use_lockfile = true` as an alternative to DynamoDB. Not incorrect — just a note for future updates.
- The Pulumi `@pulumi/eks` Cluster example is correct, but readers should be aware that `eks.Cluster` is the higher-level component (creates VPC role, security groups, node group, etc.) rather than a thin wrapper around the AWS EKS resource. This is fine for a comparison post.
- The `setproduct` example relies on `var.environments` and `var.regions` being declared variables. This is a common shorthand in IaC snippets and acceptable for a comparison post.
- Pulumi supports more languages than the table lists (e.g., JavaScript, F#, VB.NET via .NET); the listed set (TypeScript, Python, Go, Java, C#, YAML) covers the major officially supported ones and is a reasonable simplification.
