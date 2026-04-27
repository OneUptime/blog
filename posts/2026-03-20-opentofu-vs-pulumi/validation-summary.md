# Validation Summary: OpenTofu vs Pulumi: Choosing the Right IaC Tool

## Status
validated

## Post Type
Comparison / Guide

## Technologies Covered
- OpenTofu (HCL, tofu CLI)
- Pulumi (TypeScript SDK, `@pulumi/aws`, `@pulumi/terraform`)
- AWS (EC2, S3 backend)
- CrossGuard (Pulumi policy as code)
- Terratest, OPA/Rego, Checkov
- Pulumi Cloud, Spacelift / env0 / Scalr (third-party OpenTofu management)

## Sources Consulted
- [Pulumi Languages & SDKs](https://www.pulumi.com/docs/iac/languages-sdks/)
- [Pulumi CrossGuard docs](https://www.pulumi.com/docs/iac/crossguard/)
- [@pulumi/terraform RemoteStateReference](https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/terraform/classes/state.RemoteStateReference.html)
- [S3RemoteStateReferenceArgs](https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/terraform/interfaces/state.S3RemoteStateReferenceArgs.html)
- [Pulumi Convert HCL Code](https://www.pulumi.com/docs/iac/get-started/terraform/convert-hcl/)
- [Reference Terraform State (Pulumi docs)](https://www.pulumi.com/docs/iac/get-started/terraform/reference-state/)
- [Pulumi license / open source](https://github.com/pulumi/pulumi/blob/master/LICENSE)
- [OpenTofu official site](https://opentofu.org/)
- [OpenTofu GitHub repo (MPL 2.0)](https://github.com/opentofu/opentofu)

## Issues Found

1. **Pulumi supported languages incomplete.** The intro and the comparison matrix listed Pulumi languages as "TypeScript, Python, Go, C#, YAML" — Pulumi also officially supports Java (and JavaScript). Updated both locations to include Java (and JavaScript in the matrix) per the Pulumi Languages & SDKs docs.

2. **"OpenTofu Cloud" is not a real product.** The matrix listed "OpenTofu Cloud" as the OpenTofu managed service equivalent of Pulumi Cloud. The OpenTofu project does not ship a first-party managed cloud service; managed OpenTofu offerings are third-party (Spacelift, env0, Scalr, etc.). Updated the matrix entry to "Third-party (Spacelift, env0, Scalr)".

3. **Incorrect `RemoteStateReference` S3 backend shape.** The TypeScript example wrapped `bucket`, `key`, and `region` inside a `config: { ... }` object. The `S3RemoteStateReferenceArgs` interface in `@pulumi/terraform` defines those as flat top-level properties on the args object alongside `backendType`. Removed the `config` wrapper so the snippet matches the actual SDK signature.

4. **Minor accuracy bump on CrossGuard.** The matrix said "CrossGuard (policy in TypeScript)". CrossGuard supports TypeScript/JavaScript, Python, and OPA/Rego. Updated to "CrossGuard (TypeScript, Python, or OPA)" so it matches the official docs.

## Review Notes
- The HCL example, the basic Pulumi `aws.ec2.Instance` example, and the `pulumi convert --from terraform --language typescript` command are all correct against current Pulumi/OpenTofu documentation.
- "Loops/conditionals — Limited (count, for_each)" is a slight understatement of HCL's capability (HCL also has `dynamic` blocks, conditional expressions, and rich functions), but the directional point that HCL is more constrained than a general-purpose language is fair, so it was left as written.
- "3,000+ providers" for OpenTofu is reasonable as of this writing; the registry continues to grow, so this number should be revisited if the post is updated later.
