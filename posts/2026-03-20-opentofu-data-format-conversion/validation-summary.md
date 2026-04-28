# Validation Summary: How to Convert Between Data Formats with OpenTofu Functions

## Status
validated

## Post Type
Tutorial / Guide — walkthrough of OpenTofu's built-in encode/decode functions for JSON, YAML, and Base64.

## Technologies Covered
- OpenTofu (HCL) built-in functions: `jsonencode`, `jsondecode`, `yamlencode`, `yamldecode`, `base64encode`, `base64decode`, `templatefile`, `file`
- AWS provider resources: `aws_iam_policy`, `aws_instance`, `aws_ssm_parameter`
- Helm provider: `helm_release`
- Kubernetes provider: `kubernetes_secret`
- Random provider: `random_password`

## Sources Consulted
- OpenTofu function reference: https://opentofu.org/docs/language/functions/
- `base64encode` (confirms standard base64, RFC 4648 §4): https://opentofu.org/docs/language/functions/base64encode/
- `yamlencode` / `yamldecode`: https://opentofu.org/docs/language/functions/yamlencode/
- `jsonencode` / `jsondecode`: https://opentofu.org/docs/language/functions/jsonencode/
- Kubernetes provider `kubernetes_secret` resource (confirms `data` is auto-base64-encoded by provider; `binary_data` requires pre-encoded values): https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Helm provider `helm_release` resource (confirms `values` is a list of raw YAML strings): https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Verified `base64encode("Hello, World!")` → `SGVsbG8sIFdvcmxkIQ==` (RFC 4648 §4)

## Issues Found
1. **Misleading "URL-safe" comment for `base64encode`** (Step 3). The original comment read `# Base64 URL-safe encoding (for Kubernetes)`. This is doubly wrong: OpenTofu's `base64encode` produces *standard* base64 (RFC 4648 §4), not URL-safe (RFC 4648 §5), and Kubernetes Secrets also use standard base64. Updated the comment to `# Standard base64 encoding (RFC 4648 section 4)`.
2. **Double base64-encoding bug in `kubernetes_secret` example** (Step 3). The example wrapped values placed into the `data` field with `base64encode(...)`. The kubernetes provider automatically base64-encodes values in the `data` field before sending them to the Kubernetes API, so wrapping them with `base64encode` produces double-encoded output (the workload would read garbled secret values). Notably, the post's own Summary section already states the provider handles this automatically, so the example contradicted its own narrative. Fixed by passing the plaintext values directly (`api-key = var.api_key`, `db-pass = random_password.db.result`) and added a comment noting the alternative `binary_data` field for pre-encoded values.

## Review Notes
- All function names, signatures, and outputs verified against the OpenTofu official function reference.
- The `helm_release.values = [yamlencode(local.helm_values)]` pattern is the idiomatic and correct usage per the helm provider schema (`values` is `List of String` of raw YAML).
- The `aws_iam_policy` and `aws_ssm_parameter` examples are syntactically correct and use current resource arguments.
- The `aws_instance.user_data` heredoc + `base64encode` pattern is valid; the provider also offers `user_data_base64` for already-encoded data, but the example as written works.
- HCL block-style heredoc terminator placement (`EOF` followed by `)`) is correct for OpenTofu/Terraform.
