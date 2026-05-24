# Validation Summary: How to Handle IAM Policy Variables in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform AWS provider (`hashicorp/aws` ~> 5.0)
- AWS IAM (policies, condition keys, policy variables)
- AWS IAM Policy Document data source (`aws_iam_policy_document`)
- AWS services referenced in policy examples: S3, EC2, DynamoDB
- ABAC (attribute-based access control) via tag-based policy variables

## Sources Consulted
- HashiCorp AWS provider — IAM Policy Documents guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/iam-policy-documents
- HashiCorp AWS provider — `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS IAM — Policy variables: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS IAM — Condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS Global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html

## Issues Found
1. **Misleading claim that `aws_iam_policy_document` auto-escapes IAM policy variables.** The original text stated "This data source handles variable escaping automatically..." and an inline code comment read "Use the variable directly - the data source handles escaping." This is factually incorrect — the data source does not perform any auto-escaping; the `$$` escape is processed by Terraform's HCL string interpolation *before* the value reaches the data source. The post's own code correctly used `$${aws:username}` inside the data source's arguments, so the prose contradicted the code. Replaced the sentence with an accurate explanation that variables still need to be escaped as `$${...}`, and updated the inline comment to reflect the correct reason for using `$$`.

## Review Notes
- All IAM policy variables used in the post (`aws:username`, `aws:PrincipalTag/<key>`, `aws:CurrentTime`, `aws:MultiFactorAuthPresent`, `aws:ResourceTag/<key>`, `ec2:ResourceTag/<key>`, `s3:prefix`) are valid AWS condition keys / policy variables.
- All condition operators (`StringLike`, `StringEquals`, `DateGreaterThan`, `DateLessThan`, `Bool`) are valid IAM condition operators, and the value formats (ISO 8601 date strings, `"true"` for `Bool`) match AWS documentation.
- All IAM/S3/EC2/DynamoDB action strings used in the examples are valid action identifiers.
- The Terraform AWS provider `~> 5.0` version constraint is current (provider is on the 5.x line as of the post date).
- Stylistic observation (not changed): the SID `AllowAccessDuringBusinessHours` is paired with conditions that allow access across an entire calendar year (`2026-01-01` to `2026-12-31`) rather than restricting to per-day business hours. The conditions are technically valid IAM, just somewhat misnamed for the stated intent. Left as-is to preserve author's example.
- The post uses `aws:PrincipalTag/Username` in one example, which requires a custom `Username` tag on the principal. For IAM user identities, `aws:username` is more common, but the custom-tag pattern is valid for ABAC setups that propagate identity via SAML/SSO session tags. No change made.
