# Validation Summary: How to Set Up Active-Active Deployments with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Amazon Route 53 latency-based routing
- AWS Global Accelerator
- Amazon DynamoDB Global Tables
- Amazon ElastiCache Global Datastore
- Application Load Balancer (ALB)

## Sources Consulted
- AWS Route 53 latency alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-latency-alias.html
- AWS Global Accelerator overview: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- AWS Global Accelerator client IP preservation: https://docs.aws.amazon.com/global-accelerator/latest/dg/preserve-client-ip-address.html
- DynamoDB global tables behavior: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
- DynamoDB Streams: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- ElastiCache Global Datastore: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Redis-Global-Datastore.html
- AWS provider `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_globalaccelerator_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_listener
- AWS provider `aws_globalaccelerator_endpoint_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_endpoint_group
- AWS provider `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS provider `aws_elasticache_global_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_global_replication_group
- AWS provider `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group

## Issues Found
- The Route 53 example combined standalone HTTPS health checks against ALB DNS names with `evaluate_target_health = true`. I removed the extra `aws_route53_health_check` example and relied on ALB target health, which is the documented pattern for alias records pointing at load balancers.
- The overview and summary said latency routing sends users to the "nearest region". I changed that to the lowest-latency or best-latency region, which matches Route 53 latency-based routing behavior.
- The Global Accelerator example defined only one endpoint group while describing multi-Region traffic distribution, and it labeled `traffic_dial_percentage = 33.33` as equal distribution. I changed the example to create one endpoint group per region and keep each region active with a 100% traffic dial.
- The DynamoDB section implied custom conflict resolution was a built-in Global Tables feature. I clarified that the shown configuration uses the default multi-Region eventual consistency model with last-writer-wins, and that application-specific reconciliation must be implemented outside the table.
- The ElastiCache section described Global Datastore as cross-region cache invalidation with every region joining as an equal member. I corrected it to a primary-plus-read-only-secondary example, because Global Datastore is single-writer replication rather than active-active cache writes.

## Review Notes
- The DynamoDB example is valid for Global Tables V2 using the default multi-Region eventual consistency mode. A true multi-Region strong consistency example would require different replica configuration and additional caveats.
- Route 53 latency routing and Global Accelerator are both valid in multi-Region architectures, but they solve different entry-point problems: Route 53 is DNS-based, while Global Accelerator provides static anycast IPs and traffic management on the AWS backbone.
- ElastiCache Global Datastore is useful for low-latency cross-region reads and disaster recovery, but it is not a write-anywhere cache layer.
