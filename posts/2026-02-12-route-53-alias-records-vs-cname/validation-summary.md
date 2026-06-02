# Validation Summary: How to Use Route 53 Alias Records vs CNAME Records

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Route 53
- DNS CNAME records
- Route 53 Alias records
- AWS CLI
- Terraform AWS provider
- Elastic Load Balancing
- Amazon CloudFront
- Amazon S3 static website endpoints
- Amazon API Gateway
- VPC interface endpoints
- AWS Global Accelerator
- Elastic Beanstalk
- AWS App Runner
- AWS AppSync
- Amazon OpenSearch Service

## Sources Consulted
- Amazon Route 53 Developer Guide: Choosing between alias and non-alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Amazon Route 53 API Reference: AliasTarget - https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- Amazon Route 53 Developer Guide: Values specific for simple alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html
- Amazon Route 53 Developer Guide: Values specific for failover alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- Amazon Route 53 Developer Guide: Supported DNS record types - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- Amazon Route 53 pricing - https://aws.amazon.com/route53/pricing/
- Terraform AWS provider documentation: aws_route53_record - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS General Reference: Amazon S3 website endpoints and Route 53 hosted zone IDs - https://docs.aws.amazon.com/general/latest/gr/s3.html
- RFC 1034: Domain names - concepts and facilities - https://www.rfc-editor.org/rfc/rfc1034

## Issues Found
- The post recommended Alias records for "AWS resources" too broadly. Route 53 Alias records only support selected AWS targets, so wording was changed to "supported AWS resources" and "selected targets."
- The Route 53 pricing statement omitted the first-billion-query tier. It was updated to specify that $0.40 per million applies to the first billion standard queries per month.
- The supported Alias target list was incomplete. Added current documented targets: AWS App Runner services, AWS AppSync domain names, and Amazon OpenSearch Service custom domains.
- The record type comparison said Alias records are only A or AAAA. AWS allows aliases to another Route 53 record in the same hosted zone to use the matching record type, with documented exceptions, so the table was corrected.
- The hosted zone ID explanation said each AWS service has a regional hosted zone ID. This is not true for global services such as CloudFront, so the wording was corrected.
- The EvaluateTargetHealth section incorrectly said Route 53 checks CloudFront distribution status and oversimplified load balancer health behavior. It now states that CloudFront cannot use EvaluateTargetHealth, ALB/NLB health depends on target-group health, and highly available services such as S3, API Gateway, and VPC interface endpoints get no operational failover benefit from this setting.
- The failover statement implied EvaluateTargetHealth broadly replaces Route 53 health checks. It was narrowed to ALB/NLB aliases, where load balancer health checks can drive Route 53 failover decisions.

## Review Notes
The AWS CLI and Terraform examples use current field names and valid shapes. The example hosted zone IDs for CloudFront and the listed S3 website endpoint regions match current AWS documentation. The linked OneUptime post URL was treated as an internal cross-reference and appears plausible.
