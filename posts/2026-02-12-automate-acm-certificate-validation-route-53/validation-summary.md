# Validation Summary: How to Automate ACM Certificate Validation with Route 53

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Certificate Manager (ACM)
- Amazon Route 53
- AWS CLI
- Terraform AWS Provider
- AWS CloudFormation
- IAM and STS AssumeRole
- Python
- Boto3
- jq

## Sources Consulted
- AWS Certificate Manager DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS CLI `acm request-certificate`: https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS CLI `acm wait certificate-validated`: https://docs.aws.amazon.com/cli/latest/reference/acm/wait/certificate-validated.html
- Terraform AWS Provider `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS Provider `aws_acm_certificate_validation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- AWS CloudFormation `AWS::CertificateManager::Certificate` domain validation options: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-certificatemanager-certificate-domainvalidationoption.html
- AWS CDK generated reference for CloudFormation ACM certificate behavior: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_certificatemanager/CfnCertificate.html
- Boto3 ACM `request_certificate`: https://docs.aws.amazon.com/boto3/latest/reference/services/acm/client/request_certificate.html
- Boto3 ACM `describe_certificate`: https://docs.aws.amazon.com/boto3/latest/reference/services/acm/client/describe_certificate.html
- Boto3 ACM `certificate_validated` waiter: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/acm/waiter/CertificateValidated.html
- Boto3 Route 53 `change_resource_record_sets`: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/route53/client/change_resource_record_sets.html
- Linked OneUptime ACM guide: https://oneuptime.com/blog/post/2026-02-12-request-manage-ssl-tls-certificates-acm/view

## Issues Found
- The CLI script used a fixed `sleep 10` before reading validation records. AWS documents that certificate details can take several seconds to become available, so a single sleep can race and return missing `ResourceRecord` values. Changed the script to poll `describe-certificate` until validation records are present or a timeout is reached.
- The Python example used the same fixed 10-second sleep before reading validation records. Changed it to poll `describe_certificate` and filter for validation options that include `ResourceRecord`, raising `TimeoutError` if records do not appear in time.
- The Terraform explanation said `for_each` keyed by `domain_name` deduplicates wildcard and apex validation records automatically. ACM uses the same CNAME record for `*.example.com` and `example.com`, but separate domain-name keys can still make Terraform manage the same Route 53 record twice. Changed the Terraform examples to group wildcard and apex entries by `trimprefix(dvo.domain_name, "*.")` and use the grouped first record values.
- The Terraform validation timeout example set `create = "10m"` while the text claimed the provider default might be too short. The official provider default is 45 minutes. Changed the example to `45m` and corrected the explanation to say the timeout controls how long Terraform waits for issuance.

## Review Notes
- AWS CLI and Terraform were not installed in the local environment, so command and provider behavior were verified against official AWS and Terraform documentation instead of local `--help` output.
- Local syntax checks passed for the edited Bash and Python snippets.
- CloudFormation DNS validation is correct for domains hosted in Route 53 in the same AWS account with DNS validation. Cross-account DNS validation still requires separately managed Route 53 changes, as described later in the post.
