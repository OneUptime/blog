# Validation Summary: How to Fix Terraform JSON Decode Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HCL, `jsondecode()`, `jsonencode()`, `file()`, `trimspace()`, `try()`, `can()`, `terraform console`)
- JSON (RFC 8259 syntax rules)
- HashiCorp Terraform providers: `external`, `http`, `aws` (`aws_iam_policy_document`, `aws_s3_bucket_policy`)
- Unix tools: `sed`, `iconv`, `xxd`, `hexdump`, `jq`, `cat`, `python3`

## Sources Consulted
- Terraform language functions documentation: https://developer.hashicorp.com/terraform/language/functions/jsondecode
- Terraform `jsonencode` function: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform `try` function: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform `can` function: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `trimspace` function: https://developer.hashicorp.com/terraform/language/functions/trimspace
- HashiCorp `external` provider data source: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- HashiCorp `http` provider data source (`response_body` attribute): https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- AWS provider `aws_iam_policy_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- JSON specification RFC 8259: https://datatracker.ietf.org/doc/html/rfc8259
- GNU libiconv supported encodings (verified locally with `iconv -l`)

## Issues Found
- **Invalid `iconv` encoding name (`UTF-8-BOM`)**: The original BOM-removal section recommended `iconv -f UTF-8-BOM -t UTF-8 config.json > config_clean.json`. I verified locally that `UTF-8-BOM` is not a supported encoding in GNU libiconv (`iconv: conversion from 'UTF-8-BOM' is not supported`). Replaced this with two correct alternatives: a Python one-liner that strips a leading BOM only if present, and an explicit BSD-sed variant (`sed -i ''`) for macOS where the original GNU `sed -i '...'` form fails because BSD `-i` requires an extension argument.

## Review Notes
- All Terraform functions referenced (`jsondecode`, `jsonencode`, `file`, `trimspace`, `try`, `can`) and the `terraform console` REPL are accurate as of current Terraform releases.
- The `data.http.<name>.response_body` attribute is correct for `hashicorp/http` provider v2.1.0 and later (older v1.x/v2.0 used `body`); the post's usage is current.
- The `external` data source's `result` attribute is correctly described as a map of strings.
- The JSON syntax rules (no trailing commas, double-quoted keys/strings, no comments, escape sequences) match RFC 8259.
- The `aws_iam_policy_document` recommendation is current best practice for AWS IAM policies in Terraform.
- The `cat config.json | jq .` example is a minor "useless use of cat" — `jq . config.json` is more idiomatic — but it is not technically incorrect and was left as-is to respect the author's style.
