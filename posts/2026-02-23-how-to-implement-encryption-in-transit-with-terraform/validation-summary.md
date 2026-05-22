# Validation Summary: How to Implement Encryption in Transit with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Elastic Load Balancing Application Load Balancer
- Amazon S3 bucket policies
- Amazon RDS for PostgreSQL and MySQL
- Amazon ElastiCache for Redis
- Amazon CloudFront
- Amazon API Gateway
- Amazon OpenSearch Service
- AWS Organizations Service Control Policies

## Sources Consulted
- Terraform AWS provider documentation for `aws_acm_certificate_validation`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/acm_certificate_validation.html.markdown
- Terraform AWS provider documentation for `aws_lb_listener`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener.html.markdown
- Terraform AWS provider documentation for `aws_s3_bucket_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_policy.html.markdown
- Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudfront_distribution.html.markdown
- Terraform AWS provider documentation for `aws_cloudfront_cache_policy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/cloudfront_cache_policy.html.markdown
- Terraform AWS provider documentation for `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider documentation for `aws_api_gateway_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_domain_name
- Terraform AWS provider documentation for `aws_opensearch_domain`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform AWS provider documentation for `aws_organizations_policy_attachment`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/organizations_policy_attachment.html.markdown
- Amazon S3 documentation for encryption in transit and TLS condition keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryptionInTransit.html
- Amazon S3 bucket policy condition key documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Amazon RDS for PostgreSQL SSL/TLS documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- Amazon RDS for MySQL SSL/TLS enforcement documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-ssl-connections.require-ssl.html
- Amazon CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Amazon CloudFront managed cache policies documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Amazon API Gateway TLS security policy documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-custom-domain-tls-version.html
- Amazon OpenSearch Service domain endpoint options API reference: https://docs.aws.amazon.com/opensearch-service/latest/APIReference/API_DomainEndpointOptions.html
- AWS Organizations policy attachment documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_policies_attach.html

## Issues Found
- The ALB TLS explanation said `ELBSecurityPolicy-TLS13-1-2-2021-06` requires TLS 1.3 with fallback to TLS 1.2. That is inaccurate because the policy allows TLS 1.2 and TLS 1.3. Updated the wording to say it supports TLS 1.3 while requiring TLS 1.2 or newer.
- The S3 bucket policy used network-specific condition keys without excluding AWS service principals. AWS redacts keys such as `aws:SecureTransport` and `s3:TlsVersion` for some service-to-service requests, so deny policies should avoid unintentionally blocking AWS services. Added `aws:PrincipalIsAWSService = false` to the relevant deny conditions.
- The CloudFront example used `forwarded_values`, which is deprecated in the Terraform AWS provider. Replaced it with the `aws_cloudfront_cache_policy` data source and the AWS-managed `Managed-CachingOptimized` cache policy.
- The CloudFront example referenced the general ACM certificate. CloudFront viewer certificates from ACM must be requested or imported in `us-east-1`. Updated the example to reference a CloudFront-specific validated ACM certificate and added a comment about the region requirement.
- The AWS Organizations SCP example created a policy but did not attach it to a root, OU, or account, so it would not enforce anything by itself. Added an `aws_organizations_policy_attachment` example targeting the organization root.

## Review Notes
- The RDS PostgreSQL example is technically valid. For PostgreSQL 15 and later, AWS documents `rds.force_ssl` as on by default, but keeping the explicit custom parameter group is still a valid enforcement pattern.
- Terraform CLI was not installed in the review environment, so local `terraform fmt` or `terraform validate` could not be run. The snippets were reviewed manually against current Terraform AWS provider documentation.
