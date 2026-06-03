# Validation Summary: How to Set Up Dual-Stack CloudFront Distributions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudFront
- Amazon Route 53
- AWS CloudFormation
- AWS CLI
- IPv4 and IPv6 networking
- CloudFront Functions JavaScript
- AWS published IP ranges
- CloudFront standard access logs
- AWS WAF IP sets

## Sources Consulted
- AWS CloudFront Developer Guide: Enable IPv6 for CloudFront distributions: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-enable-ipv6.html
- AWS CLI Command Reference: cloudfront create-distribution: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- AWS CLI Command Reference: cloudfront update-distribution: https://docs.aws.amazon.com/goto/aws-cli/cloudfront-2020-05-31/UpdateDistribution
- AWS CloudFormation Template Reference: AWS::CloudFront::Distribution DistributionConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-distributionconfig.html
- AWS CloudFormation Template Reference: AWS::CloudFront::Distribution DefaultCacheBehavior: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-defaultcachebehavior.html
- AWS CloudFormation Route 53 template snippets for CloudFront aliases: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-route53.html
- AWS Route 53 Developer Guide: alias record values: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias-common.html
- AWS CloudFront Developer Guide: CloudFront Functions event structure: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html
- AWS CloudFront Developer Guide: standard logging reference: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html
- AWS published IP ranges JSON: https://ip-ranges.amazonaws.com/ip-ranges.json
- Amazon CloudFront FAQ: https://aws.amazon.com/cloudfront/faqs/

## Issues Found
- The AWS CLI `create-distribution` example used CloudFormation-style arrays for `AllowedMethods` and `CachedMethods`. The CloudFront API/CLI expects `AllowedMethods` to be an object with `Quantity`, `Items`, and nested `CachedMethods`, so the JSON was corrected.
- The existing-distribution update example saved the full `get-distribution-config` response, which includes `ETag`, but `update-distribution --distribution-config` expects only the `DistributionConfig` object and the ETag passed separately through `--if-match`. The commands were changed to extract the ETag and query only `DistributionConfig`.
- The DNS guidance implied all custom-domain setups require Route 53 A and AAAA alias records. The wording was narrowed to Route 53 alias records, matching AWS guidance.
- The security group section filtered AWS IP ranges using `CLOUDFRONT`. For origin security groups, AWS publishes origin-facing ranges under `CLOUDFRONT_ORIGIN_FACING`; the command and text were corrected.
- The origin connectivity explanation said CloudFront typically connects to origins over IPv4 and only said to configure IPv6 origins "appropriately." AWS now documents configurable IPv4-only, IPv6-only, and dual-stack origin connectivity for custom origins, with IPv4-only as the default. The text was updated to reflect that.
- The final recommendation claimed there is no downside to enabling dual-stack on every distribution. AWS documents an exception for signed URLs or signed cookies that use a custom policy with `IpAddress`; the recommendation now includes that caveat.

## Review Notes
- The CloudFormation example still uses Origin Access Identity for S3. It is valid, but AWS generally recommends Origin Access Control for newer S3-backed CloudFront distributions.
- The CloudFormation template accepts a certificate ARN as a parameter. For CloudFront alternate domain names, the ACM certificate must be in US East (N. Virginia), which readers should account for when supplying the parameter.
