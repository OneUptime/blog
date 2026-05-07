# Validation Summary: How to Enable IPv6 on AWS CloudFront

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudFront
- Amazon Route 53
- AWS CLI
- Terraform AWS Provider
- AWS WAFv2
- IPv6

## Sources Consulted
- Amazon CloudFront Developer Guide: Enable IPv6 for CloudFront distributions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-enable-ipv6.html
- AWS CLI Command Reference: `get-distribution-config` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/get-distribution-config.html
- AWS CLI Command Reference: `update-distribution` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/update-distribution.html
- Amazon Route 53 Developer Guide: Values that are common for alias records for all routing policies - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias-common.html
- AWS General Reference: Amazon CloudFront endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/cf_region.html
- Amazon CloudFront Developer Guide: Request and response behavior for Amazon S3 origins - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorS3Origin.html
- Amazon CloudFront Developer Guide: Understand response headers policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-response-headers-policies.html
- AWS WAF Developer Guide: Resources that you can protect with AWS WAF - https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html
- AWS WAF Developer Guide: Creating and managing an IP set in AWS WAF - https://docs.aws.amazon.com/waf/latest/developerguide/waf-ip-set-managing.html
- Terraform Registry: `aws_route53_record` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform Registry: `aws_wafv2_ip_set` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_ip_set

## Issues Found
- The AWS CLI update example wrote the full `get-distribution-config` response to disk, but `update-distribution` expects the `DistributionConfig` object, with `ETag` passed separately. I changed the command to query only `DistributionConfig` and updated the subsequent file reference so the example matches the documented workflow.
- The introduction incorrectly implied that Route 53 alias records for CloudFront automatically provide AAAA behavior. I corrected this to state that for custom domains you should create both A and AAAA alias records when enabling IPv6.
- The verification example checked for `CF-Ray`, which is a Cloudflare header, not a CloudFront header. I replaced that with a check for CloudFront headers such as `X-Cache`, `Via`, and `Server`.
- The final `curl -w` example labeled the output as `Protocol` even though `%{remote_ip}` returns the remote IP address. I corrected the label to `Remote IP`.
- The conclusion overstated the DNS step by mentioning only AAAA alias records. I corrected it to say that Route 53 setups with alternate domain names should use both A and AAAA alias records.

## Review Notes
- AWS documents an important caveat not covered in the post: if a CloudFront distribution uses signed URLs or signed cookies with a custom policy that restricts the `IpAddress`, AWS recommends not enabling IPv6 for that distribution.
- The WAF Terraform snippet is accurate for `scope = "CLOUDFRONT"`, but the underlying AWS provider used for those resources must target `us-east-1`.
