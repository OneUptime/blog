# Validation Summary: How to Build a Multi-Region Active-Passive Setup with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Provider (multi-region with provider aliases)
- AWS Route53 (health checks, failover routing policy, alias records)
- AWS RDS (cross-region read replica, multi-AZ)
- AWS S3 (cross-region replication)
- AWS ECS (Fargate launch type, warm standby service)
- AWS ELB / ALB (load balancer references)
- AWS CLI (ecs update-service, rds promote-read-replica)

## Sources Consulted
- HashiCorp Terraform AWS provider docs for `aws_route53_health_check` and `aws_route53_record` (failover_routing_policy)
- HashiCorp Terraform AWS provider docs for `aws_db_instance` — confirmed `replicate_source_db` should be the ARN for cross-region replicas (https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown)
- HashiCorp Terraform AWS provider docs for `aws_s3_bucket_replication_configuration` (https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_replication_configuration.html.markdown)
- HashiCorp Terraform AWS provider docs for `aws_ecs_service`
- AWS CLI Command Reference for `aws ecs update-service` and `aws rds promote-read-replica`

## Issues Found
No technical issues found.

The HCL examples are syntactically correct and use current (non-deprecated) resource arguments:
- Provider aliases (`alias = "primary"` / `"secondary"`) and `provider = aws.primary` references are correct usage.
- `aws_route53_health_check` arguments (`fqdn`, `port`, `type`, `resource_path`, `failure_threshold`, `request_interval`) are valid.
- `aws_route53_record` with `set_identifier`, `failover_routing_policy { type = "PRIMARY" / "SECONDARY" }`, and the `alias` block with `evaluate_target_health` is correct for Route53 DNS failover.
- `replicate_source_db = aws_db_instance.primary.arn` is the correct format for cross-region RDS read replicas (cross-region replicas require the ARN, not the identifier).
- `aws_s3_bucket_replication_configuration` with `role`, `bucket`, and a `rule` block containing `id`, `status`, and `destination` is valid.
- `aws_ecs_service` arguments are correct.
- AWS CLI commands (`aws ecs update-service --cluster --service --desired-count --region`, `aws rds promote-read-replica --db-instance-identifier --region`) match official CLI documentation.

## Review Notes
- The S3 replication `rule` block omits a `filter` (or deprecated `prefix`) argument. The provider currently accepts this and defaults to a prefix-based rule, but adding `filter {}` (to match all objects) is the recommended V2 approach and avoids a deprecation warning. Not flagged as an error since the snippet uses an illustrative `# ...` placeholder for additional config.
- S3 cross-region replication requires versioning enabled on both source and destination buckets; the snippet doesn't show `aws_s3_bucket_versioning`, but this is a simplification rather than incorrect content.
- The secondary Route53 failover record has no `health_check_id` — this is valid (a SECONDARY record doesn't strictly require its own health check), though attaching one is a common best practice so that Route53 doesn't fail over to an unhealthy secondary.
- The runbook description ("automated failover steps") still requires automation glue (e.g., the Lambda mentioned in the Summary) to run the ECS scale-up and RDS promotion CLI calls; Route53 only handles DNS failover automatically. The post correctly states this in the Summary.
- `lifecycle { prevent_destroy = true, ignore_changes = [replicate_source_db] }` on the replica is a sensible pattern for surviving a manual promotion, since promoting a read replica clears the source DB association in AWS.
