# Validation Summary: How to Build Network Cost Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Cost Explorer and Billing
- AWS VPC Endpoints and PrivateLink
- AWS NAT Gateway
- AWS CloudFront and CloudWatch metrics
- AWS Global Accelerator
- AWS Budgets
- Kubernetes topology-aware routing
- Terraform AWS provider
- NGINX gzip and Brotli compression
- Node.js Express compression and zlib
- Varnish Cache VCL
- GCP BigQuery billing export
- PostgreSQL with psycopg2

## Sources Consulted
- AWS Cost Explorer GetCostAndUsage API: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- AWS Cost Explorer GetDimensionValues API: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetDimensionValues.html
- AWS CLI Cost Explorer get-cost-and-usage reference: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- AWS VPC gateway endpoints documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS S3 VPC endpoint strategy and pricing notes: https://aws.amazon.com/blogs/architecture/choosing-your-vpc-endpoint-strategy-for-amazon-s3/
- AWS CloudFront CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/programming-cloudwatch-metrics.html
- AWS CloudWatch billing alarm documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- AWS CloudFront Origin Shield documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html
- Terraform AWS provider aws_budgets_budget documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider aws_cloudfront_cache_policy documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy
- Terraform AWS provider aws_globalaccelerator_endpoint_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_endpoint_group
- Node.js zlib documentation: https://nodejs.org/api/zlib.html
- Varnish VCL reference: https://varnish-cache.readthedocs.io/reference/vcl.html

## Issues Found
- The Node.js internal compression example used callback-style `stream.pipeline()` with no callback or writable destination, so it would not work as written. Changed the example to gzip a JSON request body with `zlib.gzipSync()` and send it with `Content-Encoding: gzip`.
- The Varnish example used `std.duration()` without importing the `std` VMOD. Added `import std;`.
- The Varnish example cached authenticated API responses without varying the cache key by `Authorization`, which could serve one user's cached response to another user. Added a `vcl_hash` block that includes the `Authorization` header in the hash when present.
- The VPC endpoint cost diagram labeled the S3 endpoint path as a generic paid VPC endpoint. S3 gateway endpoints have no additional endpoint hourly or data processing charge, so the diagram now identifies it as an S3 Gateway Endpoint.
- The ECR interface endpoint savings example did not make clear that interface endpoint hourly charges are per Availability Zone and can offset savings at low volume. Updated the wording to distinguish data processing savings from endpoint hourly charges.
- The CloudFront monitoring command described `OriginLatency` `SampleCount` as origin request count. AWS documents `OriginLatency` as a percentile metric, not a request-count metric. Changed the command to query the `Requests` metric with `Sum` and describe using it with cache hit rate to estimate origin requests.
- The CloudFront monitoring section queried `CacheHitRate` without noting that CloudFront additional metrics must be enabled first. Added that prerequisite.
- The automated cost analysis script filtered by exact `USAGE_TYPE` values such as `DataTransfer-Out-Bytes`, which can miss region-qualified usage type names. Changed it to group by `USAGE_TYPE` and filter network-related usage type substrings in code.
- The CloudWatch billing alarm comment and description said "daily network costs", but AWS `EstimatedCharges` is a month-to-date estimated billing metric, and the shown dimensions track EC2 service charges rather than network-only spend. Updated the wording to "month-to-date estimated EC2 charges".
- The CloudWatch billing alarm example did not mention that AWS billing metrics are stored in US East (N. Virginia). Added a provider-region caveat before the Terraform resource.

## Review Notes
- The provider pricing table uses broad ranges. Those values are region-, tier-, direction-, service-, and date-dependent, so they should be treated as illustrative rather than quoted prices.
- The AWS billing alarm also requires billing alerts to be enabled before CloudWatch receives estimated charge metrics.
