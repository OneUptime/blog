# Validation Summary: How to Handle IAM Policy Conditions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS IAM (Identity and Access Management)
- AWS IAM Policy Language (2012-10-17)
- HCL (HashiCorp Configuration Language)
- `aws_iam_policy` resource
- `aws_iam_policy_document` data source
- AWS services referenced: S3, EC2, DynamoDB, SQS

## Sources Consulted
- AWS IAM JSON policy elements: Condition operators — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS global condition context keys — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Amazon S3 condition keys — https://docs.aws.amazon.com/AmazonS3/latest/userguide/list_amazons3.html
- Multivalued condition operators (ForAllValues / ForAnyValue) — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-single-vs-multi-valued-context-keys.html
- Terraform AWS Provider — `aws_iam_policy` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform AWS Provider — `aws_iam_policy_document` data source — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform string templates / escaping `${}` in `jsonencode` — https://developer.hashicorp.com/terraform/language/expressions/strings
- AWS ABAC tutorial (PrincipalTag/RequestTag) — https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_attribute-based-access-control.html

## Issues Found

1. **`s3:prefix` used with `s3:GetObject`** (StringLike example). The `s3:prefix` condition key is a bucket-level key used with `s3:ListBucket` (and similar list operations), not with `s3:GetObject`. Using it with `GetObject` has no effect. **Fix:** Changed the example to use `s3:ListBucket` with the bucket-level resource ARN (`arn:aws:s3:::data-bucket`) instead of the object-level ARN.

2. **Misleading comment about `aws:ViaAWSService`** in the IP restriction example. The comment claimed the `Bool aws:ViaAWSService = false` clause existed so VPC endpoint traffic would not be denied, but VPC endpoint traffic does carry a source IP and is not what `aws:ViaAWSService` controls. The key actually returns true when the request is made by an AWS service principal acting on your behalf (e.g., CloudFormation, Auto Scaling). **Fix:** Updated the comment to accurately describe the purpose — exempting AWS-service-on-your-behalf requests from the IP-based deny.

3. **Incorrect comment about `ForAllValues:StringEquals` with `aws:TagKeys`**. The comment claimed it "Ensure[s] the Department tag is always present," which is wrong. `ForAllValues:StringEquals` restricts the *allowed set* of tag keys (every tag key in the request must be in the listed set); it does not require any specific tag to be present (presence requires a separate `Null` or `StringEquals` check on `aws:RequestTag/Department`). **Fix:** Rewrote the comment to accurately describe what the operator does.

## Review Notes

- The `$${}` escape guidance for IAM policy variables used inside `jsonencode` is correct and a common Terraform gotcha worth highlighting.
- `aws:MultiFactorAuthAge` with `NumericLessThan = "300"` correctly represents a 5-minute window (300 seconds).
- The `s3:content-length-range` example is technically valid as an IAM condition key but in practice this key is primarily enforced for browser-based S3 POST uploads and bucket-policy-based size restrictions; readers should verify it has the desired effect for plain `PutObject` calls before relying on it as a hard size limit. Left as-is since it is documented and commonly cited.
- The `dynamic "condition"` block example is syntactically correct for the Terraform AWS provider.
- All condition operators referenced (`StringEquals`, `StringLike`, `StringNotEquals`, `IpAddress`, `NotIpAddress`, `Bool`, `NumericLessThan`, `NumericLessThanEquals`, `DateGreaterThan`, `DateLessThan`, `Null`, `ArnLike`, `ForAllValues:StringEquals`) are valid per AWS IAM documentation.
- All global condition keys referenced (`aws:SourceIp`, `aws:MultiFactorAuthPresent`, `aws:MultiFactorAuthAge`, `aws:CurrentTime`, `aws:PrincipalArn`, `aws:PrincipalTag/*`, `aws:RequestTag/*`, `aws:TagKeys`, `aws:SecureTransport`, `aws:SourceArn`, `aws:ViaAWSService`) are valid.
- Service-specific keys (`ec2:ResourceTag/*`, `s3:ExistingObjectTag/*`, `s3:x-amz-server-side-encryption`) are valid.
