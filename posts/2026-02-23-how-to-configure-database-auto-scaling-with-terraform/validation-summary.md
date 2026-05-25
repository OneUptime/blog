# Validation Summary: How to Configure Database Auto Scaling with Terraform

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon RDS
- Amazon Aurora PostgreSQL
- AWS Application Auto Scaling
- Aurora Serverless v2
- Amazon CloudWatch
- Amazon SNS

## Sources Consulted
- Amazon RDS storage autoscaling documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html
- HashiCorp AWS Provider aws_db_instance documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Amazon Aurora Auto Scaling documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.Add.html
- HashiCorp AWS Provider aws_appautoscaling_target documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- HashiCorp AWS Provider aws_appautoscaling_policy documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- HashiCorp AWS Provider aws_appautoscaling_scheduled_action documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_scheduled_action
- HashiCorp AWS Provider aws_rds_cluster documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Amazon Aurora Serverless v2 capacity documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- Amazon Aurora CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon Aurora CloudWatch dimensions documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html

## Issues Found
- The scheduled scaling examples described 8am and 8pm business-hours scaling but did not set a timezone. Application Auto Scaling evaluates cron expressions in UTC by default unless `timezone` is provided, so I added `timezone = "America/New_York"` to both scheduled actions.
- The replica-lag CloudWatch alarm used the instance-level `AuroraReplicaLag` metric with a cluster-level `DBClusterIdentifier` dimension. I changed it to `AuroraReplicaLagMaximum`, which is the cluster-level metric for the maximum lag between the writer and Aurora replicas.

## Review Notes
The Terraform resource types and core arguments are current and align with the AWS provider documentation. RDS storage autoscaling is correctly enabled with `max_allocated_storage`; Aurora reader autoscaling correctly uses Application Auto Scaling with `rds:cluster:ReadReplicaCount`; and Aurora Serverless v2 correctly uses `engine_mode = "provisioned"`, `serverlessv2_scaling_configuration`, and `db.serverless` instances. Future updates could mention that Aurora Serverless v2 capacity ranges now vary by engine version and platform, with newer versions supporting higher maximum ACUs and scale-to-zero.
