# Validation Summary: How to Build a WordPress Site on AWS with High Availability

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon VPC
- Amazon EC2 and EC2 launch templates
- Amazon EC2 Auto Scaling
- Elastic Load Balancing Application Load Balancer
- Amazon RDS for MySQL Multi-AZ
- Amazon EFS
- Amazon ElastiCache for Redis OSS
- Amazon CloudFront
- WordPress and PHP configuration
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: `create-db-instance` - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Amazon RDS User Guide: Multi-AZ DB instance deployments - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon EFS User Guide: Mounting with the EFS mount helper and encryption in transit - https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-helper.html
- AWS CLI Command Reference: `create-replication-group` - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- Amazon ElastiCache User Guide: In-transit encryption - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- AWS CLI Command Reference: `create-launch-template` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS CLI Command Reference: Elastic Load Balancing v2 target groups and listeners - https://docs.aws.amazon.com/cli/latest/reference/elbv2/
- AWS CLI Command Reference: Auto Scaling groups and target tracking policies - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/
- AWS CLI Command Reference: `create-distribution` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- Amazon CloudFront Developer Guide: Managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- Amazon Linux 2023 Release Notes: RPM package list - https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- WordPress Developer Resources: Editing `wp-config.php` - https://developer.wordpress.org/advanced-administration/wordpress/wp-config/

## Issues Found
- The post described the deployment as "fully redundant" and said it eliminated every single point of failure. I changed this to "highly available" and clarified that the architecture addresses common single points of failure in a single-region deployment, because the design is not a multi-region disaster recovery architecture.
- The RDS Multi-AZ failover timing was stated as "within about 60 seconds." I changed it to "typically completing in 60-120 seconds," matching AWS guidance for Multi-AZ DB instance failovers.
- The ElastiCache section stated that users would get logged out when the load balancer routes them to another instance without shared session storage. I corrected this because WordPress authentication uses cookies; Redis-backed PHP sessions are only needed for plugins or custom code that use PHP sessions.
- The ElastiCache example enabled automatic failover but did not explicitly enable Multi-AZ on the replication group. I added `--multi-az-enabled` to match the intended highly available Redis OSS setup.
- The EC2 user data installed Redis session configuration without installing a Redis PHP extension and omitted `wget`, which the script uses. I added the Redis extension package and `wget`.
- The EFS mount used an unencrypted mount while the rest of the architecture emphasizes encrypted services. I updated the mount and `/etc/fstab` entry to use TLS with the EFS mount helper.
- The Redis session connection used `tcp://` even though the ElastiCache replication group enables in-transit encryption. I changed the PHP session save path to `tls://`.
- The CloudFront distribution JSON was not valid for the API shape because collection fields were missing `Quantity` values, `AllowedMethods` used a raw array instead of CloudFront's structured object, and the distribution was missing `CallerReference`. I corrected the JSON structure.
- The CloudFront section said to bypass both `/wp-admin/*` and `/wp-login.php`, but only `/wp-admin/*` was configured. I added a cache behavior for `/wp-login.php` using the managed CachingDisabled policy.

## Review Notes
- The commands remain illustrative and still use placeholder IDs, ARNs, AMI IDs, passwords, endpoints, and security groups that a reader must replace.
- The VPC example creates only subnets. A complete production deployment would also require route tables, an internet gateway, NAT or another package access strategy for private EC2 instances, security group rules, subnet groups for ElastiCache, IAM permissions, DNS, certificates, and WordPress object-cache plugin configuration.
- AWS pricing changes by region and usage pattern, so the cost section should be treated as an estimate rather than a quote.
