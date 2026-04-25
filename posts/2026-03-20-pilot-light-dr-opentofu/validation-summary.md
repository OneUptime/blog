# Validation Summary: How to Implement Pilot Light DR Strategy with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS RDS
- AWS EC2 AMIs
- AWS Launch Templates
- AWS Auto Scaling
- AWS Application Load Balancer
- Pilot Light disaster recovery on AWS

## Sources Consulted
- OpenTofu conditional expressions: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu types and `null`: https://opentofu.org/docs/language/expressions/types/
- OpenTofu `apply` command and `-var`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_db_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_ami_copy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ami_copy.html.markdown
- AWS provider `aws_launch_template` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- AWS provider `aws_autoscaling_group` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- Amazon RDS read replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- Promoting a read replica: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
- AWS CLI `promote-read-replica`: https://docs.aws.amazon.com/cli/latest/reference/rds/promote-read-replica.html
- Elastic Load Balancing pricing: https://aws.amazon.com/elasticloadbalancing/pricing/
- AWS Architecture Blog, pilot light DR: https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws-part-iii-pilot-light-and-warm-standby/
- AWS Architecture Blog, pilot light with reserved capacity: https://aws.amazon.com/blogs/architecture/pilot-light-with-reserved-capacity-how-to-optimize-dr-cost-using-on-demand-capacity-reservations/

## Issues Found
- The post used a `null_resource` plus `aws rds promote-read-replica` to promote the DR database. The AWS provider documentation states that removing `replicate_source_db` from an existing `aws_db_instance` promotes the replica to a standalone instance, so I changed the example to use provider-managed promotion instead of an out-of-band CLI call that would introduce state drift.
- The database snippet disabled automated backups even though AWS recommends enabling backups before promoting a read replica. I changed the example to keep backups disabled in steady state but enable a minimal backup retention period during promotion.
- The ALB comment described the DR endpoint as "zero-cost," which is incorrect. AWS charges for each hour an Application Load Balancer runs and for LCUs, so I corrected the comment.
- The overview implied AMIs are "running" in the DR Region. AMIs are stored images, not running components, so I corrected the wording to describe them as pre-built and ready for failover.
- The summary claimed a single `tofu apply -var="dr_mode=true"` handled failover and asserted fixed recovery targets including "near-zero RPO." I updated this to use the documented failover variable, noted that RDS read replicas are asynchronous, and qualified RTO/RPO as dependent on replica lag, promotion time, and application startup time.

## Review Notes
- The post assumes a non-Aurora Amazon RDS DB instance. The reviewed promotion flow does not apply to Aurora DB clusters.
- The example still assumes supporting resources such as `aws_db_instance.primary`, `aws_lb_target_group.dr`, IAM profiles, and VPC modules already exist elsewhere in the OpenTofu configuration.
