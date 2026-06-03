# Validation Summary: How to Set Up AWS Elemental MediaLive for Live Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Elemental MediaLive
- AWS Elemental MediaPackage
- Amazon CloudFront
- Amazon CloudWatch
- AWS IAM
- AWS CLI
- RTMP
- HLS

## Sources Consulted
- AWS CLI Command Reference: MediaLive create-channel - https://docs.aws.amazon.com/cli/latest/reference/medialive/create-channel.html
- AWS CLI Command Reference: MediaLive create-input - https://docs.aws.amazon.com/cli/latest/reference/medialive/create-input.html
- AWS MediaLive User Guide: Creating an input security group - https://docs.aws.amazon.com/medialive/latest/ug/create-input-security-groups.html
- AWS MediaLive User Guide: Create an RTMP push input - https://docs.aws.amazon.com/medialive/latest/ug/setup-input-rtmp-push.html
- AWS MediaLive User Guide: Requirements for AWS Elemental MediaPackage - https://docs.aws.amazon.com/medialive/latest/ug/requirements-for-mediapackage.html
- AWS Elemental MediaPackage API Reference: Origin endpoints - https://docs.aws.amazon.com/mediapackage/latest/apireference/origin_endpoints.html
- Amazon CloudFront CLI Command Reference: create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- Amazon CloudFront Developer Guide: Managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS MediaLive User Guide: Input metrics - https://docs.aws.amazon.com/medialive/latest/ug/eml-metrics-input-metrics.html
- AWS MediaLive User Guide: Output metrics - https://docs.aws.amazon.com/medialive/latest/ug/eml-metrics-output-metrics.html
- AWS Elemental MediaLive pricing - https://aws.amazon.com/medialive/pricing/

## Issues Found
- The MediaLive channel JSON referenced `AudioSelectorName: "default"` but did not define a matching input audio selector. Added an `AudioSelectors` entry that selects audio track 1, matching the MediaLive channel schema.
- The IAM role section omitted the trust policy required for MediaLive to assume the role. Added a trust policy with `medialive.amazonaws.com` as the service principal.
- The IAM policy included `mediapackage:CreateChannel`, which is not needed by the MediaLive runtime role for this workflow. Replaced it with `mediapackage:DescribeOriginEndpoint` alongside `mediapackage:DescribeChannel`.
- The channel creation instructions used the role ARN before explaining that the role must exist. Added a short note to create the IAM role before running `aws medialive create-channel`.
- The CloudFront example used legacy `ForwardedValues`/TTL behavior. Replaced it with CloudFront's managed `Elemental-MediaPackage` cache policy ID for MediaPackage origins.
- The monitoring section listed "Output bitrate for each rendition," but the documented MediaLive output metrics include `ActiveOutputs` and `NetworkOut`, not a per-rendition output bitrate metric. Updated the list to use `Active outputs`.
- The CloudWatch alarm example lacked required metric dimensions and used a non-AWS-prefixed namespace. Added `ChannelId` and `Pipeline` dimensions, changed the namespace to `AWS/MediaLive`, and used the documented recommended statistic for `InputVideoFrameRate`.
- The cost section conflated channel class and reserved pricing. Updated the wording to distinguish channel class from on-demand versus reserved pricing.

## Review Notes
The post still uses AWS Elemental MediaPackage v1 CLI commands (`aws mediapackage`). Those commands remain documented, but new architectures may prefer MediaPackage v2 depending on region, feature, and security requirements. The pricing estimate is directionally plausible but should be treated as an example; MediaLive costs vary by region, channel class, input, outputs, codec, frame rate, and add-on features.
