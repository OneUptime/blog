# Validation Summary: How to Use the base64gzip and base64gunzip Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (built-in functions: `base64gzip`, `base64gunzip`, `base64encode`, `jsonencode`, `length`, `file`, `join`, `range`)
- Terraform AWS provider (`aws_instance`, `aws_ssm_parameter`)
- Terraform Kubernetes provider (`kubernetes_config_map`)
- AWS EC2 user data / cloud-init
- HCL configuration language

## Sources Consulted
- [OpenTofu base64gzip function documentation](https://opentofu.org/docs/language/functions/base64gzip/)
- [OpenTofu base64gunzip function documentation](https://opentofu.org/docs/language/functions/base64gunzip/)
- [Terraform AWS provider aws_instance resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance)
- [AWS EC2 User Data documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
- GitHub issue: [Should change user_data to user_data_base64 to avoid string limit](https://github.com/terraform-aws-modules/terraform-aws-autoscaling/issues/57)

## Issues Found
1. **Incorrect EC2 user_data argument**: The "Compressing Large User Data Scripts" example assigned the `base64gzip()` output to `user_data` on `aws_instance`. The `user_data` argument expects a plain (un-encoded) UTF-8 string and the AWS provider Base64-encodes it for the API. Since `base64gzip()` already returns a Base64-encoded value, passing it to `user_data` would result in double Base64-encoding, breaking gzip detection by cloud-init. Fixed by changing the argument to `user_data_base64`, which is the correct argument for already-Base64-encoded payloads, and added a brief inline comment explaining why.

## Review Notes
- Both `base64gzip` and `base64gunzip` are valid OpenTofu functions (note: `base64gunzip` is OpenTofu-specific and not present in upstream Terraform at the time of writing).
- The 16 KB EC2 user data limit cited in the post is correct (applies to the raw, decoded data).
- The Kubernetes ConfigMap example is technically valid: ConfigMap `data` values must be UTF-8 strings, and Base64-encoded gzip output is ASCII text, so storing it under a key (e.g. `config.yaml.gz.b64`) is fine. Consumers must decode and decompress on their own — readers should be aware this isn't transparent to in-cluster apps.
- The SSM parameter example is functionally correct, but readers should note SSM Standard tier has a 4 KB value limit and Advanced tier has an 8 KB limit; very large compressed payloads may still exceed these.
- The size-comparison example uses `length()` on Base64 strings, which counts characters — correct for comparing encoded sizes, though for highly-repetitive short strings, gzip framing overhead can occasionally make the result larger than plain Base64.
