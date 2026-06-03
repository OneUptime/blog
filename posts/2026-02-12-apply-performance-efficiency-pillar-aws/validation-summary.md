# Validation Summary: How to Apply the Performance Efficiency Pillar on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Well-Architected Framework Performance Efficiency pillar
- AWS Lambda
- AWS Graviton and Arm64
- Amazon EC2 and AWS Compute Optimizer
- Amazon EBS
- Amazon S3 Intelligent-Tiering
- Amazon DynamoDB and DynamoDB Accelerator (DAX)
- Amazon RDS/Aurora, ElastiCache, Neptune, and Timestream
- Amazon CloudFront
- Amazon VPC gateway endpoints
- Elastic Network Adapter (ENA)
- AWS X-Ray
- Amazon CloudWatch and Application Load Balancer metrics
- Terraform AWS Provider

## Sources Consulted
- AWS Well-Architected Framework: Performance efficiency: https://docs.aws.amazon.com/wellarchitected/latest/framework/performance-efficiency.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda SnapStart: https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- AWS Lambda Graviton2 announcement: https://aws.amazon.com/about-aws/whats-new/2021/09/better-price-performance-aws-lambda-functions-aws-graviton2-processor/
- AWS Compute Optimizer metrics: https://docs.aws.amazon.com/compute-optimizer/latest/ug/metrics.html
- Amazon S3 Intelligent-Tiering overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html
- DynamoDB Accelerator documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html
- Amazon CloudFront compression documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
- Amazon CloudFront cache policies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html
- Amazon VPC gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- Amazon EC2 enhanced networking: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html
- Elastic Load Balancing CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Terraform AWS Provider aws_lambda_function: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider aws_s3_bucket_intelligent_tiering_configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_intelligent_tiering_configuration
- Terraform AWS Provider aws_elasticache_replication_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider aws_xray_sampling_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/xray_sampling_rule

## Issues Found
- The Lambda example used `nodejs20.x`, which is deprecated as of April 30, 2026. Changed it to `nodejs22.x`, a supported Lambda runtime on the validation date.
- The Lambda Terraform example omitted required deployment and IAM role arguments. Added `role`, `filename`, and `source_code_hash` so the resource is structurally valid.
- The SnapStart comment said it was for Java functions only. Updated it to mention the currently supported managed runtime families: Java, Python, and .NET.
- The Compute Optimizer description omitted that AWS requires opt-in before analyzing resource and CloudWatch data. Added the opt-in caveat.
- The CloudFront `compress` comment implied that setting `compress = true` alone enables both gzip and Brotli. Updated the comment to note that gzip/Brotli support must also be enabled in the cache policy.
- The VPC endpoint section claimed gateway endpoints reduce latency. AWS documentation directly supports reliable private connectivity without an internet gateway or NAT gateway, and no additional gateway endpoint charge, so the wording was corrected.
- The CloudWatch alarm example was labeled as a custom metric, but `TargetResponseTime` in `AWS/ApplicationELB` is an AWS service metric. Updated the label.

## Review Notes
- The Terraform snippets are still partial examples and assume referenced resources such as IAM roles, security groups, subnet groups, load balancers, and certificates are defined elsewhere.
- For CloudFront, the ACM certificate used by a distribution must be in `us-east-1`; this is a common deployment caveat not shown in the snippet.
