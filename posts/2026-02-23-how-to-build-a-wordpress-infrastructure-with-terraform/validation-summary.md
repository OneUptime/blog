# Validation Summary: How to Build a WordPress Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Terraform
- AWS VPC
- Amazon ECS Fargate
- Amazon Aurora MySQL / RDS
- Amazon EFS
- Amazon ElastiCache for Redis OSS
- AWS Secrets Manager
- Amazon CloudWatch Logs
- Application Load Balancer
- Amazon CloudFront
- WordPress Docker image
- WordPress Redis object caching

## Sources Consulted
- Terraform AWS VPC module documentation: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws
- Terraform AWS provider documentation for `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Amazon Aurora Serverless v2 creation documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.create.html
- Terraform AWS provider documentation for `aws_efs_file_system`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- Amazon EFS `CreateAccessPoint` API documentation: https://docs.aws.amazon.com/efs/latest/ug/API_CreateAccessPoint.html
- Terraform AWS provider documentation for `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Amazon ElastiCache in-transit encryption documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- Terraform AWS provider documentation for `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition.html
- Terraform AWS provider documentation for `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Amazon ECS load balancer API documentation: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LoadBalancer.html
- Amazon ECS Secrets Manager environment variable documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Docker Official Image documentation for WordPress: https://hub.docker.com/_/wordpress
- Redis Object Cache for WordPress configuration documentation: https://github.com/rhubarbgroup/redis-cache
- WordPress.org statement on WordPress powering more than 40% of the web: https://wordpress.org/news/2024/04/how-wordpress-is-creating-a-faster-web/

## Issues Found
- The ECS task used `wordpress:6.4-php8.2-fpm` while mapping container port 80. The official FPM image runs PHP-FPM, not Apache HTTP on port 80. Changed the image to `wordpress:php8.2-apache` so the container matches the ALB/ECS port mapping.
- The ElastiCache replication group enabled in-transit encryption, but the WordPress Redis configuration did not enable TLS for the Redis object-cache client. Added `define('WP_REDIS_SCHEME', 'tls');`.
- The Redis section implied Redis alone improves WordPress performance. WordPress needs a Redis object-cache plugin/drop-in to use Redis for persistent object caching. Updated the wording to state that Redis improves performance when paired with a WordPress object-cache plugin.
- The EFS access point comment described an uploads directory, but the example used `/wordpress` and mounted all of `wp-content`. Changed the access point path to `/wordpress/uploads` and the ECS mount point to `/var/www/html/wp-content/uploads` to match the stated shared media storage use case.

## Review Notes
- The Terraform snippets are partial and reference resources not shown in the post, including security groups, ALB/target group, ECS cluster, IAM roles, KMS key, Secrets Manager secret, and CloudWatch log group. Those omissions are acceptable for a focused blog snippet, but a complete deployment must include them.
- For an ECS service using `awsvpc` networking with an ALB/NLB, the target group must use target type `ip`; the target group resource is not shown in the post.
- The EFS task definition uses IAM authorization, so the ECS task role and EFS file system policy must allow the required EFS client actions in a complete implementation.
- Aurora Serverless v2 with `min_capacity = 0.5` can scale down to a low capacity but does not enable automatic pause to zero ACUs. The post's cost-efficiency claim is reasonable, but a future update could mention the version-dependent zero-ACU option explicitly.
