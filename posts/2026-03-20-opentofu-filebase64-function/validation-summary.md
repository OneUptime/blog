# Validation Summary: How to Use the filebase64 Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (filebase64, file, filebase64sha256 functions)
- HashiCorp Configuration Language (HCL)
- AWS provider (aws_launch_template, aws_acm_certificate, aws_lambda_function, aws_s3_object)
- Kubernetes provider (kubernetes_secret)
- Base64 encoding

## Sources Consulted
- [OpenTofu filebase64 Function documentation](https://opentofu.org/docs/language/functions/filebase64/)
- [OpenTofu file Function documentation](https://opentofu.org/docs/language/functions/file/)
- [Terraform AWS Provider — aws_launch_template](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template)
- [Terraform Kubernetes Provider — kubernetes_secret](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret) (cross-referenced via provider issues #518, #604, #901)
- [Terraform AWS Provider — aws_s3_object](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object)
- [Terraform AWS Provider — aws_lambda_function](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function)

## Issues Found

1. **Kubernetes TLS Secret example used `data` with `filebase64()` (double-encoding bug).**
   - **What was wrong:** The `kubernetes_secret` resource's `data` field accepts plain text values and the provider automatically Base64-encodes them before sending to the Kubernetes API. Passing `filebase64(...)` to `data` results in double-encoding (the file is encoded once by `filebase64`, then again by the provider), producing corrupted secret values.
   - **What I changed:** Switched the map from `data = { ... }` to `binary_data = { ... }`. The `binary_data` field is the provider's mechanism for passing already-Base64-encoded values directly to the Kubernetes API without further encoding, which is what `filebase64()` produces. Added a short inline comment explaining why `binary_data` is the correct field here so readers don't replicate the original mistake.
   - **Why:** This preserves the spirit of the post (demonstrating `filebase64` usage) while making the example actually work. Verified against the hashicorp/terraform-provider-kubernetes issue tracker (issues #518, #604, #901), which document the `data` vs `binary_data` distinction explicitly.

## Review Notes

- The `aws_launch_template` `user_data` example is correct: unlike `aws_instance` (which has separate `user_data` plain-text and `user_data_base64` fields and auto-encodes for the former), `aws_launch_template` has only `user_data` and requires it to be Base64-encoded by the caller.
- The `aws_s3_object` `content_base64` example is correct.
- The `aws_lambda_function` example correctly uses `filebase64sha256` (a separate function) for `source_code_hash`. The post is about `filebase64` but the `filebase64sha256` reference is appropriate context.
- The ACM certificate example uses `file()` (not `filebase64()`), which is correct because the ACM resource expects PEM-encoded text, not Base64. The example serves as a useful contrast against `filebase64`.
- The `tofu console` example output `"aGVsbG8gd29ybGQ="` correctly decodes to `hello world`, consistent with the implied file contents.
- The Kubernetes provider also offers `kubernetes_secret_v1` as a slightly newer alias; the post uses `kubernetes_secret`, which still works and is widely used. Not changed.
