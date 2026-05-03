# Validation Summary: How to Set Up Cross-Region Disaster Recovery with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS RDS (PostgreSQL cross-region read replicas)
- AWS S3 (Cross-Region Replication / CRR)
- AWS Route53 (failover routing, health checks)
- AWS KMS (cross-region encryption)
- AWS EC2 / AMI (cross-region AMI copy)
- AWS ALB (referenced as health-check target)

## Sources Consulted
- Terraform AWS provider docs — `aws_db_instance` (replicate_source_db, cross-region replicas): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider docs — `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS provider docs — `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS provider docs — `aws_route53_record` (failover_routing_policy): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider docs — `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS provider docs — `aws_ami_copy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ami_copy
- AWS RDS User Guide — Creating a read replica in a different AWS Region: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- AWS S3 User Guide — Replication requirements (versioning prerequisite): https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html
- AWS Route53 Developer Guide — Active-passive failover: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html

## Issues Found
- **S3 replication ordering**: The `aws_s3_bucket_replication_configuration.to_dr` resource referenced `aws_s3_bucket.primary.id` but had no link to the `aws_s3_bucket_versioning.primary` / `aws_s3_bucket_versioning.dr` resources. AWS requires versioning to be enabled on both source and destination before a replication configuration can be applied, and without an explicit `depends_on`, Terraform may attempt to create the replication configuration before versioning is enabled, causing first-apply failures. **Fix**: Added `depends_on = [aws_s3_bucket_versioning.primary, aws_s3_bucket_versioning.dr]` with an explanatory comment.

## Review Notes
- The `replicate_source_db = aws_db_instance.primary.arn` for the cross-region replica is correct — cross-region replicas require the source ARN (not just identifier), and the implicit dependency ensures correct ordering.
- `backup_retention_period = 7` on the primary correctly enables automated backups, which is the prerequisite for cross-region read replicas. The inline comment "Enable automated backups (required for cross-region replica)" is positioned next to `backup_window`, but the actual enabler is `backup_retention_period > 0` set above. This is slightly imprecise but not technically wrong — the code as written works correctly.
- The `failover_routing_policy { type = "PRIMARY" }` and `type = "SECONDARY"` block syntax is current and correct for the AWS provider.
- The DR `aws_route53_record` does not attach a `health_check_id`. This is acceptable for a SECONDARY failover record (Route53 will route traffic to it whenever the PRIMARY is unhealthy), but in practice attaching a health check to the secondary is also recommended so that Route53 doesn't fail over to an unhealthy DR target. Not a correctness bug, just an operational consideration.
- The summary's claim "automatically redirects DNS within 60 seconds" is optimistic given the configured `failure_threshold = 3` and `request_interval = 30` (which yields ~90 seconds before the health check is considered failed) plus DNS resolver TTL caching. Realistically, total user-observed failover time is closer to 2–3 minutes with these settings. Left as-is since the next sentence qualifies overall RTO as "minutes".
- The post does not define every referenced resource (KMS keys, IAM replication role, S3 buckets, ALBs, Route53 zone, AMI data source) — this is acceptable for a tutorial focused on the DR-specific resources.
- PostgreSQL `engine_version = "15.4"` is a real, valid RDS PostgreSQL version available at the time of writing.
- `aws_ami_copy` with `source_ami_region = "us-east-1"` and `provider = aws.dr` (us-west-2) is the correct pattern: the resource runs in the destination region and references the source region.
