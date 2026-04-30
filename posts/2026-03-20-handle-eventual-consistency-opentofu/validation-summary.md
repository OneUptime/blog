# Validation Summary: How to Handle Eventual Consistency Issues in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS Lambda
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Amazon S3
- Amazon API Gateway
- Amazon VPC endpoints / AWS PrivateLink
- AWS CLI
- HashiCorp `time` provider

## Sources Consulted
- OpenTofu `depends_on` meta-argument: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu data sources: https://opentofu.org/docs/v1.11/language/data-sources/
- OpenTofu `terraform_data`: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `local-exec` provisioner: https://opentofu.org/docs/v1.8/language/resources/provisioners/local-exec/
- HashiCorp `time_sleep` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-time/main/docs/resources/sleep.md
- AWS IAM troubleshooting: https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot.html
- AWS Lambda execution role docs: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS CLI ACM waiter: https://docs.aws.amazon.com/cli/latest/reference/acm/wait/certificate-validated.html
- AWS provider `aws_acm_certificate_validation`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate_validation.html.markdown
- AWS provider `aws_opensearch_domain`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/opensearch_domain.html.markdown
- AWS provider `aws_s3_bucket` data source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/s3_bucket.html.markdown
- Route 53 record propagation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-editing.html
- Amazon S3 consistency model: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
- API Gateway deployments: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-deploy-api.html
- EC2 `CreateVpcEndpoint` API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVpcEndpoint.html
- ACM DNS validation: https://docs.aws.amazon.com/en_us/acm/latest/userguide/dns-validation.html

## Issues Found
- The introduction and diagnostics implied the Lambda failure was caused by missing execution-role permissions. I corrected this to the actual issue: IAM role propagation and Lambda being unable to assume the new role yet.
- The propagation-delay table contained several undocumented or misleading fixed timings. I replaced those entries with AWS-documented behavior and readiness conditions.
- The `hashicorp/time` provider version was pinned to an old `~> 0.9` release. I updated it to `~> 0.13`.
- Strategy 2 referenced an undefined `aws_iam_role_policy.inline_policy` resource and overstated what `depends_on` guarantees. I removed the undefined reference and clarified that `depends_on` guarantees ordering, not propagation.
- Strategy 3 used `null_resource` in an OpenTofu-focused post and waited on `aws_acm_certificate_validation`, which already waits for validation. I changed the example to `terraform_data` with direct ACM CLI polling for externally completed validation steps.
- Strategy 4 described resource `timeouts` as waiter configuration and used the legacy `aws_elasticsearch_domain` resource. I corrected the terminology and updated the example to `aws_opensearch_domain`.
- Strategy 5 described a data source `depends_on` as a polling/readiness mechanism. I corrected it to ordered-read behavior only and updated the example comment to match.

## Review Notes
- `time_sleep`, `terraform_data`, and `local-exec` remain workaround-oriented techniques. Provider-native retries or waiters are preferable when the provider already supports them.
- Local `tofu` and `aws` CLIs were not installed in this workspace, so command verification was done against the official online documentation rather than local `--help` output.
