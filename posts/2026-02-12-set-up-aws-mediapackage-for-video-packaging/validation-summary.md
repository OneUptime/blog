# Validation Summary: How to Set Up AWS MediaPackage for Video Packaging

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Elemental MediaPackage v1 live channels and origin endpoints
- AWS Elemental MediaPackage VOD packaging groups, packaging configurations, and assets
- AWS CLI
- HLS, DASH, CMAF, Microsoft Smooth Streaming
- SPEKE DRM configuration for FairPlay and Widevine
- Amazon CloudFront
- AWS Secrets Manager
- Amazon CloudWatch metrics and alarms
- AWS CloudFormation

## Sources Consulted
- AWS CLI v2 Command Reference: `aws mediapackage create-channel` - https://docs.aws.amazon.com/cli/latest/reference/mediapackage/create-channel.html
- AWS CLI v2 Command Reference: `aws mediapackage create-origin-endpoint` - https://docs.aws.amazon.com/cli/latest/reference/mediapackage/create-origin-endpoint.html
- AWS CLI v2 Command Reference: `aws mediapackage update-origin-endpoint` - https://docs.aws.amazon.com/cli/latest/reference/mediapackage/update-origin-endpoint.html
- AWS CLI v2 Command Reference: `aws mediapackage-vod create-packaging-configuration` - https://docs.aws.amazon.com/cli/latest/reference/mediapackage-vod/create-packaging-configuration.html
- AWS CLI v2 Command Reference: `aws mediapackage-vod create-asset` - https://docs.aws.amazon.com/cli/latest/reference/mediapackage-vod/create-asset.html
- AWS Elemental MediaPackage v1 CDN authorization setup - https://docs.aws.amazon.com/mediapackage/latest/ug/cdn-auth-setup.html
- AWS Elemental MediaPackage v1 CloudWatch metrics - https://docs.aws.amazon.com/mediapackage/latest/ug/metrics.html
- AWS Elemental MediaPackage v1 CloudWatch monitoring - https://docs.aws.amazon.com/mediapackage/latest/ug/monitoring-cloudwatch.html
- AWS CloudFormation `AWS::CloudFront::Distribution OriginCustomHeader` reference - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudfront-distribution-origincustomheader.html
- AWS Elemental MediaPackage VOD supported input types - https://docs.aws.amazon.com/mediapackage/latest/ug/supported-inputs-vod.html

## Issues Found
- The CloudFront CDN authorization example used `!Ref CDNSecret` as the `X-MediaPackage-CDNIdentifier` header value. MediaPackage v1 CDN authorization requires a static header value in CloudFront and the same value stored in Secrets Manager under `MediaPackageCDNIdentifier`. Updated the CloudFormation snippet to accept a `CDNIdentifierValue` parameter, use it as the CloudFront header value, and store the same value in Secrets Manager.
- The CDN authorization CLI example referenced the old secret name from the invalid CloudFormation snippet. Updated the placeholder secret ARN to match the corrected `MediaPackage/cdn-auth-my-live-channel` secret name.
- The Monitoring section listed `4xxErrors` and `5xxErrors` metrics and used `5xxErrors` in the CloudWatch alarm. MediaPackage v1 exposes response-code counts through `EgressRequestCount` with the `StatusCodeRange` dimension. Updated the metric list and alarm command to use `EgressRequestCount` with `StatusCodeRange=5xx`.
- The CMAF endpoint text said the endpoint works with both HLS and DASH players. The v1 `cmaf-package` shape shown creates HLS manifests with CMAF/fMP4 segments, while DASH manifests are configured separately with `dash-package`. Updated the CMAF endpoint description and best-practice note accordingly.
- The feature list said MediaPackage inserts SCTE-35 ad markers. Updated this to say it passes through and exposes SCTE-35 ad markers, which more accurately describes MediaPackage manifest behavior.

## Review Notes
The examples use MediaPackage v1-style `mediapackage` and `mediapackage-vod` CLI commands. AWS also provides MediaPackage v2 for live workflows, but VOD workflows still use the v1 VOD resource model documented by AWS. The local workspace did not have the AWS CLI installed, so command shapes were validated against the official AWS CLI and service documentation rather than local `aws --help` output.
