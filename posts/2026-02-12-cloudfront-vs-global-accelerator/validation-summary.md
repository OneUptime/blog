# Validation Summary: How to Compare CloudFront vs Global Accelerator

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon CloudFront
- AWS Global Accelerator
- AWS CLI
- AWS WAF
- AWS Shield
- CDN caching
- TCP/UDP routing
- TLS termination

## Sources Consulted
- Amazon CloudFront product page: https://aws.amazon.com/cloudfront/
- Amazon CloudFront pricing: https://aws.amazon.com/cloudfront/pricing/
- Amazon CloudFront Anycast static IP documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/request-static-ips.html
- Amazon CloudFront gRPC documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-using-grpc.html
- Amazon CloudFront origin failover documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html
- AWS CLI create-distribution command reference: https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/cloudfront/create-distribution.html
- AWS Global Accelerator developer guide: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- AWS Global Accelerator features: https://aws.amazon.com/global-accelerator/features/
- AWS Global Accelerator pricing: https://aws.amazon.com/global-accelerator/pricing/
- AWS CLI Global Accelerator command reference: https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/

## Issues Found
- Updated CloudFront edge location wording from "400+ edge locations" to "750+ CloudFront POPs" to match current AWS CloudFront product documentation.
- Updated the CloudFront protocol row to include gRPC over HTTP/2, which CloudFront now supports.
- Corrected the static IP comparison. CloudFront now supports optional Anycast static IP lists, while Global Accelerator provides two IPv4 anycast IPs or four IPs for dual-stack accelerators.
- Corrected TLS/TCP wording for Global Accelerator. Global Accelerator does not terminate TLS, but it does terminate TCP at the edge and creates a second optimized TCP connection to the endpoint.
- Expanded CloudFront origin types to include VPC origins.
- Fixed the CloudFront AWS CLI example by adding required distribution configuration fields such as CallerReference, Comment, Enabled, ViewerCertificate, AllowedMethods, and empty quantity objects where required.
- Updated Global Accelerator static IP wording to avoid saying the IPs "never change"; AWS documents that they remain assigned for as long as the accelerator exists.
- Replaced the broad "20-60% reduction in latency" claim with AWS's documented "up to 60%" network performance improvement claim.
- Updated CloudFront and Global Accelerator pricing notes for current flat-rate/free-plan details, current Global Accelerator DT-Premium ranges, and public IPv4 address charges.

## Review Notes
The latency table remains an illustrative example rather than a reproducible benchmark. Actual results vary by user network, AWS Region, endpoint type, cache policy, and whether requests are cache hits or misses.
