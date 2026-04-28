# Validation Summary: How to Encode User Data Scripts with base64encode in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform language built-in functions: `base64encode`, `base64decode`, `filebase64`, `templatefile`, `substr`
- AWS provider (`hashicorp/aws`): `aws_instance`, `aws_launch_template`
- Kubernetes provider (`hashicorp/kubernetes`): `kubernetes_secret`
- TLS provider (`hashicorp/tls`): `tls_self_signed_cert`
- cloud-init multi-part MIME format for EC2 user data

## Sources Consulted
- OpenTofu language functions reference (`base64encode`, `base64decode`, `filebase64`, `substr`, `templatefile`): https://opentofu.org/docs/language/functions/
- Terraform AWS provider docs — `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider docs — `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform Kubernetes provider docs — `kubernetes_secret`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform TLS provider docs — `tls_self_signed_cert`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- AWS EC2 cloud-init multi-part user data format docs

## Issues Found

1. **Step 1, Method 1 — `aws_instance.user_data` was double-encoded.**
   The original code assigned `user_data = base64encode(<<-EOF...)`. Per the AWS provider docs, `aws_instance.user_data` expects plain UTF-8 text and is base64-encoded by the provider before being sent to the EC2 API. Wrapping the heredoc in `base64encode` would result in double-encoding (the instance would receive base64 text instead of an executable script). Changed to `user_data_base64 = base64encode(<<-EOF...)`, which is the correct argument for already-encoded payloads, and added a clarifying comment. This preserves the post's pedagogical intent (demonstrating `base64encode`) while producing a working configuration.

2. **Step 1, Method 3 — `aws_instance.user_data` with `filebase64` was double-encoded.**
   Same root cause as above. `filebase64(...)` returns base64-encoded bytes, but `user_data` would re-encode them. Changed `user_data = filebase64(...)` to `user_data_base64 = filebase64(...)`. (Method 2, which uses `aws_launch_template`, is correct as-is because that resource's `user_data` field is documented to require base64-encoded content.)

3. **Step 3 — `base64decode(tls_self_signed_cert.app.cert_pem)` would error.**
   `cert_pem` is documented as "Certificate data in PEM (RFC 1421) format" — i.e. plain text containing `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----` headers around a base64 body, with newlines and a trailing `\n`. The headers and whitespace are not valid base64, so `base64decode` would fail at plan/apply time. Additionally, the comment correctly states that `kubernetes_secret`'s `data` block auto-encodes plain strings, so the value should not be decoded first. Changed to `"tls.crt" = tls_self_signed_cert.app.cert_pem`, which is what was actually intended.

## Review Notes
- The `aws_instance` vs. `aws_launch_template` asymmetry around `user_data` (one auto-encodes, the other expects base64) is a real, well-known footgun in the AWS provider; the post might benefit from calling this out explicitly in a future revision so readers don't generalize the launch-template pattern back to `aws_instance`.
- The Step 2 `cloud_init` local builds a base64-encoded multi-part MIME payload but never shows where it is consumed. As written, the local is fine; if applied to `aws_instance`, the consumer should use `user_data_base64 = local.cloud_init` (not `user_data`) for the same double-encoding reason.
- The Step 4 round-trip `local.decoded == "Hello, OpenTofu!"` correctly evaluates to `true`; `substr(string, 0, 50)` is the documented signature and works on the raw PEM string.
- All function names (`base64encode`, `base64decode`, `filebase64`, `templatefile`, `substr`) match the current OpenTofu built-in function set; none are deprecated.
